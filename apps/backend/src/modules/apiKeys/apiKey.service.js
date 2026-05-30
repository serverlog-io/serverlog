const { getPrisma } = require('@libs/database');
const { NotFoundError } = require('@libs/errors');
const { generateApiKey, hashApiKey } = require('@utils');

const apiKeyService = {};

apiKeyService.create = async (projectId, userId, data) => {
    const prisma = getPrisma();
    const rawKey = generateApiKey();
    const keyHash = hashApiKey(rawKey);
    const keyPreview = `${rawKey.substring(0, 7)}...${rawKey.substring(rawKey.length - 4)}`;

    const apiKey = await prisma.apiKey.create({
        data: {
            name: data.name,
            keyHash,
            keyPreview,
            projectId,
            createdById: userId,
            expiresAt: data.expiresAt ? new Date(data.expiresAt) : null
        }
    });

    const { keyHash: _, ...apiKeyWithoutHash } = apiKey;

    return {
        apiKey: apiKeyWithoutHash,
        rawKey
    };
};

apiKeyService.findById = async (keyId, projectId = null) => {
    const prisma = getPrisma();

    const where = { id: keyId };
    if (projectId) {
        where.projectId = projectId;
    }

    const apiKey = await prisma.apiKey.findFirst({ where });

    if (!apiKey) {
        throw new NotFoundError('API key not found');
    }

    return apiKey;
};

apiKeyService.list = async (projectId, options = {}) => {
    const prisma = getPrisma();
    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const where = { projectId };

    const [apiKeys, total] = await Promise.all([
        prisma.apiKey.findMany({
            where,
            select: {
                id: true,
                name: true,
                keyPreview: true,
                isActive: true,
                lastUsedAt: true,
                usageCount: true,
                expiresAt: true,
                createdAt: true,
                updatedAt: true,
                createdBy: {
                    select: { name: true, email: true }
                }
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit
        }),
        prisma.apiKey.count({ where })
    ]);

    return {
        apiKeys,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
        }
    };
};

apiKeyService.update = async (keyId, projectId, data) => {
    const prisma = getPrisma();

    const apiKey = await prisma.apiKey.findFirst({
        where: { id: keyId, projectId }
    });

    if (!apiKey) {
        throw new NotFoundError('API key not found');
    }

    const updated = await prisma.apiKey.update({
        where: { id: keyId },
        data: {
            name: data.name !== undefined ? data.name : apiKey.name,
            isActive: data.isActive !== undefined ? data.isActive : apiKey.isActive
        }
    });

    const { keyHash: _, ...result } = updated;
    return result;
};

apiKeyService.delete = async (keyId, projectId) => {
    const prisma = getPrisma();

    const apiKey = await prisma.apiKey.findFirst({
        where: { id: keyId, projectId }
    });

    if (!apiKey) {
        throw new NotFoundError('API key not found');
    }

    await prisma.apiKey.delete({
        where: { id: keyId }
    });

    return apiKey;
};

apiKeyService.revoke = async (keyId, projectId) => {
    const prisma = getPrisma();

    const apiKey = await prisma.apiKey.findFirst({
        where: { id: keyId, projectId }
    });

    if (!apiKey) {
        throw new NotFoundError('API key not found');
    }

    const updated = await prisma.apiKey.update({
        where: { id: keyId },
        data: { isActive: false }
    });

    const { keyHash: _, ...result } = updated;
    return result;
};

module.exports = apiKeyService;
