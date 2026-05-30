const { ValidationError } = require('@libs/errors');

// ============================================
// Tag Processing
// ============================================

const TAG_KEY_REGEX = /^[\w-]+$/;

const validateTagKey = (key) => TAG_KEY_REGEX.test(key);

const processTags = (tags) => {
    if (!tags || typeof tags !== 'object') return {};

    const processed = {};
    for (const [key, value] of Object.entries(tags)) {
        if (!validateTagKey(key)) {
            throw new ValidationError(
                `Invalid tag key: ${key}. Only letters, numbers, hyphens, and underscores allowed.`
            );
        }
        processed[key] = value;
    }
    return processed;
};

// ============================================
// Multi-value Parsing (for filters)
// ============================================

/**
 * Parse a string with multiple values separated by comma or space
 * @param {string} value - Input string like "value1,value2" or "value1 value2"
 * @returns {string[]} Array of trimmed, non-empty values
 */
const parseMultipleValues = (value) => {
    if (!value) return [];
    return value.split(/[\s,]+/).map(v => v.trim()).filter(Boolean);
};

// ============================================
// Date/Time Utilities
// ============================================

const VALID_INTERVALS = ['second', 'minute', 'hour', 'day'];

const validateInterval = (interval) => {
    return VALID_INTERVALS.includes(interval) ? interval : 'hour';
};

const getBucketKey = (date, interval) => {
    const d = new Date(date);
    switch (interval) {
        case 'second':
            d.setUTCMilliseconds(0);
            break;
        case 'minute':
            d.setUTCSeconds(0, 0);
            break;
        case 'hour':
            d.setUTCMinutes(0, 0, 0);
            break;
        default:
            d.setUTCHours(0, 0, 0, 0);
    }
    return d.toISOString();
};

const INTERVAL_MS = {
    second: 1000,
    minute: 60 * 1000,
    hour: 60 * 60 * 1000,
    day: 24 * 60 * 60 * 1000
};

/**
 * Calculate appropriate interval based on time range
 */
const calculateAutoInterval = (startDate, endDate) => {
    const rangeMs = endDate.getTime() - startDate.getTime();
    const rangeMinutes = rangeMs / (1000 * 60);
    const rangeHours = rangeMs / (1000 * 60 * 60);

    if (rangeMinutes <= 2) return 'second';
    if (rangeHours <= 2) return 'minute';
    if (rangeHours <= 72) return 'hour';
    return 'day';
};

/**
 * Generate empty buckets for a time range
 */
const generateEmptyBuckets = (start, end, interval) => {
    const buckets = new Map();
    let current = new Date(start);
    const intervalMs = INTERVAL_MS[interval];

    while (current <= end) {
        const key = getBucketKey(current, interval);
        buckets.set(key, { timestamp: key, count: 0 });
        current = new Date(current.getTime() + intervalMs);
    }

    return buckets;
};

// ============================================
// Query Building Helpers
// ============================================

/**
 * Build date range filter for Prisma where clause
 */
const buildDateFilter = (startDate, endDate) => {
    if (!startDate && !endDate) return null;

    const filter = {};
    if (startDate) filter.gte = new Date(startDate);
    if (endDate) filter.lte = new Date(endDate);
    return filter;
};

/**
 * Build tag conditions for Prisma where clause
 */
const buildTagConditions = (tags) => {
    if (!tags) return [];

    try {
        const tagFilters = typeof tags === 'string' ? JSON.parse(tags) : tags;
        const conditions = [];

        for (const [key, value] of Object.entries(tagFilters)) {
            if (value === '' || value === null) {
                // Key exists with any value
                conditions.push({
                    tags: { path: [key], not: 'null' }
                });
            } else {
                // Key equals specific value (try both string and number)
                const valueConditions = [
                    { tags: { path: [key], equals: value } }
                ];
                const numValue = Number(value);
                if (!isNaN(numValue) && value !== '') {
                    valueConditions.push({ tags: { path: [key], equals: numValue } });
                }
                conditions.push({ OR: valueConditions });
            }
        }

        return conditions;
    } catch {
        return [];
    }
};

// ============================================
// Constants
// ============================================

const MAX_PAGE_LIMIT = 100;
const DEFAULT_PAGE_LIMIT = 50;

module.exports = {
    // Tags
    validateTagKey,
    processTags,
    TAG_KEY_REGEX,

    // Multi-value parsing
    parseMultipleValues,

    // Date/Time
    validateInterval,
    getBucketKey,
    calculateAutoInterval,
    generateEmptyBuckets,
    INTERVAL_MS,
    VALID_INTERVALS,

    // Query building
    buildDateFilter,
    buildTagConditions,

    // Constants
    MAX_PAGE_LIMIT,
    DEFAULT_PAGE_LIMIT
};
