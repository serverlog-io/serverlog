const { ValidationError } = require('@libs/errors');

const validatePropertyKey = (key) => {
    return /^[a-z-]+$/.test(key);
};

const processProperties = (properties) => {
    if (!properties || typeof properties !== 'object') return {};

    const processed = {};
    for (const [key, value] of Object.entries(properties)) {
        if (!validatePropertyKey(key)) {
            throw new ValidationError(`Invalid property key: ${key}. Property keys may only contain lowercase letters and hyphens.`);
        }
        processed[key] = value;
    }
    return processed;
};

module.exports = {
    validatePropertyKey,
    processProperties
};
