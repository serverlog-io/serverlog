const bcrypt = require('bcryptjs');

const hashPassword = async (password) => {
    const salt = await bcrypt.genSalt(12);
    return bcrypt.hash(password, salt);
};

const comparePassword = async (password, hash) => {
    return bcrypt.compare(password, hash);
};

const excludePassword = (user) => {
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
};

module.exports = {
    hashPassword,
    comparePassword,
    excludePassword
};
