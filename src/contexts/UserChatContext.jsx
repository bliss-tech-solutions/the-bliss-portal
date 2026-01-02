import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useSocket } from './SocketContext';
import { useSelector } from 'react-redux';
import { selectUserId } from '../store/slices/authSlice';
import { useNotification } from './NotificationContext';

const UserChatContext = createContext({
    messages: [],
    conversations: [],
    activeConversationId: null,
    setActiveConversationId: () => { },
    setInitialMessages: () => { },
    addMessage: () => { },
    joinChat: () => { }
});

export const UserChatProvider = ({ children }) => {
    const { socket } = useSocket();
    const userId = useSelector(selectUserId);
    const notification = useNotification();

    const [messages, setMessages] = useState([]);
    const [activeConversationId, setActiveConversationId] = useState(null);
    const joinedRoomsRef = useRef(new Set());

    const joinChat = useCallback((conversationId) => {
        if (!socket || !conversationId) return;

        socket.emit('joinConversation', conversationId);
        setActiveConversationId(conversationId);
        joinedRoomsRef.current.add(conversationId);

        // Clear messages when switching conversations (optional, depending on how you want to handle state)
        // setMessages([]); 
    }, [socket]);

    useEffect(() => {
        if (!socket) return;

        const handleNewMessage = (newMessage) => {
            if (!newMessage) return;

            // Update messages if it's the active conversation
            if (newMessage.conversationId === activeConversationId) {
                setMessages((prev) => {
                    // Avoid duplicates
                    if (prev.some(m => m._id === newMessage._id)) return prev;
                    return [...prev, newMessage];
                });
            }
        };

        const handleNotification = (notification) => {
            if (!notification) return;

            // Show toast or play sound if not currently in that chat
            if (notification.conversationId !== activeConversationId) {
                console.log('New message in:', notification.conversationId);

                try {
                    const audio = new Audio('/NotificationSoundFile/IOSNotification.mp3');
                    audio.play().catch(err => console.log('Audio play blocked:', err));
                } catch (e) {
                    console.error('Error playing sound:', e);
                }

                if (notification?.success) {
                    notification.success('You have a new message');
                }
            }
        };


        socket.on('userchat:message', handleNewMessage);
        socket.on('userchat:notification', handleNotification);

        return () => {
            socket.off('userchat:message', handleNewMessage);
            socket.off('userchat:notification', handleNotification);
        };
    }, [socket, activeConversationId, notification]);


    const setInitialMessages = useCallback((initialMessages) => {
        setMessages(initialMessages || []);
    }, []);

    const addMessage = useCallback((newMessage) => {
        setMessages((prev) => [...prev, newMessage]);
    }, []);

    const value = useMemo(() => ({
        messages,
        activeConversationId,
        setActiveConversationId,
        setInitialMessages,
        addMessage,
        joinChat
    }), [messages, activeConversationId, setInitialMessages, addMessage, joinChat]);

    return (
        <UserChatContext.Provider value={value}>
            {children}
        </UserChatContext.Provider>
    );
};

export const useUserChat = () => {
    const context = useContext(UserChatContext);
    if (!context) {
        throw new Error('useUserChat must be used within a UserChatProvider');
    }
    return context;
};
