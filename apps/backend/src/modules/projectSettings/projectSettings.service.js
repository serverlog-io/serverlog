const { getPrisma } = require('@libs');

// Settings exposed to the per-project Settings UI. Defaults come from env
// (so a fresh project inherits the install-wide defaults), but each project
// can override any value independently.
const REGISTRY = {
    publicApiRateLimitEnabled: {
        type: 'boolean',
        default: () => process.env.PUBLIC_API_RATE_LIMIT_ENABLED !== 'false',
        description: 'Master switch for this project\'s public API rate limiter',
    },
    publicApiRateLimitWindowSec: {
        type: 'integer',
        min: 1,
        max: 86400,
        default: () => parseInt(process.env.PUBLIC_API_RATE_WINDOW_SEC, 10) || 60,
        description: 'Window length in seconds',
    },
    publicApiKeyRateLimit: {
        type: 'integer',
        min: 1,
        max: 1000000,
        default: () => parseInt(process.env.PUBLIC_API_KEY_RATE_LIMIT, 10) || 100,
        description: 'Max requests per window for each API key in this project',
    },
    eventRetentionDays: {
        type: 'integer',
        min: 1,
        max: 36500,
        default: () => parseInt(process.env.EVENT_RETENTION_DAYS, 10) || 90,
        description: 'How many days to keep events for this project before pruning',
    },
    maxEventDescriptionLength: {
        type: 'integer',
        min: 100,
        max: 100000,
        default: () => parseInt(process.env.MAX_EVENT_DESC_LEN, 10) || 5000,
        description: 'Maximum description length accepted on /v1/log for this project',
    },
    maxTagsPerEvent: {
        type: 'integer',
        min: 1,
        max: 200,
        default: () => parseInt(process.env.MAX_TAGS_PER_EVENT, 10) || 25,
        description: 'Maximum number of tags allowed per event',
    },
};

const CACHE_TTL_MS = 10_000;
const cache = new Map(); // `${projectId}:${key}` → { value, expiresAt }

function cacheKey(projectId, key) {
    return `${projectId}:${key}`;
}

function parseValue(raw, type) {
    if (raw === null || raw === undefined) return raw;
    if (type === 'integer') {
        const n = parseInt(raw, 10);
        return Number.isFinite(n) ? n : null;
    }
    if (type === 'boolean') return raw === 'true' || raw === true;
    return raw;
}

function serializeValue(value, type) {
    if (type === 'integer') return String(parseInt(value, 10));
    if (type === 'boolean') return value ? 'true' : 'false';
    return String(value);
}

function getDefault(key) {
    const spec = REGISTRY[key];
    if (!spec) throw new Error(`Unknown setting key: ${key}`);
    return spec.default();
}

async function get(projectId, key) {
    const spec = REGISTRY[key];
    if (!spec) throw new Error(`Unknown setting key: ${key}`);
    if (!projectId) throw new Error('projectId is required');

    const ck = cacheKey(projectId, key);
    const cached = cache.get(ck);
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    let value;
    try {
        const row = await getPrisma().projectSetting.findUnique({
            where: { projectId_key: { projectId, key } },
        });
        value = row ? parseValue(row.value, spec.type) : spec.default();
    } catch (err) {
        value = spec.default();
    }
    cache.set(ck, { value, expiresAt: Date.now() + CACHE_TTL_MS });
    return value;
}

function getSync(projectId, key) {
    // Best-effort sync read for hot paths (rate-limit middleware). Falls back
    // to the project's default if the value isn't cached yet — the request
    // triggers a background refresh.
    const spec = REGISTRY[key];
    if (!spec) throw new Error(`Unknown setting key: ${key}`);
    if (!projectId) return spec.default();
    const cached = cache.get(cacheKey(projectId, key));
    if (cached && cached.expiresAt > Date.now()) return cached.value;
    get(projectId, key).catch(() => {});
    return spec.default();
}

async function getAll(projectId) {
    const result = {};
    for (const [key, spec] of Object.entries(REGISTRY)) {
        result[key] = {
            value: await get(projectId, key),
            default: spec.default(),
            type: spec.type,
            min: spec.min,
            max: spec.max,
            description: spec.description,
        };
    }
    return result;
}

function validate(key, value) {
    const spec = REGISTRY[key];
    if (!spec) throw new Error(`Unknown setting key: ${key}`);
    if (spec.type === 'integer') {
        const n = parseInt(value, 10);
        if (!Number.isFinite(n)) throw new Error(`${key} must be an integer`);
        if (spec.min != null && n < spec.min) throw new Error(`${key} must be >= ${spec.min}`);
        if (spec.max != null && n > spec.max) throw new Error(`${key} must be <= ${spec.max}`);
        return n;
    }
    if (spec.type === 'boolean') {
        if (typeof value !== 'boolean' && value !== 'true' && value !== 'false') {
            throw new Error(`${key} must be a boolean`);
        }
        return value === true || value === 'true';
    }
    return value;
}

async function set(projectId, key, value) {
    const spec = REGISTRY[key];
    if (!spec) throw new Error(`Unknown setting key: ${key}`);
    if (!projectId) throw new Error('projectId is required');
    const validated = validate(key, value);
    const serialized = serializeValue(validated, spec.type);
    await getPrisma().projectSetting.upsert({
        where: { projectId_key: { projectId, key } },
        update: { value: serialized },
        create: { projectId, key, value: serialized },
    });
    cache.delete(cacheKey(projectId, key));
    return validated;
}

async function setMany(projectId, map) {
    const updates = {};
    for (const [key, value] of Object.entries(map)) {
        updates[key] = await set(projectId, key, value);
    }
    return updates;
}

async function reset(projectId, key) {
    await getPrisma()
        .projectSetting.delete({ where: { projectId_key: { projectId, key } } })
        .catch(() => {});
    cache.delete(cacheKey(projectId, key));
    return getDefault(key);
}

module.exports = {
    REGISTRY,
    get,
    getSync,
    getAll,
    set,
    setMany,
    reset,
    getDefault,
};
