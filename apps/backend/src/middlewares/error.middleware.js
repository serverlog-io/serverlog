const logger = require('@libs/logger');
const { AppError } = require('@libs/errors');

const errorMiddleware = (err, req, res, next) => {
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            error: err.name,
            message: err.message,
            ...(err.details && { details: err.details }),
            ...(err.code && { code: err.code })
        });
    }

    if (err.name === 'CastError') {
        return res.status(400).json({
            error: 'ValidationError',
            message: 'Invalid ID format'
        });
    }

    if (err.code === 11000) {
        return res.status(409).json({
            error: 'ConflictError',
            message: 'Duplicate entry'
        });
    }

    logger.error({ err, path: req.path, method: req.method }, 'Unhandled error');

    res.status(500).json({
        error: 'InternalServerError',
        message: process.env.NODE_ENV === 'production'
            ? 'An unexpected error occurred'
            : err.message
    });
};

module.exports = errorMiddleware;
