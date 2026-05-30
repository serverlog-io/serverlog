const { getPrisma } = require('@libs/database');
const { NotFoundError, ConflictError, ValidationError } = require('@libs/errors');
const { generateSlug } = require('@libs/slugs');
const { generateColor } = require('./channel.utils');

const channelService = {};

channelService.create = async (projectId, data) => {
    const prisma = getPrisma();
    const slug = data.slug || generateSlug(data.name);

    if (!/^[a-z0-9-]+$/.test(slug)) {
        throw new ValidationError('Slug can only contain lowercase letters, numbers, and hyphens');
    }

    const existing = await prisma.channel.findUnique({
        where: {
            projectId_slug: { projectId, slug }
        }
    });

    if (existing) {
        throw new ConflictError('A channel with this slug already exists in this project');
    }

    return prisma.channel.create({
        data: {
            name: data.name,
            slug,
            description: data.description || '',
            projectId,
            color: data.color || generateColor(slug),
            icon: data.icon || ''
        }
    });
};

channelService.findById = async (channelId, projectId = null) => {
    const prisma = getPrisma();

    const where = { id: channelId };
    if (projectId) {
        where.projectId = projectId;
    }

    const channel = await prisma.channel.findFirst({ where });

    if (!channel) {
        throw new NotFoundError('Channel not found');
    }

    return channel;
};

channelService.findBySlug = async (slug, projectId) => {
    const prisma = getPrisma();

    const channel = await prisma.channel.findUnique({
        where: {
            projectId_slug: { projectId, slug }
        }
    });

    if (!channel) {
        throw new NotFoundError('Channel not found');
    }

    return channel;
};

channelService.findOrCreate = async (projectId, slug) => {
    const prisma = getPrisma();

    const name = slug
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

    return prisma.channel.upsert({
        where: {
            projectId_slug: { projectId, slug }
        },
        update: {},
        create: {
            name,
            slug,
            projectId,
            color: generateColor(slug)
        }
    });
};

channelService.list = async (projectId, options = {}) => {
    const prisma = getPrisma();
    const { page = 1, limit = 50 } = options;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 50;
    const skip = (pageNum - 1) * limitNum;

    const where = { projectId };

    const [channels, total] = await Promise.all([
        prisma.channel.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take: limitNum,
            include: {
                _count: {
                    select: { events: true }
                }
            }
        }),
        prisma.channel.count({ where })
    ]);

    return {
        channels,
        pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            pages: Math.ceil(total / limitNum)
        }
    };
};

channelService.update = async (channelId, projectId, data) => {
    const prisma = getPrisma();

    const channel = await prisma.channel.findFirst({
        where: { id: channelId, projectId }
    });

    if (!channel) {
        throw new NotFoundError('Channel not found');
    }

    return prisma.channel.update({
        where: { id: channelId },
        data: {
            name: data.name !== undefined ? data.name : channel.name,
            description: data.description !== undefined ? data.description : channel.description,
            color: data.color !== undefined ? data.color : channel.color,
            icon: data.icon !== undefined ? data.icon : channel.icon,
            isActive: data.isActive !== undefined ? data.isActive : channel.isActive
        }
    });
};

channelService.delete = async (channelId, projectId) => {
    const prisma = getPrisma();

    const channel = await prisma.channel.findFirst({
        where: { id: channelId, projectId }
    });

    if (!channel) {
        throw new NotFoundError('Channel not found');
    }

    await prisma.channel.delete({
        where: { id: channelId }
    });

    return channel;
};

channelService.getStats = async (channelId, projectId) => {
    const prisma = getPrisma();
    const channel = await channelService.findById(channelId, projectId);

    const [eventCount, recentEvents] = await Promise.all([
        prisma.event.count({ where: { channelId } }),
        prisma.event.findMany({
            where: { channelId },
            orderBy: { createdAt: 'desc' },
            take: 10
        })
    ]);

    return {
        channel,
        stats: {
            events: eventCount
        },
        recentEvents
    };
};

module.exports = channelService;
