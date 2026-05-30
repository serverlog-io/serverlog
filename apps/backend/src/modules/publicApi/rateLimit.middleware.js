const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const projectSettingsService = require('@modules/projectSettings/projectSettings.service');

// Public API rate limiting is applied in two layers:
//
// 1. ipRateLimiter (runs BEFORE apiKeyMiddleware)
//    Limits requests per client IP, regardless of API key. Configured via env
//    only (PUBLIC_API_IP_RATE_LIMIT / PUBLIC_API_RATE_WINDOW_SEC). This layer
//    is a global DoS shield — it can't be per-project because we haven't
//    resolved which project the request belongs to yet.
//
// 2. apiKeyRateLimiter (runs AFTER apiKeyMiddleware)
//    Limits requests per validated API key. Both the limit and the window are
//    read from the project's settings (req.apiKey.projectId) via
//    projectSettingsService.getSync — cached for 10s so changes from the UI
//    propagate without a server restart.

const IP_WINDOW_MS = (parseInt(process.env.PUBLIC_API_RATE_WINDOW_SEC, 10) || 60) * 1000;
const IP_MAX = parseInt(process.env.PUBLIC_API_IP_RATE_LIMIT, 10) || 300;

const ipRateLimiter = rateLimit({
    windowMs: IP_WINDOW_MS,
    max: IP_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => ipKeyGenerator(req.ip),
    skip: () => process.env.NODE_ENV === 'test',
    handler: (_req, res) => {
        res.status(429).json({
            success: false,
            error: 'TooManyRequests',
            message: 'Too many requests from this IP. Please try again later.'
        });
    }
});

const apiKeyRateLimiter = rateLimit({
    windowMs: (req) => {
        const projectId = req?.apiKey?.projectId;
        return projectSettingsService.getSync(projectId, 'publicApiRateLimitWindowSec') * 1000;
    },
    max: (req) => {
        const projectId = req?.apiKey?.projectId;
        if (!projectSettingsService.getSync(projectId, 'publicApiRateLimitEnabled')) return 0;
        return projectSettingsService.getSync(projectId, 'publicApiKeyRateLimit');
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req?.apiKey?.id || ipKeyGenerator(req.ip),
    skip: (req) => {
        if (process.env.NODE_ENV === 'test') return true;
        const projectId = req?.apiKey?.projectId;
        return !projectSettingsService.getSync(projectId, 'publicApiRateLimitEnabled');
    },
    handler: (_req, res) => {
        res.status(429).json({
            success: false,
            error: 'TooManyRequests',
            message: 'API key rate limit exceeded. Please try again later.'
        });
    }
});

module.exports = {
    ipRateLimiter,
    apiKeyRateLimiter
};
