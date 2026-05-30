const { getPrisma } = require('@libs/database');
const { NotFoundError } = require('@libs/errors');
const { processProperties } = require('./userProfile.utils');

const userProfileService = {};

userProfileService.identify = async (projectId, data) => {
    const prisma = getPrisma();
    const processedProperties = processProperties(data.properties);
    const externalId = data.user_id || data.userId;

    const existingProfile = await prisma.userProfile.findUnique({
        where: {
            projectId_externalId: { projectId, externalId }
        }
    });

    if (existingProfile) {
        const currentProps = existingProfile.properties || {};
        const mergedProperties = { ...currentProps, ...processedProperties };

        return prisma.userProfile.update({
            where: { id: existingProfile.id },
            data: {
                properties: mergedProperties,
                lastSeenAt: new Date()
            }
        });
    }

    return prisma.userProfile.create({
        data: {
            projectId,
            externalId,
            properties: processedProperties
        }
    });
};

userProfileService.findById = async (profileId, projectId = null) => {
    const prisma = getPrisma();

    const where = { id: profileId };
    if (projectId) {
        where.projectId = projectId;
    }

    const profile = await prisma.userProfile.findFirst({ where });

    if (!profile) {
        throw new NotFoundError('User profile not found');
    }

    return profile;
};

userProfileService.findByUserId = async (userId, projectId) => {
    const prisma = getPrisma();

    const profile = await prisma.userProfile.findUnique({
        where: {
            projectId_externalId: { projectId, externalId: userId }
        }
    });

    if (!profile) {
        throw new NotFoundError('User profile not found');
    }

    return profile;
};

userProfileService.list = async (projectId, options = {}) => {
    const prisma = getPrisma();
    const {
        page = 1,
        limit = 50,
        search,
        sortBy = 'lastSeenAt',
        sortOrder = 'desc',
        propertyFilters
    } = options;
    const skip = (page - 1) * limit;

    const where = { projectId };

    if (search) {
        where.externalId = { contains: search, mode: 'insensitive' };
    }

    // Property filtering - supports JSON format: {"key":"value","key2":"value2"}
    if (propertyFilters) {
        try {
            const filters = typeof propertyFilters === 'string' ? JSON.parse(propertyFilters) : propertyFilters;
            const propertyConditions = [];

            for (const [key, value] of Object.entries(filters)) {
                if (value === '' || value === null) {
                    // Key exists with any value
                    propertyConditions.push({
                        properties: { path: [key], not: 'null' }
                    });
                } else {
                    // Key equals specific value
                    propertyConditions.push({
                        properties: { path: [key], equals: value }
                    });
                }
            }

            if (propertyConditions.length > 0) {
                where.AND = propertyConditions;
            }
        } catch (e) {
            // Invalid propertyFilters format, ignore
        }
    }

    // Sorting
    const validSortFields = ['lastSeenAt', 'firstSeenAt', 'eventsCount', 'externalId'];
    const orderByField = validSortFields.includes(sortBy) ? sortBy : 'lastSeenAt';
    const orderByDirection = sortOrder === 'asc' ? 'asc' : 'desc';

    const [profiles, total] = await Promise.all([
        prisma.userProfile.findMany({
            where,
            orderBy: { [orderByField]: orderByDirection },
            skip,
            take: limit
        }),
        prisma.userProfile.count({ where })
    ]);

    return {
        profiles,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
        }
    };
};

userProfileService.incrementEventsCount = async (projectId, userId) => {
    const prisma = getPrisma();
    if (!userId) return;

    await prisma.userProfile.upsert({
        where: {
            projectId_externalId: { projectId, externalId: userId }
        },
        update: {
            eventsCount: { increment: 1 },
            lastSeenAt: new Date()
        },
        create: {
            projectId,
            externalId: userId,
            eventsCount: 1,
            properties: {}
        }
    });
};

userProfileService.delete = async (profileId, projectId) => {
    const prisma = getPrisma();

    const profile = await prisma.userProfile.findFirst({
        where: { id: profileId, projectId }
    });

    if (!profile) {
        throw new NotFoundError('User profile not found');
    }

    await prisma.userProfile.delete({
        where: { id: profileId }
    });

    return profile;
};

