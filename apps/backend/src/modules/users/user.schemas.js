const { z } = require('zod');

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1)
});

const changePasswordSchema = z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8, 'Password must be at least 8 characters')
});

const updateProfileSchema = z.object({
    name: z.string().optional()
});

const setupSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8, 'Password must be at least 8 characters')
});

module.exports = {
    loginSchema,
    changePasswordSchema,
    updateProfileSchema,
    setupSchema
};
