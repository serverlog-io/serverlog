#!/usr/bin/env node

/**
 * Seeds events for TODAY only, reusing existing project / channels / user profiles.
 * Does NOT delete anything. Updates UserProfile.eventsCount + lastSeenAt for users it touches.
 *
 * Usage:
 *   npm run seed:today                 # ~80-120 events for today, default project
 *   npm run seed:today -- --count 200  # custom event count
 *   npm run seed:today -- --project <projectId>
 */

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

const TEMPLATES = [
    { ch: 'auth',          event: 'User Logged In',          icon: '🔑', desc: 'Authenticated successfully',       tags: () => ({ method: pick(['email', 'google', 'github']) }) },
    { ch: 'auth',          event: 'User Logged Out',         icon: '🚪', desc: 'Session ended',                    tags: () => ({}) },
    { ch: 'auth',          event: 'User Signed Up',          icon: '🚀', desc: 'New account created',              tags: () => ({ method: 'email' }) },
    { ch: 'api',           event: 'API Request',             icon: '🌐', desc: 'Endpoint called successfully',     tags: () => ({ endpoint: pick(['/v1/data', '/v1/users', '/v1/events']), method: pick(['GET', 'POST']) }) },
    { ch: 'api',           event: 'API Error',               icon: '❌', desc: 'Request failed with server error', tags: () => ({ status: pick(['400', '429', '500']), endpoint: '/v1/data' }) },
    { ch: 'api',           event: 'Rate Limit Hit',          icon: '🚫', desc: 'Too many requests from client',    tags: () => ({ endpoint: '/v1/data', limit: '100/min' }) },
    { ch: 'billing',       event: 'Checkout Started',        icon: '🛒', desc: 'User initiated checkout',          tags: u => ({ plan: u.plan }) },
    { ch: 'billing',       event: 'Payment Completed',       icon: '💳', desc: 'Payment processed successfully',   tags: u => ({ plan: u.plan, amount: u.plan === 'pro' ? '29' : '99' }) },
    { ch: 'billing',       event: 'Payment Failed',          icon: '🚨', desc: 'Payment could not be processed',   tags: () => ({ reason: pick(['insufficient-funds', 'card-expired', 'declined']) }) },
    { ch: 'notifications', event: 'Push Notification Sent',  icon: '🔔', desc: 'Alert delivered to device',        tags: () => ({ type: pick(['alert', 'reminder', 'update']) }) },
    { ch: 'notifications', event: 'Welcome Email Sent',      icon: '📧', desc: 'Onboarding email delivered',       tags: () => ({ template: 'welcome' }) },
    { ch: 'notifications', event: 'Email Bounced',           icon: '⚠️', desc: 'Email delivery failed',            tags: () => ({ reason: pick(['invalid-address', 'mailbox-full']) }) },
    { ch: 'account',       event: 'Profile Updated',         icon: '✏️', desc: 'User updated their profile info',  tags: () => ({}) },
    { ch: 'account',       event: 'Settings Changed',        icon: '⚙️', desc: 'Account preferences updated',      tags: () => ({ setting: pick(['timezone', 'language', 'theme']) }) },
    { ch: 'account',       event: 'Password Changed',        icon: '🔒', desc: 'Account password updated',         tags: () => ({}) },
];

function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Random timestamp within "today" between 00:00 and now()
function todayTimestamp() {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const ms = randInt(0, now.getTime() - start.getTime());
    return new Date(start.getTime() + ms);
}

function parseArgs() {
    const args = process.argv.slice(2);
    const opts = { count: randInt(80, 120) };
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--count' && args[i + 1]) opts.count = parseInt(args[++i], 10);
        else if (args[i] === '--project' && args[i + 1]) opts.projectId = args[++i];
    }
    return opts;
}

const seed = async () => {
    try {
        const opts = parseArgs();
        await connectDatabase();
        const prisma = getPrisma();

        const project = opts.projectId
            ? await prisma.project.findUnique({ where: { id: opts.projectId } })
            : await prisma.project.findFirst();

        if (!project) {
            logger.error('No project found.');
            process.exit(1);
        }

        const channels = await prisma.channel.findMany({ where: { projectId: project.id } });
        if (channels.length === 0) {
            logger.error('No channels found for this project.');
            process.exit(1);
        }
        const channelBySlug = Object.fromEntries(channels.map(c => [c.slug, c]));

        const profiles = await prisma.userProfile.findMany({ where: { projectId: project.id } });
        if (profiles.length === 0) {
            logger.error('No user profiles found. Run seed-demo first or create profiles.');
            process.exit(1);
        }

        logger.info(`Project: ${project.name} (${project.id})`);
        logger.info(`Channels: ${channels.length} | profiles: ${profiles.length} | target events: ${opts.count}`);

        const events = [];
        const touchedUsers = new Map(); // externalId -> latest timestamp

        for (let i = 0; i < opts.count; i++) {
            const tpl = pick(TEMPLATES);
            const channel = channelBySlug[tpl.ch];
            if (!channel) continue;

            const profile = pick(profiles);
            const user = {
                id: profile.externalId,
                plan: profile.properties?.plan || 'free',
                country: profile.properties?.country || 'US'
            };
            const ts = todayTimestamp();

            events.push({
                projectId: project.id,
                channelId: channel.id,
                event: tpl.event,
                description: tpl.desc,
                icon: tpl.icon,
                tags: tpl.tags(user),
                parser: 'TEXT',
                userId: user.id,
                timestamp: ts,
                metadata: {},
            });

            const prev = touchedUsers.get(user.id);
            if (!prev || ts > prev) touchedUsers.set(user.id, ts);
        }

        events.sort((a, b) => a.timestamp - b.timestamp);
        const result = await prisma.event.createMany({ data: events });
        logger.info(`Inserted ${result.count} events for today`);

        // Refresh eventsCount + lastSeenAt per touched user
        for (const [externalId, lastTs] of touchedUsers) {
            const count = await prisma.event.count({
                where: { projectId: project.id, userId: externalId }
            });
            await prisma.userProfile.update({
                where: { projectId_externalId: { projectId: project.id, externalId } },
                data: { eventsCount: count, lastSeenAt: lastTs }
            });
        }
        logger.info(`Updated ${touchedUsers.size} user profiles`);

        await disconnectDatabase();
        process.exit(0);
    } catch (error) {
        logger.error({ error }, 'Seed failed');
        await disconnectDatabase();
        process.exit(1);
    }
};

seed();
