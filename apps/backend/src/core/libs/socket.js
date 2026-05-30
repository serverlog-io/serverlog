// Socket.IO helper to emit events
// This avoids circular dependencies by lazily getting the io instance

let io = null;

const setIO = (ioInstance) => {
    io = ioInstance;
};

const getIO = () => io;

const emitToProject = (projectId, event, data) => {
    if (io) {
        io.to(`project:${projectId}`).emit(event, data);
    }
};

module.exports = {
    setIO,
    getIO,
    emitToProject
};
