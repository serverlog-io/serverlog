const { verifyToken } = require('@libs/jwt');
const { AuthenticationError } = require('@libs/errors');

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new AuthenticationError('No token provided');
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    req.user = decoded;
    next();
};

module.exports = authMiddleware;
