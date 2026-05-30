const { getPrisma } = require('@libs/database');
const { NotFoundError } = require('@libs/errors');

const dashboardService = {};

dashboardService.create = async (projectId, data) => {
    const prisma = getPrisma();

    // Get max position for this project
    const maxPosition = await prisma.dashboardChart.aggregate({
        where: { projectId },
        _max: { position: true }
    });

    return prisma.dashboardChart.create({
        data: {
            name: data.name,
            search: data.search || '',
            channel: data.channel || null,
            color: data.color || '#6366f1',
            chartType: data.chartType || 'BAR',
            position: (maxPosition._max.position || 0) + 1,
            projectId
        }
    });
};

dashboardService.findById = async (chartId, projectId) => {
    const prisma = getPrisma();

    const chart = await prisma.dashboardChart.findFirst({
        where: { id: chartId, projectId }
    });

    if (!chart) {
        throw new NotFoundError('Dashboard chart not found');
    }

    return chart;
};

dashboardService.list = async (projectId) => {
    const prisma = getPrisma();

    const charts = await prisma.dashboardChart.findMany({
        where: { projectId },
        orderBy: { position: 'asc' }
    });

    return { charts };
};

dashboardService.update = async (chartId, projectId, data) => {
    const prisma = getPrisma();

    const chart = await prisma.dashboardChart.findFirst({
        where: { id: chartId, projectId }
    });

    if (!chart) {
        throw new NotFoundError('Dashboard chart not found');
    }

    return prisma.dashboardChart.update({
        where: { id: chartId },
        data: {
            name: data.name !== undefined ? data.name : chart.name,
            search: data.search !== undefined ? data.search : chart.search,
            channel: data.channel !== undefined ? data.channel : chart.channel,
            color: data.color !== undefined ? data.color : chart.color,
            chartType: data.chartType !== undefined ? data.chartType : chart.chartType,
            position: data.position !== undefined ? data.position : chart.position
        }
    });
};

dashboardService.delete = async (chartId, projectId) => {
    const prisma = getPrisma();

    const chart = await prisma.dashboardChart.findFirst({
        where: { id: chartId, projectId }
    });

    if (!chart) {
        throw new NotFoundError('Dashboard chart not found');
    }

    await prisma.dashboardChart.delete({
        where: { id: chartId }
    });

    return chart;
};

dashboardService.reorder = async (projectId, chartIds) => {
    const prisma = getPrisma();

    const updates = chartIds.map((id, index) =>
        prisma.dashboardChart.updateMany({
            where: { id, projectId },
            data: { position: index }
        })
    );

    await prisma.$transaction(updates);

    return dashboardService.list(projectId);
};

module.exports = dashboardService;
