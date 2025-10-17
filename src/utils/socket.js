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
        // Join user-specific room
        socket.emit('join', { userId });
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

