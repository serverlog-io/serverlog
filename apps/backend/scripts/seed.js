require('dotenv').config();

const path = require('path');
const moduleAlias = require('module-alias');
moduleAlias.addAliases({
    '@core': path.join(__dirname, '../src/core'),
    '@libs': path.join(__dirname, '../src/core/libs'),
    '@middlewares': path.join(__dirname, '../src/middlewares'),
    '@modules': path.join(__dirname, '../src/modules'),
    '@utils': path.join(__dirname, '../src/utils')
});

const { connectDatabase, disconnectDatabase, logger } = require('@libs');
const userService = require('@modules/users/user.service');

const seed = async () => {
    try {
        await connectDatabase();

        logger.info('Starting seed process...');

        const needsSetup = await userService.needsSetup();

        if (needsSetup) {
            logger.info('No users found. Open the frontend to create your admin account.');
        } else {
            logger.info('Users already exist in the database.');
        }

        logger.info('Seed process completed');
        await disconnectDatabase();
        process.exit(0);
    } catch (error) {
        logger.error({ error }, 'Seed process failed');
        await disconnectDatabase();
        process.exit(1);
    }
};

seed();
