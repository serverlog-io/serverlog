const projectService = require('@modules/projects/project.service');

/**
 * Middleware that validates project ownership.
 *
 * Ensures the authenticated user owns the project specified in req.params.projectId.
 * Must be used AFTER authMiddleware since it requires req.user.userId.
 *
 * @throws {NotFoundError} If project doesn't exist or user is not the owner
 *
 * @example
 * router.use(authMiddleware);
 * router.use(projectOwnershipMiddleware);
 * // All routes below are now protected by ownership validation
 */
const projectOwnershipMiddleware = async (req, res, next) => {
    await projectService.findById(req.params.projectId, req.user.userId);
    next();
};

module.exports = projectOwnershipMiddleware;
