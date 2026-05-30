const { getPrisma } = require('@libs/database');
const { Prisma } = require('@prisma/client');
const {
    parseMultipleValues,
    buildDateFilter,
    validateInterval,
    calculateAutoInterval,
    generateEmptyBuckets,
    getBucketKey,
    TAG_KEY_REGEX
} = require('./event.utils');

// ============================================
// Event Statistics
// ============================================

/**
 * Get aggregated event statistics for a project
 */
const getStats = async (projectId, { startDate, endDate } = {}) => {
    const prisma = getPrisma();

    const where = { projectId };
    const dateFilter = buildDateFilter(startDate, endDate);
    if (dateFilter) where.timestamp = dateFilter;

    const [total, byChannel, topEvents] = await Promise.all([
        prisma.event.count({ where }),

        prisma.event.groupBy({
            by: ['channelId'],
            where,
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } },
            take: 10
        }),

        prisma.event.groupBy({
            by: ['event'],
            where,
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } },
            take: 10
        })
    ]);

    // Fetch channel details in a single query
    const channelIds = byChannel.map(e => e.channelId);
    const channels = await prisma.channel.findMany({
        where: { id: { in: channelIds } },
        select: { id: true, name: true, slug: true }
    });
    const channelMap = new Map(channels.map(c => [c.id, c]));

    return {
        total,
        byChannel: byChannel.map(e => ({
            channel: channelMap.get(e.channelId),
            count: e._count.id
        })),
        topEvents: topEvents.map(e => ({
            _id: e.event,
            count: e._count.id
        }))
    };
};

// ============================================
// Event Timeline
// ============================================

/**
 * Get event timeline data for charts
 * Uses Prisma.sql for safe query building
 */
const getTimeline = async (projectId, options = {}) => {
    const prisma = getPrisma();
    const {
        startDate,
        endDate,
        channel,
        userId,
        search,
        tags,
        granularity = 'auto'
    } = options;

    // Default to last 24 hours
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(end.getTime() - 24 * 60 * 60 * 1000);

    // Calculate and validate interval
    const interval = granularity === 'auto'
        ? calculateAutoInterval(start, end)
        : validateInterval(granularity);

    // Build SQL conditions using Prisma.sql for safety
    const filterResult = await buildTimelineFilters(
        prisma, projectId, start, end, { channel, userId, search, tags }
    );

    // Empty result if no valid channels found
    if (filterResult === null) {
        return {
            data: [],
            interval,
            startDate: start.toISOString(),
            endDate: end.toISOString()
        };
    }

    // Build the complete query with Prisma.sql
    const query = Prisma.sql`
        SELECT DATE_TRUNC(${interval}, "timestamp") as bucket, COUNT(*)::int as count
        FROM "Event"
        WHERE ${filterResult}
        GROUP BY bucket
        ORDER BY bucket ASC
    `;

    const results = await prisma.$queryRaw(query);

    // Fill buckets
    const buckets = generateEmptyBuckets(start, end, interval);
    for (const row of results) {
        const key = getBucketKey(row.bucket, interval);
        if (buckets.has(key)) {
            buckets.get(key).count = row.count;
        }
    }

    return {
        data: Array.from(buckets.values()),
        interval,
        startDate: start.toISOString(),
        endDate: end.toISOString()
    };
};

/**
 * Build SQL filter conditions using Prisma.sql
 * Returns null if no valid channels found, or Prisma.Sql object
 */
async function buildTimelineFilters(prisma, projectId, start, end, filters) {
    const conditions = [
        Prisma.sql`"projectId" = ${projectId}`,
        Prisma.sql`"timestamp" >= ${start}`,
        Prisma.sql`"timestamp" <= ${end}`
    ];

    const { channel, userId, search, tags } = filters;

    // Channel filter
    if (channel) {
        const channelSlugs = parseMultipleValues(channel);
        const channels = await prisma.channel.findMany({
            where: { projectId, slug: { in: channelSlugs } },
            select: { id: true }
        });
        const channelIds = channels.map(c => c.id);

        if (channelIds.length === 0) {
            return null;
        }

        if (channelIds.length === 1) {
            conditions.push(Prisma.sql`"channelId" = ${channelIds[0]}`);
        } else {
            conditions.push(Prisma.sql`"channelId" IN (${Prisma.join(channelIds)})`);
        }
    }

    // User filter
    if (userId) {
        const userIds = parseMultipleValues(userId);
        if (userIds.length === 1) {
            conditions.push(Prisma.sql`"userId" = ${userIds[0]}`);
        } else if (userIds.length > 1) {
            conditions.push(Prisma.sql`"userId" IN (${Prisma.join(userIds)})`);
        }
    }

    // Search filter
    if (search) {
        const searchPattern = `%${search}%`;
        conditions.push(Prisma.sql`("event" ILIKE ${searchPattern} OR "description" ILIKE ${searchPattern})`);
    }

    // Tags filter
    if (tags) {
        try {
            const tagFilters = typeof tags === 'string' ? JSON.parse(tags) : tags;
            for (const [key, value] of Object.entries(tagFilters)) {
                // Validate key to prevent injection
                if (!TAG_KEY_REGEX.test(key)) continue;

                if (value === '' || value === null) {
                    conditions.push(Prisma.sql`"tags" ? ${key}`);
                } else {
                    conditions.push(Prisma.sql`jsonb_extract_path_text("tags", ${key}) = ${String(value)}`);
                }
            }
        } catch {
            // Invalid tags format, skip
        }
    }

    // Join all conditions with AND
    return Prisma.join(conditions, ' AND ');
}

// ============================================
// Online Users
// ============================================

/**
 * Get count of unique users active in the last N minutes
 */
const getOnlineUsers = async (projectId, minutes = 30) => {
    const prisma = getPrisma();
    const since = new Date(Date.now() - minutes * 60 * 1000);

    const result = await prisma.$queryRaw`
        SELECT COUNT(DISTINCT "userId")::int as count
        FROM "Event"
        WHERE "projectId" = ${projectId}
          AND "userId" IS NOT NULL
          AND "timestamp" >= ${since}
    `;

    return {
        count: result[0]?.count || 0,
        minutes
    };
};

// ============================================
// Suggestions (Autocomplete)
// ============================================

/**
 * Get event name and channel suggestions for autocomplete
 */
const getSuggestions = async (projectId) => {
    const prisma = getPrisma();

    const [eventNames, channels] = await Promise.all([
        prisma.event.groupBy({
            by: ['event'],
            where: { projectId },
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } },
            take: 50
        }),

        prisma.channel.findMany({
            where: { projectId },
            select: { slug: true, name: true },
            orderBy: { name: 'asc' }
        })
    ]);

    return {
        events: eventNames.map(e => e.event),
        channels: channels.map(c => ({ slug: c.slug, name: c.name }))
    };
};

module.exports = {
    getStats,
    getTimeline,
    getOnlineUsers,
    getSuggestions
};
