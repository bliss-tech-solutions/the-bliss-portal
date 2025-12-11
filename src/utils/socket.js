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

// Listen for task creation events (backend emits: task:new, task:created, task:assigned)
export const onTaskAdded = (callback) => {
    if (socket) {
        const wrappedCallback = (data) => {
            // Backend format: { taskId, task }
            const task = data.task || data;
            callback(task);
        };
        
        socket.on('taskAdded', callback);
        // Also listen to backend socket events with wrapped callback
        socket.on('task:new', wrappedCallback);
        socket.on('task:created', wrappedCallback);
        socket.on('task:assigned', wrappedCallback);
        
        // Store the wrapped callback so we can remove it later
        if (!socket._taskAddedCallbacks) {
            socket._taskAddedCallbacks = new Map();
        }
        socket._taskAddedCallbacks.set(callback, wrappedCallback);
    }
};

export const offTaskAdded = (callback) => {
    if (socket && callback) {
        // Remove specific callback
        socket.off('taskAdded', callback);
        // Remove wrapped callback for backend events using stored reference
        if (socket._taskAddedCallbacks && socket._taskAddedCallbacks.has(callback)) {
            const wrappedCallback = socket._taskAddedCallbacks.get(callback);
            socket.off('task:new', wrappedCallback);
            socket.off('task:created', wrappedCallback);
            socket.off('task:assigned', wrappedCallback);
            socket._taskAddedCallbacks.delete(callback);
        }
    } else if (socket) {
        // If no callback provided, remove all listeners (for backward compatibility)
        if (socket._taskAddedCallbacks) {
            socket._taskAddedCallbacks.forEach((wrappedCallback) => {
                socket.off('task:new', wrappedCallback);
                socket.off('task:created', wrappedCallback);
                socket.off('task:assigned', wrappedCallback);
            });
            socket._taskAddedCallbacks.clear();
        }
        socket.off('taskAdded');
        socket.off('task:new');
        socket.off('task:created');
        socket.off('task:assigned');
    }
};

// Listen for task update events (backend emits: task:updated, task:statusUpdated)
export const onTaskUpdated = (callback) => {
    if (socket) {
        const wrappedCallback = (data) => {
            // Backend format: { taskId, taskStatus, task }
            const task = data.task || data;
            callback(task);
        };
        
        socket.on('task:updated', wrappedCallback);
        socket.on('task:statusUpdated', wrappedCallback);
        
        // Store the wrapped callback so we can remove it later
        if (!socket._taskUpdatedCallbacks) {
            socket._taskUpdatedCallbacks = new Map();
        }
        socket._taskUpdatedCallbacks.set(callback, wrappedCallback);
    }
};

export const offTaskUpdated = (callback) => {
    if (socket && callback) {
        // Remove specific callback using stored wrapper
        if (socket._taskUpdatedCallbacks && socket._taskUpdatedCallbacks.has(callback)) {
            const wrappedCallback = socket._taskUpdatedCallbacks.get(callback);
            socket.off('task:updated', wrappedCallback);
            socket.off('task:statusUpdated', wrappedCallback);
            socket._taskUpdatedCallbacks.delete(callback);
        }
    } else if (socket) {
        // If no callback provided, remove all listeners (for backward compatibility)
        if (socket._taskUpdatedCallbacks) {
            socket._taskUpdatedCallbacks.forEach((wrappedCallback) => {
                socket.off('task:updated', wrappedCallback);
                socket.off('task:statusUpdated', wrappedCallback);
            });
            socket._taskUpdatedCallbacks.clear();
        }
        socket.off('task:updated');
        socket.off('task:statusUpdated');
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

