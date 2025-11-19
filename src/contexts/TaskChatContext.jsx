import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useSocket } from './SocketContext';

const TaskChatContext = createContext({
    getMessagesForTask: () => [],
    setInitialMessages: () => { },
    ensureTaskRoom: () => { }
});

const buildMessageKey = (msg) => {
    if (!msg) return Math.random().toString(36);
    return msg._id || `${msg.senderId || 'unknown'}-${msg.receiverId || 'unknown'}-${msg.createdAt || msg.time || msg.message}`;
};

const mergeMessages = (existing = [], incoming = []) => {
    const map = new Map();
    existing.forEach((msg) => map.set(buildMessageKey(msg), msg));
    incoming.forEach((msg) => map.set(buildMessageKey(msg), msg));
    return Array.from(map.values()).sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateA - dateB;
    });
};

export const TaskChatProvider = ({ children }) => {
    const { socket } = useSocket();
    const [messagesByTask, setMessagesByTask] = useState({});
    const joinedTasksRef = useRef(new Set());

    const ensureTaskRoom = useCallback((taskId) => {
        if (!socket || !taskId) return;
        const key = String(taskId);
        if (joinedTasksRef.current.has(key)) return;
        socket.emit('joinTask', key);
        socket.emit('join-task-room', { taskId: key });
        // keep the room joined for the session (no leave)
        joinedTasksRef.current.add(key);
    }, [socket]);

    useEffect(() => {
        if (!socket) return;
        const rejoinRooms = () => {
            joinedTasksRef.current.forEach((taskId) => {
                socket.emit('joinTask', taskId);
                socket.emit('join-task-room', { taskId });
            });
        };

        socket.on('connect', rejoinRooms);
        socket.on('reconnect', rejoinRooms);

        return () => {
            socket.off('connect', rejoinRooms);
            socket.off('reconnect', rejoinRooms);
        };
    }, [socket]);

    useEffect(() => {
        if (!socket) return;
        const handleNewMessage = (incoming) => {
            if (!incoming) return;
            const taskId = incoming.taskId || incoming.message?.taskId;
            if (!taskId) return;
            const normalizedMessage = incoming.message ? {
                ...incoming.message,
                taskId,
                createdAt: incoming.message?.createdAt || new Date().toISOString()
            } : incoming;
            setMessagesByTask((prev) => {
                const key = String(taskId);
                const existing = prev[key] || [];
                const merged = mergeMessages(existing, [normalizedMessage]);
                return {
                    ...prev,
                    [key]: merged
                };
            });
        };

        socket.on('chat:new', handleNewMessage);

        return () => {
            socket.off('chat:new', handleNewMessage);
        };
    }, [socket]);

    const setInitialMessages = useCallback((taskId, messages) => {
        if (!taskId || !Array.isArray(messages)) return;
        setMessagesByTask((prev) => {
            const key = String(taskId);
            const existing = prev[key] || [];
            const merged = mergeMessages(existing, messages);
            return {
                ...prev,
                [key]: merged
            };
        });
    }, []);

    const getMessagesForTask = useCallback((taskId) => {
        if (!taskId) return [];
        const key = String(taskId);
        return messagesByTask[key] || [];
    }, [messagesByTask]);

    const value = useMemo(() => ({
        getMessagesForTask,
        setInitialMessages,
        ensureTaskRoom
    }), [getMessagesForTask, setInitialMessages, ensureTaskRoom]);

    return (
        <TaskChatContext.Provider value={value}>
            {children}
        </TaskChatContext.Provider>
    );
};

export const useTaskChatStore = () => {
    const context = useContext(TaskChatContext);
    if (!context) {
        throw new Error('useTaskChatStore must be used within a TaskChatProvider');
    }
    return context;
};


