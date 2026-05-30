const { z } = require('zod');

const createProjectSchema = z.object({
    name: z.string().min(1).max(100),
    slug: z.string().regex(/^[a-z0-9-]+$/).min(1).max(50).optional(),
    description: z.string().max(500).optional()
});

const updateProjectSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
    isActive: z.boolean().optional()
});

module.exports = {
    createProjectSchema,
    updateProjectSchema
};
