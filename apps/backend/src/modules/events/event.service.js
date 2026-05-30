const { getPrisma } = require('@libs/database');
const { NotFoundError } = require('@libs/errors');
const { emitToProject } = require('@libs/socket');
const channelService = require('@modules/channels/channel.service');

const {
    processTags,
    parseMultipleValues,
    buildDateFilter,
    buildTagConditions,
    MAX_PAGE_LIMIT,
    DEFAULT_PAGE_LIMIT
} = require('./event.utils');

const analytics = require('./event.analytics');

// ============================================
// Channel selection for includes
// ============================================

const CHANNEL_SELECT = {
    id: true,
    name: true,
    slug: true,
    color: true,
    icon: true
};

// ============================================
// Create Event
// ============================================

/**
 * Create a new event and optionally update user profile
 */
const create = async (projectId, data) => {
    const prisma = getPrisma();

    const channel = await channelService.findOrCreate(projectId, data.channel);
    const userId = data.user_id || data.userId || null;

    // Atomic transaction: create event + update user profile
    const event = await prisma.$transaction(async (tx) => {
        const newEvent = await tx.event.create({
            data: {
                projectId,
                channelId: channel.id,
                event: data.event,
                description: data.description || '',
                icon: data.icon || '',
                tags: processTags(data.tags),
                parser: data.parser === 'markdown' ? 'MARKDOWN' : 'TEXT',
                userId,
                timestamp: data.timestamp ? new Date(data.timestamp * 1000) : new Date(),
                metadata: data.metadata || {}
            },
            include: { channel: { select: CHANNEL_SELECT } }
        });

        if (userId) {
            await tx.userProfile.upsert({
                where: { projectId_externalId: { projectId, externalId: userId } },
                update: { eventsCount: { increment: 1 }, lastSeenAt: new Date() },
                create: { projectId, externalId: userId, eventsCount: 1 }
            });
        }

        return newEvent;
    });

    emitToProject(projectId, 'event:new', event);
    return event;
};

// ============================================
// Find Event by ID
// ============================================

/**
 * Find a single event by ID
 */
const findById = async (eventId, projectId = null) => {
    const prisma = getPrisma();

    const where = { id: eventId };
    if (projectId) where.projectId = projectId;

    const event = await prisma.event.findFirst({
        where,
        include: { channel: { select: CHANNEL_SELECT } }
    });

    if (!event) {
        throw new NotFoundError('Event not found');
    }

    return event;
};

// ============================================
// List Events
// ============================================

/**
 * List events with filtering, search, and pagination
 */
const list = async (projectId, options = {}) => {
    const prisma = getPrisma();

    const {
        page = 1,
        limit = DEFAULT_PAGE_LIMIT,
        channel,
        event,
        search,
        tags,
        userId,
        startDate,
        endDate
    } = options;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(parseInt(limit, 10) || DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where = { projectId };

    // Channel filter (supports multiple)
    const channelFilter = await buildChannelFilter(prisma, projectId, channel);
    if (channelFilter === null) {
        return emptyPaginatedResult(pageNum, limitNum);
    }
    if (channelFilter) where.channelId = channelFilter;

    // Event name filter
    if (event) {
        where.event = { contains: event, mode: 'insensitive' };
    }

    // Text search
    if (search) {
        where.OR = [
            { event: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } }
        ];
    }

    // Tag filter
    const tagConditions = buildTagConditions(tags);
    if (tagConditions.length > 0) {
        where.AND = tagConditions;
    }

    // User filter (supports multiple)
    const userFilter = buildUserFilter(userId);
    if (userFilter) where.userId = userFilter;

    // Date filter
    const dateFilter = buildDateFilter(startDate, endDate);
    if (dateFilter) where.timestamp = dateFilter;

    // Execute queries in parallel
    const [events, total] = await Promise.all([
        prisma.event.findMany({
            where,
            include: { channel: { select: CHANNEL_SELECT } },
            orderBy: { timestamp: 'desc' },
            skip,
            take: limitNum
        }),
        prisma.event.count({ where })
    ]);

    return {
        events,
        pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            pages: Math.ceil(total / limitNum)
        }
    };
};

// ============================================
// Delete Event
// ============================================

/**
 * Delete an event by ID
 */
const deleteEvent = async (eventId, projectId) => {
    const prisma = getPrisma();

    const deleted = await prisma.event.deleteMany({
        where: { id: eventId, projectId }
    });

    if (deleted.count === 0) {
        throw new NotFoundError('Event not found');
    }

    return { id: eventId };
};

// ============================================
// Helper Functions
// ============================================

/**
 * Build channel filter for where clause
 * Returns null if no valid channels found, undefined if no filter, or filter object
 */
async function buildChannelFilter(prisma, projectId, channel) {
    if (!channel) return undefined;

    const slugs = parseMultipleValues(channel);
    const channels = await prisma.channel.findMany({
        where: { projectId, slug: { in: slugs } },
        select: { id: true }
    });

    if (channels.length === 0) return null;
    if (channels.length === 1) return channels[0].id;
    return { in: channels.map(c => c.id) };
}

/**
 * Build user filter for where clause
 */
function buildUserFilter(userId) {
    if (!userId) return undefined;

    const userIds = parseMultipleValues(userId);
    if (userIds.length === 0) return undefined;
    if (userIds.length === 1) return userIds[0];
    return { in: userIds };
}

/**
 * Return empty paginated result
 */
function emptyPaginatedResult(page, limit) {
    return {
        events: [],
        pagination: { page, limit, total: 0, pages: 0 }
    };
}

// ============================================
// Export Service
// ============================================

module.exports = {
    // CRUD
    create,
    findById,
    list,
    delete: deleteEvent,

    // Analytics (re-exported from analytics module)
    getStats: analytics.getStats,
    getTimeline: analytics.getTimeline,
    getOnlineUsers: analytics.getOnlineUsers,
    getSuggestions: analytics.getSuggestions
};
