require('dotenv').config();

const path = require('path');
const moduleAlias = require('module-alias');
moduleAlias.addAliases({
    '@core': path.join(__dirname, 'src/core'),
    '@libs': path.join(__dirname, 'src/core/libs'),
    '@middlewares': path.join(__dirname, 'src/middlewares'),
    '@modules': path.join(__dirname, 'src/modules'),
    '@utils': path.join(__dirname, 'src/utils')
});

require('express-async-errors');

const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const { connectDatabase, logger, setIO } = require('@libs');
const { errorMiddleware } = require('@middlewares');

const userController = require('@modules/users/user.controller');
const projectController = require('@modules/projects/project.controller');
const channelController = require('@modules/channels/channel.controller');
const apiKeyController = require('@modules/apiKeys/apiKey.controller');
const eventController = require('@modules/events/event.controller');
const insightController = require('@modules/insights/insight.controller');
const userProfileController = require('@modules/identify/userProfile.controller');
const dashboardController = require('@modules/dashboard/dashboard.controller');
const funnelController = require('@modules/funnels/funnel.controller');
const { projectSettingsController } = require('@modules/projectSettings');
const { v1Controller } = require('@modules/publicApi');

const { verifyToken } = require('@libs/jwt');
const projectService = require('@modules/projects/project.service');

const app = express();
const server = http.createServer(app);

// Socket.IO setup
const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true
    }
});

// Set IO instance for use in other modules
setIO(io);

// Socket.IO authentication middleware
io.use(async (socket, next) => {
    try {
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error('Authentication required'));
        }

        const decoded = verifyToken(token);
        socket.userId = decoded.userId;
        next();
    } catch (error) {
        next(new Error('Invalid token'));
    }
});

// Socket.IO connection handler
io.on('connection', (socket) => {
    logger.info({ userId: socket.userId }, 'Socket connected');

    // Join project room
    socket.on('join:project', async (projectId) => {
        try {
            // Verify user has access to project
            const project = await projectService.findById(projectId, socket.userId);
            if (project) {
                socket.join(`project:${projectId}`);
                logger.info({ userId: socket.userId, projectId }, 'Joined project room');
            }
        } catch (error) {
            logger.error({ error, projectId }, 'Failed to join project room');
        }
    });

    // Leave project room
    socket.on('leave:project', (projectId) => {
        socket.leave(`project:${projectId}`);
        logger.info({ userId: socket.userId, projectId }, 'Left project room');
    });

    socket.on('disconnect', () => {
        logger.info({ userId: socket.userId }, 'Socket disconnected');
    });
});

// Export io for use in other modules
module.exports.io = io;

app.set('trust proxy', 1);
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3011',
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/users', userController);
app.use('/api/projects', projectController);
app.use('/api/projects/:projectId/channels', channelController);
app.use('/api/projects/:projectId/api-keys', apiKeyController);
app.use('/api/projects/:projectId/events', eventController);
app.use('/api/projects/:projectId/insights', insightController);
app.use('/api/projects/:projectId/users', userProfileController);
app.use('/api/projects/:projectId/dashboard', dashboardController);
app.use('/api/projects/:projectId/funnels', funnelController);
app.use('/api/projects/:projectId/settings', projectSettingsController);

app.use('/v1', v1Controller);

app.use((req, res) => {
    res.status(404).json({
        error: 'NotFoundError',
        message: `Route ${req.method} ${req.path} not found`
    });
});

app.use(errorMiddleware);

const PORT = process.env.PORT || 3001;

const start = async () => {
    try {
        await connectDatabase();

        server.listen(PORT, () => {
            logger.info(`Serverlog server running on port ${PORT}`);
            logger.info(`Health check: http://localhost:${PORT}/health`);
            logger.info(`API Base URL: http://localhost:${PORT}/api`);
            logger.info(`Public API: http://localhost:${PORT}/v1`);
            logger.info(`WebSocket: ws://localhost:${PORT}`);
        });
    } catch (error) {
        logger.error({ error }, 'Failed to start server');
        process.exit(1);
    }
};

// Only start server if this file is run directly (not imported)
if (require.main === module) {
    start();
}

module.exports.app = app;
