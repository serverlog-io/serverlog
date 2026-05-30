#!/usr/bin/env node

/**
 * Password Reset Script
 *
 * Usage:
 *   npm run reset-password                    # Interactive - lists users or resets if only one
 *   npm run reset-password -- --email x@x.com # Reset specific user
 *   npm run reset-password -- --password xxx  # Use custom password
 */

require('module-alias/register');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const readline = require('readline');

const prisma = new PrismaClient();

const generatePassword = () => {
  return crypto.randomBytes(12).toString('base64').replace(/[+/=]/g, '').slice(0, 16);
};

const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
};

const askQuestion = (question) => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
};

const parseArgs = () => {
  const args = process.argv.slice(2);
  const options = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--email' && args[i + 1]) {
      options.email = args[++i];
    } else if (args[i] === '--password' && args[i + 1]) {
      options.password = args[++i];
    }
  }

  return options;
};

const main = async () => {
  console.log('\n🔐 Serverlog Password Reset\n');

  try {
    const options = parseArgs();
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true }
    });

    if (users.length === 0) {
      console.log('❌ No users found. Run the app and complete setup first.\n');
      process.exit(1);
    }

    let targetUser;

    if (options.email) {
      targetUser = users.find(u => u.email.toLowerCase() === options.email.toLowerCase());
      if (!targetUser) {
        console.log(`❌ User with email "${options.email}" not found.\n`);
        console.log('Available users:');
        users.forEach((u, i) => console.log(`  ${i + 1}. ${u.email} (${u.name || 'No name'})`));
        process.exit(1);
      }
    } else if (users.length === 1) {
      targetUser = users[0];
      console.log(`Found 1 user: ${targetUser.email}`);
    } else {
      console.log('Available users:\n');
      users.forEach((u, i) => console.log(`  ${i + 1}. ${u.email} (${u.name || 'No name'}) - ${u.role}`));

      const choice = await askQuestion('\nEnter number to reset (or email): ');
      const num = parseInt(choice);

      if (num > 0 && num <= users.length) {
        targetUser = users[num - 1];
      } else {
        targetUser = users.find(u => u.email.toLowerCase() === choice.toLowerCase());
      }

      if (!targetUser) {
        console.log('❌ Invalid selection.\n');
        process.exit(1);
      }
    }

    const newPassword = options.password || generatePassword();
    const hashedPassword = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: targetUser.id },
      data: {
        password: hashedPassword,
        mustChangePassword: true
      }
    });

    console.log('\n✅ Password reset successful!\n');
    console.log(`   Email:    ${targetUser.email}`);
    console.log(`   Password: ${newPassword}\n`);
    console.log('⚠️  You will be asked to change this password on first login.\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
};

main();
