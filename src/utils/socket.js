import { io } from 'socket.io-client';

// Simple Socket.io connection
const SOCKET_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

let socket = null;

export const initializeSocket = () => {
    if (!socket) {
        socket = io(SOCKET_URL, {
            autoConnect: false,
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5
        });

        socket.on('connect', () => {
            console.log('✅ Socket connected:', socket.id);
        });

        socket.on('disconnect', () => {
            console.log('❌ Socket disconnected');
        });

        socket.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
        });
    }
    return socket;
};

export const connectSocket = (userId) => {
    if (!socket) {
        socket = initializeSocket();
    }

    if (!socket.connected) {
        socket.connect();
        // Join user-specific room (matches backend events)
        socket.emit('joinUser', userId);
    } else {
        socket.emit('joinUser', userId);
    }
};

export const disconnectSocket = () => {
    if (socket && socket.connected) {
        socket.disconnect();
    }
};

export const getSocket = () => {
    return socket;
};

// Task-specific socket events
export const emitTaskAdded = (taskData) => {
    if (socket && socket.connected) {
        socket.emit('taskAdded', taskData);
    }
};

export const onTaskAdded = (callback) => {
    if (socket) {
        socket.on('taskAdded', callback);
    }
};

export const offTaskAdded = () => {
    if (socket) {
        socket.off('taskAdded');
    }
};

export const emitTaskExtensionRequested = (payload) => {
    if (socket && socket.connected) {
        socket.emit('task-extension-requested', payload);
    }
};

export const onTaskExtensionUpdated = (callback) => {
    if (socket) {
        socket.on('task-extension-requested', callback);
        socket.on('task-extension-updated', callback);
    }
};

export const offTaskExtensionUpdated = (callback) => {
    if (socket) {
        socket.off('task-extension-requested', callback);
        socket.off('task-extension-updated', callback);
    }
};

export const emitTaskExtensionResponded = (payload) => {
    if (socket && socket.connected) {
        socket.emit('task-extension-updated', payload);
    }
};

