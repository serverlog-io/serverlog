const { z } = require('zod');

const stepSchema = z.object({
    event: z.string().min(1).max(200),
    channel: z.string().max(100).optional(),
    tags: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional()
});

const createFunnelSchema = z.object({
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    steps: z.array(stepSchema).min(2).max(10),
    timeWindow: z.number().int().min(1).max(90).optional()
});

const updateFunnelSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
    steps: z.array(stepSchema).min(2).max(10).optional(),
    timeWindow: z.number().int().min(1).max(90).optional()
});

const calculateQuerySchema = z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional()
});

module.exports = {
    stepSchema,
    createFunnelSchema,
    updateFunnelSchema,
    calculateQuerySchema
};
