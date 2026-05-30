const { getPrisma } = require('@libs/database');
const { NotFoundError, ConflictError, ValidationError } = require('@libs/errors');
const { generateSlug } = require('@libs/slugs');

const projectService = {};

projectService.create = async (ownerId, data) => {
    const prisma = getPrisma();
    const slug = data.slug || generateSlug(data.name);

    if (!/^[a-z0-9-]+$/.test(slug)) {
        throw new ValidationError('Slug can only contain lowercase letters, numbers, and hyphens');
    }

    const existing = await prisma.project.findUnique({
        where: {
            ownerId_slug: { ownerId, slug }
        }
    });

    if (existing) {
        throw new ConflictError('A project with this slug already exists');
    }

    return prisma.project.create({
        data: {
            name: data.name,
            slug,
            description: data.description || '',
            ownerId
        }
    });
};

projectService.findById = async (projectId, ownerId = null) => {
    const prisma = getPrisma();

    const where = { id: projectId };
    if (ownerId) {
        where.ownerId = ownerId;
    }

    const project = await prisma.project.findFirst({ where });

    if (!project) {
        throw new NotFoundError('Project not found');
    }

    return project;
};

projectService.findBySlug = async (slug, ownerId) => {
    const prisma = getPrisma();

    const project = await prisma.project.findUnique({
        where: {
            ownerId_slug: { ownerId, slug }
        }
    });

    if (!project) {
        throw new NotFoundError('Project not found');
    }

    return project;
};

projectService.list = async (ownerId, options = {}) => {
    const prisma = getPrisma();
    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const where = { ownerId };

    const [projects, total] = await Promise.all([
        prisma.project.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
            include: {
                _count: {
                    select: {
                        channels: true,
                        events: true
                    }
                }
            }
        }),
        prisma.project.count({ where })
    ]);

    return {
        projects,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
        }
    };
};

projectService.update = async (projectId, ownerId, data) => {
    const prisma = getPrisma();

    const project = await prisma.project.findFirst({
        where: { id: projectId, ownerId }
    });

    if (!project) {
        throw new NotFoundError('Project not found');
    }

    return prisma.project.update({
        where: { id: projectId },
        data: {
            name: data.name !== undefined ? data.name : project.name,
            description: data.description !== undefined ? data.description : project.description,
            isActive: data.isActive !== undefined ? data.isActive : project.isActive
        }
    });
};

projectService.delete = async (projectId, ownerId) => {
    const prisma = getPrisma();

    const project = await prisma.project.findFirst({
        where: { id: projectId, ownerId }
    });

    if (!project) {
        throw new NotFoundError('Project not found');
    }

    await prisma.project.delete({
        where: { id: projectId }
    });

    return project;
};

projectService.getStats = async (projectId, ownerId) => {
    const prisma = getPrisma();
    const project = await projectService.findById(projectId, ownerId);

    const [channelCount, eventCount, recentEvents] = await Promise.all([
        prisma.channel.count({ where: { projectId } }),
        prisma.event.count({ where: { projectId } }),
        prisma.event.findMany({
            where: { projectId },
            orderBy: { createdAt: 'desc' },
            take: 5,
            include: {
                channel: {
                    select: { name: true, slug: true }
                }
            }
        })
    ]);

    return {
        project,
        stats: {
            channels: channelCount,
            events: eventCount
        },
        recentEvents
    };
};

module.exports = projectService;
