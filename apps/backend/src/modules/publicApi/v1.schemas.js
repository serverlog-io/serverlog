const { z } = require('zod');

const logSchema = z.object({
    project: z.string().min(1).optional(),
    channel: z.string().min(1).regex(/^[a-z0-9-]+$/),
    event: z.string().min(1).max(200),
    description: z.string().max(100000).optional(),
    icon: z.string().max(50).optional(),
    tags: z.record(z.string().regex(/^[a-zA-Z0-9-_]+$/), z.union([z.string(), z.number(), z.boolean()])).optional(),
    parser: z.enum(['text', 'markdown']).optional(),
    user_id: z.string().max(200).optional(),
    timestamp: z.number().int().positive().optional()
});

const identifySchema = z.object({
    project: z.string().min(1).optional(),
    user_id: z.string().min(1).max(200),
    properties: z.record(z.string().regex(/^[a-z-]+$/), z.union([z.string(), z.number(), z.boolean()]))
});

const insightSchema = z.object({
    project: z.string().min(1).optional(),
    title: z.string().min(1).max(200),
    value: z.union([z.string(), z.number()]),
    icon: z.string().max(50).optional()
});

module.exports = {
    logSchema,
    identifySchema,
    insightSchema
};
