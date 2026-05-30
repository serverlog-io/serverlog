const { ValidationError } = require('@libs/errors');

const validateMiddleware = (schema) => {
    return (req, res, next) => {
        const result = schema.safeParse(req.body);

        if (!result.success) {
            const errors = result.error.errors.map(err => ({
                field: err.path.join('.'),
                message: err.message
            }));
            throw new ValidationError('Validation failed', errors);
        }

        req.body = result.data;
        next();
    };
};

module.exports = validateMiddleware;
