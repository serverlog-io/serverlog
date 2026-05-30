const { AuthenticationError } = require('@libs/errors');
const { hashApiKey } = require('@utils');
const { getPrisma } = require('@libs/database');

const apiKeyMiddleware = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new AuthenticationError('No API key provided');
    }

    const apiKey = authHeader.substring(7);

    if (!apiKey.startsWith('al_')) {
        throw new AuthenticationError('Invalid API key format');
    }

    const prisma = getPrisma();
    const hashedKey = hashApiKey(apiKey);

    const keyDoc = await prisma.apiKey.findUnique({
        where: { keyHash: hashedKey },
        include: { project: { select: { id: true, isActive: true } } }
    });

    if (!keyDoc || !keyDoc.isActive) {
        throw new AuthenticationError('Invalid API key');
    }

    if (!keyDoc.project || !keyDoc.project.isActive) {
        throw new AuthenticationError('Project not found or inactive');
    }

    // Check expiration
    if (keyDoc.expiresAt && new Date() > keyDoc.expiresAt) {
        throw new AuthenticationError('API key has expired');
    }

    // Fire-and-forget: Update usage stats without blocking the request
    prisma.apiKey.update({
        where: { id: keyDoc.id },
        data: {
            lastUsedAt: new Date(),
            usageCount: { increment: 1 }
        }
    }).catch(() => {
        // Silently ignore update errors - usage tracking is not critical
    });

    req.apiKey = keyDoc;
    req.project = keyDoc.project;

    next();
};

module.exports = apiKeyMiddleware;
