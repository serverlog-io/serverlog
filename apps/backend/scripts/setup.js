#!/usr/bin/env node

/**
 * First-run setup: create the initial admin user.
 *
 * Refuses if any user already exists. Reads credentials from env so the
 * password never appears in `ps`. Designed to be invoked by scripts/install.sh
 * via `docker exec -e ADMIN_EMAIL=... -e ADMIN_PASSWORD=... serverlog-backend
 * node scripts/setup.js`.
 *
 * Exit codes:
 *   0 — admin created
 *   1 — invalid input or unexpected error
 *   2 — setup already completed (users exist)
 */

const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const main = async () => {
    const email = (process.env.ADMIN_EMAIL || '').trim();
    const password = process.env.ADMIN_PASSWORD || '';

    if (!email || !password) {
        console.error('Missing ADMIN_EMAIL or ADMIN_PASSWORD env vars');
        process.exit(1);
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        console.error('Invalid email format');
        process.exit(1);
    }
    if (password.length < 8) {
        console.error('Password must be at least 8 characters');
        process.exit(1);
    }

    try {
        const userCount = await prisma.user.count();
        if (userCount > 0) {
            console.error('Setup already completed — a user already exists');
            process.exit(2);
        }

        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await prisma.user.create({
            data: {
                email: email.toLowerCase(),
                password: hashedPassword,
                name: 'Administrator',
                role: 'ADMIN',
                mustChangePassword: false,
            },
        });

        console.log(`Admin user created: ${user.email}`);
    } catch (error) {
        console.error(`Setup failed: ${error.message}`);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
};

main();
