const { getPrisma } = require('@libs/database');
const { NotFoundError } = require('@libs/errors');

const insightService = {};

insightService.upsert = async (projectId, data) => {
    const prisma = getPrisma();

    const existingInsight = await prisma.insight.findUnique({
        where: {
            projectId_title: { projectId, title: data.title }
        }
    });

    if (existingInsight) {
        return prisma.insight.update({
            where: { id: existingInsight.id },
            data: {
                previousValue: existingInsight.value,
                value: data.value,
                icon: data.icon !== undefined ? data.icon : existingInsight.icon,
                lastUpdatedAt: new Date()
            }
        });
    }

    return prisma.insight.create({
        data: {
            projectId,
            title: data.title,
            value: data.value,
            icon: data.icon || ''
        }
    });
};

insightService.findById = async (insightId, projectId = null) => {
    const prisma = getPrisma();

    const where = { id: insightId };
    if (projectId) {
        where.projectId = projectId;
    }

    const insight = await prisma.insight.findFirst({ where });

    if (!insight) {
        throw new NotFoundError('Insight not found');
    }

    return insight;
};

insightService.findByTitle = async (title, projectId) => {
    const prisma = getPrisma();

    const insight = await prisma.insight.findUnique({
        where: {
            projectId_title: { projectId, title }
        }
    });

    if (!insight) {
        throw new NotFoundError('Insight not found');
    }

    return insight;
};

insightService.list = async (projectId, options = {}) => {
    const prisma = getPrisma();
    const { page = 1, limit = 50 } = options;
    const skip = (page - 1) * limit;

    const where = { projectId };

    const [insights, total] = await Promise.all([
        prisma.insight.findMany({
            where,
            orderBy: { lastUpdatedAt: 'desc' },
            skip,
            take: limit
        }),
        prisma.insight.count({ where })
    ]);

    return {
        insights,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
        }
    };
};

insightService.delete = async (insightId, projectId) => {
    const prisma = getPrisma();

    const insight = await prisma.insight.findFirst({
        where: { id: insightId, projectId }
    });

    if (!insight) {
        throw new NotFoundError('Insight not found');
    }

    await prisma.insight.delete({
        where: { id: insightId }
    });

    return insight;
};

module.exports = insightService;
