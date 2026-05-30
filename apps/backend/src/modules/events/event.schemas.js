const { z } = require('zod');

const listEventsSchema = z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    channel: z.string().optional(),
    event: z.string().optional(),
    search: z.string().optional(),
    tags: z.string().optional(),
    userId: z.string().optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional()
}).strict();

const createEventSchema = z.object({
    channel: z.string().min(1).regex(/^[a-z0-9-]+$/),
    event: z.string().min(1).max(200),
    description: z.string().max(5000).optional(),
    icon: z.string().max(50).optional(),
    tags: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
    parser: z.enum(['text', 'markdown']).optional(),
    userId: z.string().max(200).optional()
});

module.exports = {
    listEventsSchema,
    createEventSchema
};
