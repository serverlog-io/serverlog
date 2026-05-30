const authMiddleware = require('./auth.middleware');
const validateMiddleware = require('./validate.middleware');
const errorMiddleware = require('./error.middleware');
const projectOwnershipMiddleware = require('./projectOwnership.middleware');

module.exports = {
    authMiddleware,
    validateMiddleware,
    errorMiddleware,
    projectOwnershipMiddleware
};
