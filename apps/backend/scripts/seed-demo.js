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

const { connectDatabase, disconnectDatabase, getPrisma, logger } = require('@libs');

// ─── Config ────────────────────────────────────────────────────────
const DAYS = 30;

const USERS = [
    { id: 'alice',   plan: 'pro',        country: 'US' },
    { id: 'bob',     plan: 'enterprise',  country: 'UK' },
    { id: 'charlie', plan: 'free',        country: 'AR' },
    { id: 'diana',   plan: 'pro',        country: 'DE' },
    { id: 'eve',     plan: 'free',        country: 'BR' },
    { id: 'frank',   plan: 'enterprise',  country: 'US' },
    { id: 'grace',   plan: 'pro',        country: 'JP' },
    { id: 'henry',   plan: 'free',        country: 'UK' },
    { id: 'iris',    plan: 'pro',        country: 'AR' },
    { id: 'jack',    plan: 'free',        country: 'US' },
    { id: 'karen',   plan: 'enterprise',  country: 'DE' },
    { id: 'leo',     plan: 'pro',        country: 'BR' },
];

const CHANNELS = [
    { name: 'Auth',          slug: 'auth',          color: '#6366f1' },
    { name: 'Billing',       slug: 'billing',       color: '#10b981' },
    { name: 'API',           slug: 'api',           color: '#f59e0b' },
    { name: 'Notifications', slug: 'notifications', color: '#ef4444' },
    { name: 'Account',       slug: 'account',       color: '#8b5cf6' },
];

// User journey steps — each user progresses through these in order
// channel, event name, icon, description, tags builder, probability of happening
const JOURNEY = [
    { ch: 'auth',    event: 'User Signed Up',         icon: '🚀', desc: 'New account created',                    tags: u => ({ method: 'email' }),          prob: 1 },
    { ch: 'notifications', event: 'Welcome Email Sent', icon: '📧', desc: 'Onboarding email delivered',           tags: () => ({ template: 'welcome' }),     prob: 0.95 },
    { ch: 'auth',    event: 'User Logged In',          icon: '🔑', desc: 'Authenticated successfully',            tags: () => ({ method: randomItem(['email', 'google', 'github']) }), prob: 1 },
    { ch: 'account', event: 'Profile Updated',         icon: '✏️', desc: 'User updated their profile info',       tags: () => ({}),                          prob: 0.7 },
    { ch: 'account', event: 'Avatar Uploaded',          icon: '📷', desc: 'Profile picture changed',               tags: () => ({ format: 'jpg' }),           prob: 0.4 },
    { ch: 'api',     event: 'API Key Created',          icon: '🔐', desc: 'New API key generated',                 tags: () => ({ scope: 'read' }),           prob: 0.5 },
    { ch: 'api',     event: 'API Request',              icon: '🌐', desc: 'Endpoint called successfully',          tags: () => ({ endpoint: randomItem(['/v1/data', '/v1/users', '/v1/events']), method: 'GET' }), prob: 0.6 },
    { ch: 'billing', event: 'Checkout Started',         icon: '🛒', desc: 'User initiated checkout',               tags: u => ({ plan: u.plan }),             prob: 0.6 },
    { ch: 'billing', event: 'Payment Completed',        icon: '💳', desc: 'Payment processed successfully',        tags: u => ({ plan: u.plan, amount: u.plan === 'pro' ? '29' : '99' }), prob: 0.5 },
    { ch: 'notifications', event: 'Invoice Email Sent', icon: '🧾', desc: 'Payment receipt delivered',            tags: () => ({ template: 'invoice' }),     prob: 0.9 },
    { ch: 'account', event: 'Settings Changed',         icon: '⚙️', desc: 'Account preferences updated',          tags: () => ({ setting: randomItem(['timezone', 'language', 'theme']) }), prob: 0.5 },
    { ch: 'api',     event: 'Webhook Configured',       icon: '🔗', desc: 'Webhook endpoint registered',           tags: () => ({ url: 'https://example.com/hook' }), prob: 0.3 },
];

// Recurring events — these happen randomly across the 30 days for active users
const RECURRING = [
    { ch: 'auth',    event: 'User Logged In',          icon: '🔑', desc: 'Authenticated successfully',            tags: () => ({ method: randomItem(['email', 'google', 'github']) }) },
    { ch: 'api',     event: 'API Request',              icon: '🌐', desc: 'Endpoint called successfully',          tags: () => ({ endpoint: randomItem(['/v1/data', '/v1/users', '/v1/events']), method: randomItem(['GET', 'POST']) }) },
    { ch: 'api',     event: 'API Error',                icon: '❌', desc: 'Request failed with server error',      tags: () => ({ status: randomItem(['400', '429', '500']), endpoint: '/v1/data' }) },
    { ch: 'api',     event: 'Rate Limit Hit',           icon: '🚫', desc: 'Too many requests from client',         tags: () => ({ endpoint: '/v1/data', limit: '100/min' }) },
    { ch: 'notifications', event: 'Push Notification Sent', icon: '🔔', desc: 'Alert delivered to device',        tags: () => ({ type: randomItem(['alert', 'reminder', 'update']) }) },
    { ch: 'notifications', event: 'Email Bounced',      icon: '⚠️', desc: 'Email delivery failed',                tags: () => ({ reason: randomItem(['invalid-address', 'mailbox-full']) }) },
    { ch: 'billing', event: 'Payment Failed',           icon: '🚨', desc: 'Payment could not be processed',       tags: () => ({ reason: randomItem(['insufficient-funds', 'card-expired', 'declined']) }) },
    { ch: 'billing', event: 'Subscription Cancelled',   icon: '👋', desc: 'User cancelled their subscription',    tags: u => ({ plan: u.plan, reason: randomItem(['too-expensive', 'not-needed', 'switching']) }) },
    { ch: 'account', event: 'Password Changed',         icon: '🔒', desc: 'Account password updated',             tags: () => ({}) },
    { ch: 'auth',    event: 'User Logged Out',          icon: '🚪', desc: 'Session ended',                        tags: () => ({}) },
];

