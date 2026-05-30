const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const testHelpers = {
  async createTestUser(prisma, overrides = {}) {
    const password = overrides.password || 'testpass123';
    const hashedPassword = await bcrypt.hash(password, 12);

    return prisma.user.create({
      data: {
        email: overrides.email || `test-${uuidv4()}@test.com`,
        password: hashedPassword,
        name: overrides.name || 'Test User',
        role: overrides.role || 'USER',
        mustChangePassword: overrides.mustChangePassword || false,
        isActive: overrides.isActive !== undefined ? overrides.isActive : true,
      },
    });
  },

  async createTestProject(prisma, ownerId, overrides = {}) {
    return prisma.project.create({
      data: {
        name: overrides.name || `Test Project ${uuidv4().slice(0, 8)}`,
        slug: overrides.slug || `test-${uuidv4().slice(0, 8)}`,
        description: overrides.description || '',
        ownerId,
      },
    });
  },

  async createTestChannel(prisma, projectId, overrides = {}) {
    const slug = overrides.slug || `test-channel-${uuidv4().slice(0, 8)}`;
    return prisma.channel.create({
      data: {
        name: overrides.name || slug,
        slug,
        projectId,
      },
    });
  },

  async createTestApiKey(prisma, projectId, createdById) {
    const key = `al_test_${uuidv4().replace(/-/g, '')}`;
    const keyHash = crypto.createHash('sha256').update(key).digest('hex');
    const keyPreview = `${key.slice(0, 7)}...${key.slice(-4)}`;

    const apiKey = await prisma.apiKey.create({
      data: {
        name: 'Test API Key',
        keyHash,
        keyPreview,
        projectId,
        createdById,
      },
    });

    // Return with the raw key for tests
    return { ...apiKey, key };
  },

  async createTestEvent(prisma, projectId, channelId, overrides = {}) {
    return prisma.event.create({
      data: {
        event: overrides.event || 'Test Event',
        description: overrides.description || '',
        icon: overrides.icon || '',
        tags: overrides.tags || {},
        userId: overrides.userId || null,
        timestamp: overrides.timestamp || new Date(),
        project: { connect: { id: projectId } },
        channel: { connect: { id: channelId } },
      },
    });
  },

  async createTestFunnel(prisma, projectId, overrides = {}) {
    return prisma.funnel.create({
      data: {
        name: overrides.name || 'Test Funnel',
        description: overrides.description || '',
        steps: overrides.steps || [
          { event: 'Step 1' },
          { event: 'Step 2' }
        ],
        timeWindow: overrides.timeWindow || 7,
        projectId,
      },
    });
  },

  async cleanupTestData(prisma, userId) {
    // Clean up in correct order due to foreign keys
    const projects = await prisma.project.findMany({ where: { ownerId: userId } });
    const projectIds = projects.map(p => p.id);

    if (projectIds.length > 0) {
      await prisma.event.deleteMany({ where: { projectId: { in: projectIds } } });
      await prisma.insight.deleteMany({ where: { projectId: { in: projectIds } } });
      await prisma.userProfile.deleteMany({ where: { projectId: { in: projectIds } } });
      await prisma.dashboardChart.deleteMany({ where: { projectId: { in: projectIds } } });
      await prisma.funnel.deleteMany({ where: { projectId: { in: projectIds } } });
      await prisma.apiKey.deleteMany({ where: { projectId: { in: projectIds } } });
      await prisma.channel.deleteMany({ where: { projectId: { in: projectIds } } });
      await prisma.project.deleteMany({ where: { id: { in: projectIds } } });
    }

    await prisma.user.delete({ where: { id: userId } }).catch(() => {});
  },
};

module.exports = testHelpers;
