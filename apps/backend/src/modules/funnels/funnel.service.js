const { getPrisma } = require('@libs/database');
const { Prisma } = require('@prisma/client');
const { NotFoundError } = require('@libs/errors');

const funnelService = {};

funnelService.create = async (projectId, data) => {
    const prisma = getPrisma();

    return prisma.funnel.create({
        data: {
            name: data.name,
            description: data.description || '',
            steps: data.steps,
            timeWindow: data.timeWindow || 7,
            projectId
        }
    });
};

funnelService.findById = async (funnelId, projectId) => {
    const prisma = getPrisma();

    const funnel = await prisma.funnel.findFirst({
        where: { id: funnelId, projectId }
    });

    if (!funnel) {
        throw new NotFoundError('Funnel not found');
    }

    return funnel;
};

funnelService.list = async (projectId) => {
    const prisma = getPrisma();

    const funnels = await prisma.funnel.findMany({
        where: { projectId },
        orderBy: { createdAt: 'desc' }
    });

    return { funnels };
};

funnelService.update = async (funnelId, projectId, data) => {
    const prisma = getPrisma();

    const funnel = await prisma.funnel.findFirst({
        where: { id: funnelId, projectId }
    });

    if (!funnel) {
        throw new NotFoundError('Funnel not found');
    }

    return prisma.funnel.update({
        where: { id: funnelId },
        data: {
            name: data.name !== undefined ? data.name : funnel.name,
            description: data.description !== undefined ? data.description : funnel.description,
            steps: data.steps !== undefined ? data.steps : funnel.steps,
            timeWindow: data.timeWindow !== undefined ? data.timeWindow : funnel.timeWindow
        }
    });
};

funnelService.delete = async (funnelId, projectId) => {
    const prisma = getPrisma();

    const funnel = await prisma.funnel.findFirst({
        where: { id: funnelId, projectId }
    });

    if (!funnel) {
        throw new NotFoundError('Funnel not found');
    }

    await prisma.funnel.delete({
        where: { id: funnelId }
    });

    return funnel;
};

/**
 * Calculate funnel metrics for a given date range
 * Returns the count of users who completed each step in sequence
 *
 * Optimized for large datasets:
 * - Processes users in batches to limit memory usage
 * - Uses indexed lookups instead of Array.find() for O(1) matching
 */
funnelService.calculate = async (funnelId, projectId, options = {}) => {
    const prisma = getPrisma();
    const BATCH_SIZE = 500;

    const funnel = await funnelService.findById(funnelId, projectId);
    const steps = funnel.steps;

    if (!steps || steps.length === 0) {
        return { funnel, results: [] };
    }

    const { startDate, endDate } = options;
    const timeWindowMs = funnel.timeWindow * 24 * 60 * 60 * 1000;

    // Build date filter
    const dateFilter = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    const timestampWhere = Object.keys(dateFilter).length > 0 ? { timestamp: dateFilter } : {};

    // Get distinct userIds using raw query (avoids loading full rows)
    const distinctUsers = await prisma.$queryRaw`
        SELECT DISTINCT "userId"
        FROM "Event"
        WHERE "projectId" = ${projectId}
          AND "userId" IS NOT NULL
          ${startDate ? Prisma.sql`AND "timestamp" >= ${new Date(startDate)}` : Prisma.empty}
          ${endDate ? Prisma.sql`AND "timestamp" <= ${new Date(endDate)}` : Prisma.empty}
    `;

    const allUserIds = distinctUsers.map(u => u.userId);

    // Initialize results
    const results = steps.map((step, index) => ({
        step: index + 1,
        event: step.event,
        channel: step.channel || null,
        count: 0,
        conversionFromPrevious: 0,
        conversionFromFirst: 0
    }));

    // Track users who completed each step
    const usersAtStep = new Array(steps.length).fill(null).map(() => new Set());

    // Process users in batches
    for (let i = 0; i < allUserIds.length; i += BATCH_SIZE) {
        const batchUserIds = allUserIds.slice(i, i + BATCH_SIZE);

        // Only include channel join when a step actually filters by channel
        const needsChannel = steps.some(s => s.channel);

        // Fetch events only for this batch of users
        const events = await prisma.event.findMany({
            where: {
                projectId,
                userId: { in: batchUserIds },
                ...timestampWhere
            },
            select: {
                userId: true,
                event: true,
                ...(needsChannel && { channel: { select: { slug: true } } }),
                tags: true,
                timestamp: true
            },
            orderBy: { timestamp: 'asc' }
        });

        // Group events by userId and index by event name for O(1) lookups
        const eventsByUser = new Map();
        for (const event of events) {
            if (!eventsByUser.has(event.userId)) {
                eventsByUser.set(event.userId, { events: [], byEventName: new Map() });
            }
            const userData = eventsByUser.get(event.userId);
            userData.events.push(event);

            // Index by event name for faster step matching
            if (!userData.byEventName.has(event.event)) {
                userData.byEventName.set(event.event, []);
            }
            userData.byEventName.get(event.event).push(event);
        }

        // Process each user in the batch
        for (const [userId, userData] of eventsByUser) {
            let lastStepTime = null;
            let firstStepTime = null;

            for (let stepIndex = 0; stepIndex < steps.length; stepIndex++) {
                const step = steps[stepIndex];

                // Use indexed lookup - O(1) to get candidates by event name
                const candidates = userData.byEventName.get(step.event) || [];

                // Find matching event from candidates (much smaller array)
                const matchingEvent = candidates.find(event => {
                    // Must match channel if specified
                    if (step.channel && event.channel?.slug !== step.channel) return false;

                    // Must match tags if specified
                    if (step.tags) {
                        const eventTags = event.tags || {};
                        for (const [key, value] of Object.entries(step.tags)) {
                            if (String(eventTags[key]) !== String(value)) return false;
                        }
                    }

                    // Must happen after the previous step
                    if (lastStepTime && event.timestamp <= lastStepTime) return false;

                    // Must be within time window from step 1
                    if (stepIndex > 0 && firstStepTime) {
                        const timeSinceStart = event.timestamp - firstStepTime;
                        if (timeSinceStart > timeWindowMs) return false;
                    }

                    return true;
                });

                if (matchingEvent) {
                    usersAtStep[stepIndex].add(userId);
                    lastStepTime = matchingEvent.timestamp;
                    if (stepIndex === 0) firstStepTime = matchingEvent.timestamp;
                } else {
                    break;
                }
            }
        }
    }

    // Calculate counts and conversion rates
    for (let i = 0; i < steps.length; i++) {
        results[i].count = usersAtStep[i].size;

        if (i === 0) {
            results[i].conversionFromPrevious = 100;
            results[i].conversionFromFirst = 100;
        } else {
            const prevCount = usersAtStep[i - 1].size;
            const firstCount = usersAtStep[0].size;

            results[i].conversionFromPrevious = prevCount > 0
                ? Math.round((usersAtStep[i].size / prevCount) * 100)
                : 0;
            results[i].conversionFromFirst = firstCount > 0
                ? Math.round((usersAtStep[i].size / firstCount) * 100)
                : 0;
        }
    }

    return {
        funnel,
        results,
        totalUsers: usersAtStep[0]?.size || 0,
        completedUsers: usersAtStep[steps.length - 1]?.size || 0,
        overallConversion: usersAtStep[0]?.size > 0
            ? Math.round((usersAtStep[steps.length - 1]?.size / usersAtStep[0].size) * 100)
            : 0
    };
};

module.exports = funnelService;
