const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

// Public API rate limiting is applied in two layers:
//
// 1. ipRateLimiter (runs BEFORE apiKeyMiddleware)
//    Limits requests per client IP. Protects the auth/DB lookup from being
//    hammered with fake or random API keys. This is the first line of defense
//    against enumeration and DoS: mandating 1000 different Bearer tokens from
//    the same IP all share this bucket.
//
// 2. apiKeyRateLimiter (runs AFTER apiKeyMiddleware)
//    Limits requests per validated API key (using req.apiKey.id set by the
//    auth middleware). This is the normal business-level quota for legitimate
//    traffic. We key off the internal key ID — never the raw secret — so the
//    limiter storage never holds API keys.

const WINDOW_MS = 60 * 1000;
const IP_MAX = parseInt(process.env.PUBLIC_API_IP_RATE_LIMIT, 10) || 300;
const KEY_MAX = parseInt(process.env.PUBLIC_API_KEY_RATE_LIMIT, 10) || 100;

const ipRateLimiter = rateLimit({
    windowMs: WINDOW_MS,
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
    windowMs: WINDOW_MS,
    max: KEY_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.apiKey?.id || ipKeyGenerator(req.ip),
    skip: () => process.env.NODE_ENV === 'test',
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
