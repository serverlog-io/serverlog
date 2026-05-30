const { getPrisma } = require('@libs/database');
const { generateToken } = require('@libs/jwt');
const {
    AuthenticationError,
    NotFoundError,
    ConflictError
} = require('@libs/errors');
const { hashPassword, comparePassword, excludePassword } = require('./user.utils');

const userService = {};

userService.findById = async (id) => {
    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
        where: { id }
    });

    if (!user) {
        throw new NotFoundError('User not found');
    }

    return excludePassword(user);
};

userService.findByEmail = async (email) => {
    const prisma = getPrisma();
    return prisma.user.findUnique({
        where: { email: email.toLowerCase() }
    });
};

userService.create = async (data) => {
    const prisma = getPrisma();

    const existingUser = await prisma.user.findUnique({
        where: { email: data.email.toLowerCase() }
    });

    if (existingUser) {
        throw new ConflictError('Email already registered');
    }

    const hashedPassword = await hashPassword(data.password);

    const user = await prisma.user.create({
        data: {
            email: data.email.toLowerCase(),
            password: hashedPassword,
            name: data.name || '',
            role: data.role === 'admin' ? 'ADMIN' : 'USER',
            mustChangePassword: data.mustChangePassword || false
        }
    });

    return excludePassword(user);
};

userService.login = async (email, password) => {
    const prisma = getPrisma();

    const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
    });

    if (!user || !user.isActive) {
        throw new AuthenticationError('Invalid email or password');
    }

    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
        throw new AuthenticationError('Invalid email or password');
    }

    await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() }
    });

    const token = generateToken({
        userId: user.id,
        email: user.email,
        role: user.role.toLowerCase()
    });

    return {
        user: excludePassword(user),
        token,
        mustChangePassword: user.mustChangePassword
    };
};

userService.changePassword = async (userId, currentPassword, newPassword) => {
    const prisma = getPrisma();

    const user = await prisma.user.findUnique({
        where: { id: userId }
    });

    if (!user) {
        throw new NotFoundError('User not found');
    }

    const isMatch = await comparePassword(currentPassword, user.password);
    if (!isMatch) {
        throw new AuthenticationError('Current password is incorrect');
    }

    const hashedPassword = await hashPassword(newPassword);

    const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
            password: hashedPassword,
            mustChangePassword: false
        }
    });

    return excludePassword(updatedUser);
};

userService.updateProfile = async (userId, data) => {
    const prisma = getPrisma();

    const user = await prisma.user.findUnique({
        where: { id: userId }
    });

    if (!user) {
        throw new NotFoundError('User not found');
    }

    const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
            name: data.name !== undefined ? data.name : user.name
        }
    });

    return excludePassword(updatedUser);
};

userService.list = async (options = {}) => {
    const prisma = getPrisma();
    const { page = 1, limit = 20, role } = options;
    const skip = (page - 1) * limit;

    const where = {};
    if (role) {
        where.role = role.toUpperCase();
    }

    const [users, total] = await Promise.all([
        prisma.user.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit
        }),
        prisma.user.count({ where })
    ]);

    return {
        users: users.map(excludePassword),
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
        }
    };
};

userService.needsSetup = async () => {
    const prisma = getPrisma();
    const userCount = await prisma.user.count();
    return userCount === 0;
};

userService.setup = async (email, password) => {
    const prisma = getPrisma();

    const userCount = await prisma.user.count();
    if (userCount > 0) {
        throw new ConflictError('Setup already completed');
    }

    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
        data: {
            email: email.toLowerCase(),
            password: hashedPassword,
            name: 'Administrator',
            role: 'ADMIN',
            mustChangePassword: false
        }
    });

    const token = generateToken({
        userId: user.id,
        email: user.email,
        role: user.role.toLowerCase()
    });

    return {
        user: excludePassword(user),
        token
    };
};

module.exports = userService;
