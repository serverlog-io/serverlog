const { z } = require('zod');

const createApiKeySchema = z.object({
    name: z.string().min(1).max(100),
    expiresAt: z.string().datetime().optional()
});

const updateApiKeySchema = z.object({
    name: z.string().min(1).max(100).optional(),
    isActive: z.boolean().optional()
});

module.exports = {
    createApiKeySchema,
    updateApiKeySchema
};
