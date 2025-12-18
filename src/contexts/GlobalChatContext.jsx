import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useSocket } from './SocketContext';

const GlobalChatContext = createContext({
    getMessages: () => [],
    setInitialMessages: () => { },
    ensureGlobalRoom: () => { }
});

const buildMessageKey = (msg) => {
    if (!msg) return Math.random().toString(36);
    return msg._id || `${msg.senderId || 'unknown'}-${msg.createdAt || msg.time || msg.message}`;
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

export const GlobalChatProvider = ({ children }) => {
    const { socket } = useSocket();
    const [messages, setMessages] = useState([]);
    const joinedGlobalRoomRef = useRef(false);

    const ensureGlobalRoom = useCallback(() => {
        if (!socket) return;
        if (joinedGlobalRoomRef.current) return;

        // Join the global-chat room
        socket.emit('joinGlobalChat');
        joinedGlobalRoomRef.current = true;
    }, [socket]);

    // Rejoin room on reconnect
    useEffect(() => {
        if (!socket) return;

        const rejoinRoom = () => {
            if (joinedGlobalRoomRef.current) {
                socket.emit('joinGlobalChat');
            }
        };

        socket.on('connect', rejoinRoom);
        socket.on('reconnect', rejoinRoom);

        return () => {
            socket.off('connect', rejoinRoom);
            socket.off('reconnect', rejoinRoom);
        };
    }, [socket]);

    // Listen for new global chat messages
    useEffect(() => {
        if (!socket) return;

        const handleNewMessage = (incoming) => {
            if (!incoming) return;

            // Normalize archived messages - check boolean archived status
            const isArchived = incoming.archived === true || incoming.isArchived === true;
            const normalizedMessage = {
                ...incoming,
                createdAt: incoming.createdAt || new Date().toISOString(),
                ...(isArchived ? {
                    archived: true,
                    isArchived: true,
                    message: 'This message was deleted',
                    messageType: 'text'
                } : {})
            };

            setMessages((prev) => {
                const merged = mergeMessages(prev, [normalizedMessage]);
                return merged;
            });
        };

        const handleMessageArchived = (data) => {
            if (!data || !data.messageId) return;
            
            setMessages((prev) => {
                // Update the message to show as deleted (works for all users in real-time)
                return prev.map(msg => {
                    if (msg._id === data.messageId) {
                        return {
                            ...msg,
                            archived: true,
                            isArchived: true,
                            message: 'This message was deleted',
                            messageType: 'text'
                        };
                    }
                    return msg;
                });
            });
        };

        socket.on('globalchat:new', handleNewMessage);
        socket.on('globalchat:archived', handleMessageArchived);

        return () => {
            socket.off('globalchat:new', handleNewMessage);
            socket.off('globalchat:archived', handleMessageArchived);
        };
    }, [socket]);

    const setInitialMessages = useCallback((newMessages) => {
        if (!Array.isArray(newMessages)) return;
        
        // Normalize archived messages before merging - check boolean archived status
        const normalizedMessages = newMessages.map(msg => {
            // Check multiple possible field names and values for archived status
            const isArchived = msg.archived === true || 
                             msg.archived === 'true' ||
                             String(msg.archived) === 'true' ||
                             msg.isArchived === true || 
                             msg.isArchived === 'true' ||
                             String(msg.isArchived) === 'true' ||
                             msg.status === 'archived';
            
            // If archived, replace message content with deleted text
            if (isArchived) {
                return {
                    ...msg,
                    archived: true,
                    isArchived: true,
                    message: 'This message was deleted',
                    messageType: 'text'
                };
            }
            return msg;
        });
        
        setMessages((prev) => {
            const merged = mergeMessages(prev, normalizedMessages);
            return merged;
        });
    }, []);

    const getMessages = useCallback(() => {
        return messages;
    }, [messages]);

    const value = useMemo(() => ({
        getMessages,
        setInitialMessages,
        ensureGlobalRoom
    }), [getMessages, setInitialMessages, ensureGlobalRoom]);

    return (
        <GlobalChatContext.Provider value={value}>
            {children}
        </GlobalChatContext.Provider>
    );
};

export const useGlobalChatStore = () => {
    const context = useContext(GlobalChatContext);
    if (!context) {
        throw new Error('useGlobalChatStore must be used within a GlobalChatProvider');
    }
    return context;
};

