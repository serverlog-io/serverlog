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

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

beforeAll(async () => {
  // Ensure database connection
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});

// Export prisma for use in tests
global.prisma = prisma;
