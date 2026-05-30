const { AuthorizationError } = require('@libs/errors');

const adminMiddleware = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        throw new AuthorizationError('Admin access required');
    }
    next();
};

module.exports = adminMiddleware;
