const { z } = require('zod');

const chartTypes = ['BAR', 'LINE', 'AREA', 'STEP', 'SCATTER'];

const createChartSchema = z.object({
    name: z.string().min(1).max(100),
    search: z.string().max(500).optional(),
    channel: z.string().max(100).optional().nullable(),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    chartType: z.enum(chartTypes).optional()
});

const updateChartSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    search: z.string().max(500).optional(),
    channel: z.string().max(100).optional().nullable(),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    chartType: z.enum(chartTypes).optional(),
    position: z.number().int().min(0).optional()
});

const reorderSchema = z.object({
    chartIds: z.array(z.string())
});

module.exports = {
    chartTypes,
    createChartSchema,
    updateChartSchema,
    reorderSchema
};