userProfileService.getActivity = async (profileId, projectId, options = {}) => {
    const prisma = getPrisma();

    // First get the profile to get the externalId
    const profile = await prisma.userProfile.findFirst({
        where: { id: profileId, projectId }
    });

    if (!profile) {
        throw new NotFoundError('User profile not found');
    }

    const { days = 7 } = options;
    const end = new Date();
    const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);

    // Group by day directly in the database instead of fetching all events
    const counts = await prisma.$queryRaw`
        SELECT DATE_TRUNC('day', "timestamp")::date as day, COUNT(*)::int as count
        FROM "Event"
        WHERE "projectId" = ${projectId}
          AND "userId" = ${profile.externalId}
          AND "timestamp" >= ${start}
          AND "timestamp" <= ${end}
        GROUP BY day
        ORDER BY day ASC
    `;

    const countsByDay = new Map();
    for (const row of counts) {
        countsByDay.set(row.day.toISOString().split('T')[0], row.count);
    }

    const buckets = new Map();
    let current = new Date(start);
    current.setUTCHours(0, 0, 0, 0);

    while (current <= end) {
        const key = current.toISOString().split('T')[0];
        buckets.set(key, { date: key, count: countsByDay.get(key) || 0 });
        current = new Date(current.getTime() + 24 * 60 * 60 * 1000);
    }

    return {
        data: Array.from(buckets.values()),
        days,
        startDate: start.toISOString(),
        endDate: end.toISOString()
    };
};

userProfileService.getEvents = async (profileId, projectId, options = {}) => {
    const prisma = getPrisma();

    // First get the profile to get the externalId
    const profile = await prisma.userProfile.findFirst({
        where: { id: profileId, projectId }
    });

    if (!profile) {
        throw new NotFoundError('User profile not found');
    }

    const { limit = 10 } = options;

    const events = await prisma.event.findMany({
        where: {
            projectId,
            userId: profile.externalId
        },
        include: {
            channel: {
                select: { id: true, name: true, slug: true, color: true, icon: true }
            }
        },
        orderBy: { timestamp: 'desc' },
        take: limit
    });

    return { events };
};

userProfileService.getBreakdown = async (profileId, projectId, options = {}) => {
    const prisma = getPrisma();

    const profile = await prisma.userProfile.findFirst({
        where: { id: profileId, projectId },
    });

    if (!profile) {
        throw new NotFoundError('User profile not found');
    }

    const { days = 30, limit = 5 } = options;
    const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const baseWhere = {
        projectId,
        userId: profile.externalId,
        timestamp: { gte: start },
    };

    // Top channels by event count
    const channelGroups = await prisma.event.groupBy({
        by: ['channelId'],
        where: baseWhere,
        _count: { _all: true },
        orderBy: { _count: { id: 'desc' } },
        take: limit,
    });

    const channelIds = channelGroups.map((g) => g.channelId).filter(Boolean);
    const channels = channelIds.length
        ? await prisma.channel.findMany({
              where: { id: { in: channelIds } },
              select: { id: true, name: true, slug: true, color: true, icon: true },
          })
        : [];
    const channelMap = new Map(channels.map((c) => [c.id, c]));

    const topChannels = channelGroups
        .map((g) => ({
            channel: channelMap.get(g.channelId) || null,
            count: g._count._all,
        }))
        .filter((g) => g.channel);

    // Top event names
    const eventGroups = await prisma.event.groupBy({
        by: ['event'],
        where: baseWhere,
        _count: { _all: true },
        orderBy: { _count: { id: 'desc' } },
        take: limit,
    });

    const topEvents = eventGroups.map((g) => ({
        event: g.event,
        count: g._count._all,
    }));

    // Days active in the window
    const distinctDays = await prisma.$queryRaw`
        SELECT COUNT(DISTINCT DATE_TRUNC('day', "timestamp"))::int AS days
        FROM "Event"
        WHERE "projectId" = ${projectId}
          AND "userId" = ${profile.externalId}
          AND "timestamp" >= ${start}
    `;
    const daysActive = distinctDays[0]?.days || 0;

    const total = topChannels.reduce((s, c) => s + c.count, 0)
        || topEvents.reduce((s, e) => s + e.count, 0);

    return {
        topChannels,
        topEvents,
        daysActive,
        totalEventsInWindow: total,
        windowDays: days,
    };
};

module.exports = userProfileService;
