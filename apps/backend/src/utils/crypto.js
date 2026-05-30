const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

const generateApiKey = () => {
    const prefix = 'al';
    const randomPart = crypto.randomBytes(24).toString('hex');
    return `${prefix}_${randomPart}`;
};

const generateId = () => {
    return uuidv4();
};

const hashApiKey = (apiKey) => {
    return crypto.createHash('sha256').update(apiKey).digest('hex');
};

module.exports = {
    generateApiKey,
    generateId,
    hashApiKey
};