// ─── Helpers ───────────────────────────────────────────────────────
function randomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function daysAgo(n) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d;
}

// Returns a timestamp on the given day, with hour offset to preserve ordering
function timestampAtDay(day, hourOffset = 0) {
    const base = daysAgo(day);
    const hour = Math.min(6 + hourOffset, 23);
    base.setHours(hour, randomBetween(0, 59), randomBetween(0, 59), 0);
    return base;
}

function randomTimestamp(day) {
    const base = daysAgo(day);
    base.setHours(randomBetween(6, 23), randomBetween(0, 59), randomBetween(0, 59), 0);
    return base;
}

// ─── Seed ──────────────────────────────────────────────────────────
const seed = async () => {
    try {
        await connectDatabase();
        const prisma = getPrisma();

        const project = await prisma.project.findFirst();
        if (!project) {
            logger.error('No project found. Create a project first via the UI.');
            process.exit(1);
        }

        logger.info(`Seeding demo data for project: ${project.name} (${project.id})`);

        // Clean existing data
        await prisma.event.deleteMany({ where: { projectId: project.id } });
        await prisma.userProfile.deleteMany({ where: { projectId: project.id } });
        await prisma.channel.deleteMany({ where: { projectId: project.id } });
        logger.info('Cleared existing data');

        // Create channels
        const channelMap = {};
        for (const ch of CHANNELS) {
            const channel = await prisma.channel.create({
                data: { ...ch, projectId: project.id }
            });
            channelMap[ch.slug] = channel;
        }
        logger.info(`Created ${CHANNELS.length} channels`);

        // Create user profiles
        for (const user of USERS) {
            await prisma.userProfile.create({
                data: {
                    projectId: project.id,
                    externalId: user.id,
                    properties: {
                        name: user.id.charAt(0).toUpperCase() + user.id.slice(1),
                        plan: user.plan,
                        country: user.country,
                    },
                    eventsCount: 0,
                    firstSeenAt: daysAgo(randomBetween(20, 30)),
                    lastSeenAt: daysAgo(randomBetween(0, 3)),
                }
            });
        }
        logger.info(`Created ${USERS.length} user profiles`);

        const events = [];

        // Generate user journeys — each user signs up on a different day and progresses
        for (const user of USERS) {
            const signupDay = randomBetween(15, 28);

            // Walk through the journey steps
            let currentDay = signupDay;
            for (const step of JOURNEY) {
                if (Math.random() > step.prob) continue;
                if (currentDay < 0) break;

                events.push({
                    projectId: project.id,
                    channelId: channelMap[step.ch].id,
                    event: step.event,
                    description: step.desc,
                    icon: step.icon,
                    tags: step.tags(user),
                    parser: 'TEXT',
                    userId: user.id,
                    timestamp: timestampAtDay(currentDay, JOURNEY.indexOf(step)),
                    metadata: {},
                });

                // Advance 0-2 days between steps
                currentDay -= randomBetween(0, 2);
            }

            // Generate recurring events from signup until today
            const recurringPerDay = user.plan === 'enterprise' ? 4 : user.plan === 'pro' ? 2.5 : 1.5;
            for (let day = signupDay; day >= 0; day--) {
                const count = randomBetween(
                    Math.floor(recurringPerDay * 0.5),
                    Math.ceil(recurringPerDay * 1.5)
                );
                for (let i = 0; i < count; i++) {
                    const template = randomItem(RECURRING);
                    events.push({
                        projectId: project.id,
                        channelId: channelMap[template.ch].id,
                        event: template.event,
                        description: template.desc,
                        icon: template.icon,
                        tags: template.tags(user),
                        parser: 'TEXT',
                        userId: user.id,
                        timestamp: randomTimestamp(day),
                        metadata: {},
                    });
                }
            }
        }

        // Sort by timestamp before inserting
        events.sort((a, b) => a.timestamp - b.timestamp);

        const result = await prisma.event.createMany({ data: events });
        logger.info(`Created ${result.count} events over ${DAYS} days`);

        // Update user profile event counts
        for (const user of USERS) {
            const count = await prisma.event.count({
                where: { projectId: project.id, userId: user.id }
            });
            await prisma.userProfile.update({
                where: { projectId_externalId: { projectId: project.id, externalId: user.id } },
                data: { eventsCount: count }
            });
        }
        logger.info('Updated user profile event counts');

        logger.info('Demo seed completed!');
        await disconnectDatabase();
        process.exit(0);
    } catch (error) {
        logger.error({ error }, 'Seed failed');
        await disconnectDatabase();
        process.exit(1);
    }
};

seed();
