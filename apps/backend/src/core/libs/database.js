const { PrismaClient } = require('@prisma/client');
const logger = require('./logger');

let prisma;

const getPrisma = () => {
    if (!prisma) {
        prisma = new PrismaClient({
            log: process.env.NODE_ENV === 'development'
                ? ['query', 'info', 'warn', 'error']
                : ['error']
        });
    }
    return prisma;
};

const connectDatabase = async () => {
    try {
        const client = getPrisma();
        await client.$connect();
        logger.info('Connected to PostgreSQL');
        return client;
    } catch (error) {
        logger.error({ error }, 'Failed to connect to PostgreSQL');
        process.exit(1);
    }
};

const disconnectDatabase = async () => {
    if (prisma) {
        await prisma.$disconnect();
        logger.info('Disconnected from PostgreSQL');
    }
};

module.exports = {
    getPrisma,
    connectDatabase,
    disconnectDatabase
};
