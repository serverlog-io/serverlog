const jwt = require('jsonwebtoken');
const { AuthenticationError } = require('./errors');

if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
}

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '7d';

const generateToken = (payload) => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

const verifyToken = (token) => {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        throw new AuthenticationError('Invalid or expired token');
    }
};

const decodeToken = (token) => {
    return jwt.decode(token);
};

module.exports = {
    generateToken,
    verifyToken,
    decodeToken
};
