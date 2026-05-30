const { z } = require('zod');

const createChannelSchema = z.object({
    name: z.string().min(1).max(100),
    slug: z.string().regex(/^[a-z0-9-]+$/).min(1).max(50).optional(),
    description: z.string().max(500).optional(),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    icon: z.string().max(10).optional()
});

const updateChannelSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    icon: z.string().max(10).optional(),
    isActive: z.boolean().optional()
});

module.exports = {
    createChannelSchema,
    updateChannelSchema
};
