import React, { useState, useEffect, useRef } from 'react';
import './TaskChat.css';
import { Card, Avatar, Input, Spin, Button } from 'antd';
import { useSelector } from 'react-redux';
import { selectUserId, selectUser } from '../../../store/slices/authSlice';
import { useGetUserChatMessagesQuery, useAddTaskChatMutation } from '../../../store/api';
import { useNotification } from '../../../contexts/NotificationContext';
import { useSocket } from '../../../contexts/SocketContext';
import { BsSend, BsEmojiSmile, BsX } from 'react-icons/bs';
import EmojiPicker from 'emoji-picker-react';

const TaskChat = ({
    taskId,
    receiverId,
    className = '',
    title = "Task Related Chat",
    placeholder = "Add a comment...",
    showTitle = true,
    height = '500px',
    onMessageSent = null,
    customMessageFilter = null
}) => {
    const userId = useSelector(selectUserId);
    const user = useSelector(selectUser);
    const { socket } = useSocket();

    const [chatMessage, setChatMessage] = useState('');
    const [taskChatMessages, setTaskChatMessages] = useState([]);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    // Fetch user's chat messages from API
    const { data: chatMessagesData, isLoading: isChatLoading, error: chatError, refetch: refetchChat } = useGetUserChatMessagesQuery(userId);

    // Add task chat mutation
    const [addTaskChat, { isLoading: isSendingChat }] = useAddTaskChatMutation();

    // Get notification functions with fallbacks
    let showSuccess, showError;
    try {
        const notification = useNotification();
        showSuccess = notification?.success || ((message) => console.log('Success:', message));
        showError = notification?.error || ((message) => console.error('Error:', message));
    } catch (error) {
        // Fallback if notification context is not available
        showSuccess = (message) => console.log('Success:', message);
        showError = (message) => console.error('Error:', message);
    }

    const chatEndRef = useRef(null);
    const emojiPickerRef = useRef(null);

    // Socket.IO integration for real-time chat
    useEffect(() => {
        if (!socket || !taskId) return;

        // Join task-specific room
        socket.emit('join-task-room', { taskId });

        // Listen for new messages
        const handleNewMessage = (messageData) => {
            if (messageData.taskId === taskId) {
                setTaskChatMessages(prev => [...prev, messageData]);
            }
        };

        socket.on('new-message', handleNewMessage);

        return () => {
            socket.emit('leave-task-room', { taskId });
            socket.off('new-message', handleNewMessage);
        };
    }, [socket, taskId]);

    // Update local chat messages when API data changes
    useEffect(() => {
        if (chatMessagesData?.data) {
            let filteredMessages;

            if (customMessageFilter) {
                filteredMessages = customMessageFilter(chatMessagesData.data);
            } else {
                // Default: filter messages for this specific task
                filteredMessages = chatMessagesData.data.filter(msg => msg.taskId === taskId);
            }

            // Sort by createdAt date, oldest first (so latest appears at bottom)
            const sortedMessages = filteredMessages.sort((a, b) => {
                const dateA = new Date(a.createdAt);
                const dateB = new Date(b.createdAt);
                return dateA - dateB;
            });

            setTaskChatMessages(sortedMessages);
        }
    }, [chatMessagesData, taskId, customMessageFilter]);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        if (chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [taskChatMessages]);

    // Close emoji picker when clicking outside (but not when typing in input)
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
                // Don't close if clicking on the input field or emoji button
                const isInputField = event.target.closest('.comment-input-wrapper');
                const isEmojiButton = event.target.closest('.emoji-button');

                if (!isInputField && !isEmojiButton) {
                    setShowEmojiPicker(false);
                }
            }
        };

        if (showEmojiPicker) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showEmojiPicker]);

    const handleSendMessage = async () => {
        if (!chatMessage.trim() || !taskId || !receiverId || isSendingChat) {
            return;
        }

        try {
            // Format the time
            const currentTime = new Date().toLocaleString('en-US', {
                hour: 'numeric',
                minute: 'numeric',
                hour12: true,
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });

            // Get user's full name
            const userName = user?.firstName && user?.lastName
                ? `${user.firstName} ${user.lastName}`
                : user?.email || 'Unknown User';

            // Create message data
            const messageData = {
                taskId,
                senderId: userId,
                receiverId,
                userName,
                message: chatMessage,
                time: currentTime,
                createdAt: new Date().toISOString()
            };

            // Emit via socket for real-time updates
            if (socket) {
                socket.emit('send-message', messageData);
            }

            // Update local state immediately for instant UI feedback
            setTaskChatMessages(prev => [...prev, messageData]);

            // Send to API for persistence
            await addTaskChat(messageData).unwrap();

            setChatMessage('');
            // showSuccess('Message sent successfully!');

            // Call optional callback
            if (onMessageSent) {
                onMessageSent(messageData);
            }
        } catch (error) {
            showError(error?.data?.message || error?.message || 'Failed to send message');
            console.error('Error sending message:', error);
        }
    };

    const handleEmojiClick = (emojiData) => {
        setChatMessage(prev => prev + emojiData.emoji);
        // Keep emoji picker open for multiple selections
        // setShowEmojiPicker(false); // Removed this line
    };

    const toggleEmojiPicker = () => {
        setShowEmojiPicker(!showEmojiPicker);
    };

    // Function to detect and wrap emojis in spans for styling
    const formatMessageWithEmojis = (text) => {
        if (!text) return text;

        // Emoji regex pattern to match most emojis
        const emojiRegex = /(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/gu;

        return text.replace(emojiRegex, (emoji) => {
            return `<span class="emoji-large">${emoji}</span>`;
        });
    };

    const renderChatMessages = () => {
        if (isChatLoading) {
            return (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                    <Spin size="small" />
                </div>
            );
        }

        if (chatError) {
            return (
                <div className="empty-comments">
                    Error loading comments: {chatError?.data?.message || 'Failed to fetch comments'}
                </div>
            );
        }

        if (taskChatMessages.length === 0) {
            return (
                <div className="empty-comments">
                    No comments yet. Comments will appear here when available.
                </div>
            );
        }

        return taskChatMessages.map((msg) => {
            const isSent = msg.senderId === userId;

            return (
                <div
                    key={msg._id || `${msg.taskId}-${msg.senderId}-${msg.createdAt}`}
                    className={`chat-message ${isSent ? 'sent' : 'received'}`}
                    onDoubleClick={() => {
                        console.log('Double clicked message:', msg);
                        showSuccess(`Double clicked: "${msg.message}"`);
                    }}
                >
                    {!isSent && (
                        <Avatar className="message-avatar">
                            {msg.userName?.charAt(0) || msg.senderId?.charAt(0) || '?'}
                        </Avatar>
                    )}
                    <div className="message-content">
                        <div className="message-bubble">
                            <p
                                className="message-text"
                                dangerouslySetInnerHTML={{
                                    __html: formatMessageWithEmojis(msg.message)
                                }}
                            />
                            <div className="message-time">
                                {msg.time || new Date(msg.createdAt).toLocaleString('en-US', {
                                    hour: 'numeric',
                                    minute: 'numeric',
                                    hour12: true
                                })}
                            </div>
                        </div>
                        {!isSent && (
                            <div className="message-sender">
                                {msg.userName || msg.senderId || 'Unknown User'}
                            </div>
                        )}
                    </div>
                    {isSent && (
                        <Avatar className="message-avatar sent-avatar">
                            {user?.firstName?.charAt(0) || user?.email?.charAt(0) || '?'}
                        </Avatar>
                    )}
                </div>
            );
        });
    };

    return (
        <Card
            title={showTitle ? title : null}
            className={`task-chat-card ${className}`}
        >
            <div className="comments-list" style={{ height, overflow: 'auto' }}>
                {renderChatMessages()}
                <div ref={chatEndRef} />
            </div>
            <div className="comment-input-wrapper">
                <div className="emoji-picker-container" ref={emojiPickerRef}>
                    {showEmojiPicker && (
                        <div className="emoji-picker-popup">
                            <div className="emoji-picker-header">
                                <span className="emoji-picker-title">Select Emojis</span>
                                <Button
                                    type="text"
                                    icon={<BsX />}
                                    onClick={() => setShowEmojiPicker(false)}
                                    className="emoji-picker-close"
                                    size="small"
                                />
                            </div>
                            <EmojiPicker
                                onEmojiClick={handleEmojiClick}
                                width={300}
                                height={320}
                                searchDisabled={false}
                                skinTonesDisabled={false}
                                previewConfig={{
                                    showPreview: true,
                                    defaultCaption: 'Pick an emoji!'
                                }}
                            />
                        </div>
                    )}
                </div>
                <Input
                    placeholder={placeholder}
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    onPressEnter={handleSendMessage}
                    className="comment-input"
                    disabled={isSendingChat}
                    addonBefore={
                        <Button
                            type="text"
                            icon={<BsEmojiSmile />}
                            onClick={toggleEmojiPicker}
                            className="emoji-button"
                            style={{
                                color: 'var(--brand-color)',
                                border: 'none',
                                background: 'transparent'
                            }}
                        />
                    }
                    suffix={
                        isSendingChat ? (
                            <Spin size="small" />
                        ) : (
                            <BsSend
                                onClick={handleSendMessage}
                                style={{
                                    cursor: chatMessage.trim() ? 'pointer' : 'not-allowed',
                                    fontSize: '16px',
                                    color: chatMessage.trim() ? 'var(--brand-color)' : 'var(--secondary-text)',
                                    transition: 'all 0.3s ease',
                                    opacity: chatMessage.trim() ? 1 : 0.5
                                }}
                            />
                        )
                    }
                />
            </div>
        </Card>
    );
};

export default TaskChat;
