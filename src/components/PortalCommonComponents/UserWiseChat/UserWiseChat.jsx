import React, { useState, useEffect, useRef } from 'react';
import './UserWiseChat.css';
import { Avatar, Input, Button, Spin, Empty, Badge, Modal, Menu, Dropdown, Checkbox, Drawer, List, Popconfirm } from 'antd';
import { BsSend, BsEmojiSmile, BsPaperclip, BsThreeDotsVertical, BsSearch, BsPlusCircle, BsTrash, BsPersonPlus, BsArrowLeft } from 'react-icons/bs';
import { useSelector } from 'react-redux';
import { selectUserId, selectUser } from '../../../store/slices/authSlice';
import {
    useGetUserConversationsQuery,
    useLazyGetConversationMessagesQuery,
    useSendUserChatMessageMutation,
    useGetAllUsersQuery,
    useCreateUserConversationMutation,
    useMarkMessagesReadMutation,
    useLazySearchChatsQuery,
    useDeleteConversationMutation,
    useAddGroupMemberMutation,
    useRemoveGroupMemberMutation
} from '../../../store/api';
import { useUserChat } from '../../../contexts/UserChatContext';
import EmojiPicker from 'emoji-picker-react';
import { useNotification } from '../../../contexts/NotificationContext';

const UserWiseChat = ({ height = '600px' }) => {
    const userId = useSelector(selectUserId);
    const user = useSelector(selectUser);
    const { notification } = useNotification();
    const { messages, setInitialMessages, addMessage, joinChat, activeConversationId } = useUserChat();

    const [inputValue, setInputValue] = useState('');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showNewChatModal, setShowNewChatModal] = useState(false);
    const [userSearchTerm, setUserSearchTerm] = useState('');
    const [newChatUser, setNewChatUser] = useState(null); // Store user for new chat
    const [isGroupMode, setIsGroupMode] = useState(false);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [groupName, setGroupName] = useState('');
    const [showChatDetails, setShowChatDetails] = useState(false);

    // Mutations & Lazy Queries
    const [markMessagesRead] = useMarkMessagesReadMutation();
    const [deleteConversation] = useDeleteConversationMutation();
    const [searchChats] = useLazySearchChatsQuery();
    const [addGroupMember] = useAddGroupMemberMutation();
    const [removeGroupMember] = useRemoveGroupMemberMutation();

    const messagesEndRef = useRef(null);

    // Fetch conversations
    const { data: conversationsData, isLoading: isConversationsLoading, refetch: refetchConversations } = useGetUserConversationsQuery(userId, {
        skip: !userId
    });

    // Lazy query for messages
    const [fetchMessages, { isFetching: isMessagesLoading }] = useLazyGetConversationMessagesQuery();

    // Send message mutation
    const [sendMessage, { isLoading: isSending }] = useSendUserChatMessageMutation();

    // Fetch all users for new chat modal
    const { data: allUsersData, isLoading: isUsersLoading } = useGetAllUsersQuery();

    // Create conversation mutation
    const [createConversation, { isLoading: isCreatingConversation }] = useCreateUserConversationMutation();

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Handle selecting a conversation
    const handleSelectConversation = async (conversationId) => {
        if (conversationId === activeConversationId) return;

        joinChat(conversationId);

        // Mark messages as read
        if (userId) {
            markMessagesRead({ conversationId, userId });
        }

        // Clear new chat mode if active
        if (newChatUser) {
            setNewChatUser(null);
            setInitialMessages([]);
        }

        try {
            const result = await fetchMessages({ conversationId, limit: 50, skip: 0 }).unwrap();
            setInitialMessages(result.data || []);
        } catch (error) {
            notification?.error('Failed to fetch messages');
        }
    };

    // Handle deleting a conversation
    const handleDeleteChat = async () => {
        if (!activeConversationId) return;
        try {
            await deleteConversation(activeConversationId).unwrap();
            notification?.success('Conversation deleted');
            joinChat(null); // Deselect
        } catch (error) {
            notification?.error('Failed to delete conversation');
        }
    };

    // Handle creating a group chat
    const handleCreateGroup = async () => {
        if (!groupName.trim() || selectedUsers.length === 0) return;

        try {
            const participants = [userId, ...selectedUsers];
            const conversationData = {
                participants,
                type: 'group',
                groupName
            };

            const response = await createConversation(conversationData).unwrap();
            const newConversationId = response?.data?._id || response?.data?.conversationId;

            if (newConversationId) {
                notification?.success('Group created successfully');
                setShowNewChatModal(false);
                setGroupName('');
                setSelectedUsers([]);
                setIsGroupMode(false);
                // Refetch conversations
                await refetchConversations();
                handleSelectConversation(newConversationId);
            }
        } catch (error) {
            notification?.error('Failed to create group');
        }
    };
    // Group Management Handlers
    const handleAddMember = async (targetUserId) => {
        if (!activeConversationId) return;
        try {
            await addGroupMember({ conversationId: activeConversationId, userId: targetUserId }).unwrap();
            notification?.success('Member added');
            setUserSearchTerm('');
        } catch (error) {
            notification?.error('Failed to add member');
        }
    };

    const handleRemoveMember = async (targetUserId) => {
        if (!activeConversationId) return;
        try {
            await removeGroupMember({ conversationId: activeConversationId, userId: targetUserId }).unwrap();
            notification?.success('Member removed');
        } catch (error) {
            notification?.error('Failed to remove member');
        }
    };

    const handleLeaveGroup = async () => {
        if (!activeConversationId) return;
        try {
            await removeGroupMember({ conversationId: activeConversationId, userId }).unwrap();
            notification?.success('Left group');
            setShowChatDetails(false);
            joinChat(null);
        } catch (error) {
            notification?.error('Failed to leave group');
        }
    };
    // Handle send message
    const handleSend = async () => {
        if (!inputValue.trim() || isSending || isCreatingConversation) return;

        // If we're in new chat mode (no active conversation but have a new chat user)
        if (!activeConversationId && newChatUser) {
            try {
                // Step 1: Create the conversation
                const conversationData = {
                    participants: [userId, newChatUser._id],
                    type: 'individual'
                };

                const convResponse = await createConversation(conversationData).unwrap();
                const newConversationId = convResponse?.data?._id || convResponse?.data?.conversationId;

                if (!newConversationId) {
                    notification?.error('Failed to create conversation');
                    return;
                }

                // Step 2: Send the message to the new conversation
                const messageData = {
                    conversationId: newConversationId,
                    senderId: userId,
                    message: inputValue,
                    messageType: 'text',
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                };

                await sendMessage(messageData).unwrap();
                setInputValue('');
                setNewChatUser(null); // Clear new chat mode

                // Refetch conversations to get the newly created one
                await refetchConversations();

                // Switch to the new conversation
                handleSelectConversation(newConversationId);
            } catch (error) {
                console.error('Error creating conversation:', error);
                notification?.error('Failed to send message');
            }
            return;
        }

        // Normal message send for existing conversation
        if (!activeConversationId) return;

        const messageData = {
            conversationId: activeConversationId,
            senderId: userId,
            message: inputValue,
            messageType: 'text',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        try {
            await sendMessage(messageData).unwrap();
            setInputValue('');
            // The message will be added to state via socket listener in UserChatContext
        } catch (error) {
            notification?.error('Failed to send message');
        }
    };

    // Handle Search
    const filteredConversations = conversationsData?.data?.filter(conv => {
        if (!searchTerm) return true;
        const participantName = getParticipantName(conv.participants);
        return participantName.toLowerCase().includes(searchTerm.toLowerCase());
        // Note: For full backend search, we would use the searchChats query result here
    });


    const handleEmojiClick = (emojiObject) => {
        setInputValue(prev => prev + emojiObject.emoji);
    };

    // Handle starting a new chat with a user
    const handleStartChat = async (targetUser) => {
        if (!targetUser || targetUser._id === userId) return;

        setShowNewChatModal(false);
        setUserSearchTerm('');

        // Check if conversation already exists
        const existingConv = conversationsData?.data?.find(conv =>
            conv.participants?.some(p => p._id === targetUser._id)
        );

        if (existingConv) {
            // Open existing conversation
            handleSelectConversation(existingConv._id);
        } else {
            // Set up new chat mode
            setNewChatUser(targetUser);
            setInitialMessages([]); // Clear messages for new chat
        }
    };

    const getParticipantName = (participants) => {
        if (!participants || !Array.isArray(participants)) return 'Unknown';
        let otherParticipant = participants.find(p => String(p._id) !== String(userId));

        // Fallback: Look up in allUsersData if details are missing
        if (otherParticipant && !otherParticipant.firstName && !otherParticipant.email && allUsersData?.data) {
            const foundUser = allUsersData.data.find(u => String(u._id) === String(otherParticipant._id));
            if (foundUser) otherParticipant = foundUser;
        }

        if (!otherParticipant) return 'Me';
        return `${otherParticipant.firstName || ''} ${otherParticipant.lastName || ''}`.trim() || otherParticipant.email || 'User';
    };

    const getParticipantAvatar = (participants) => {
        if (!participants || !Array.isArray(participants)) return '?';
        let otherParticipant = participants.find(p => String(p._id) !== String(userId));

        // Fallback
        if (otherParticipant && !otherParticipant.firstName && allUsersData?.data) {
            const foundUser = allUsersData.data.find(u => String(u._id) === String(otherParticipant._id));
            if (foundUser) otherParticipant = foundUser;
        }

        return otherParticipant?.firstName?.charAt(0) || '?';
    };

    const activeConversation = conversationsData?.data?.find(c => c._id === activeConversationId);

    // Determine the active user (either from conversation or new chat)
    const displayUser = newChatUser || (activeConversation?.participants?.find(p => p._id !== userId));

    // Filter users for new chat modal
    const filteredUsers = allUsersData?.data?.filter(u =>
        u._id !== userId &&
        (`${u.firstName} ${u.lastName}`.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
            u.email?.toLowerCase().includes(userSearchTerm.toLowerCase()))
    ) || [];

    return (
        <div className="user-wise-chat-container" style={{ height }}>
            {/* Sidebar */}
            <div className="chat-sidebar">
                <div className="sidebar-header">
                    <h3>Chats</h3>
                    <div style={{ marginTop: '10px' }}>
                        <Input
                            prefix={<BsSearch />}
                            placeholder="Search chats..."
                            variant="filled"
                            size="small"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                <div className="conversation-list">
                    {isConversationsLoading ? (
                        <div style={{ textAlign: 'center', padding: '20px' }}><Spin /></div>
                    ) : conversationsData?.data?.length > 0 ? (
                        conversationsData.data
                            .filter(c => getParticipantName(c.participants).toLowerCase().includes(searchTerm.toLowerCase()))
                            .map(conv => (
                                <div
                                    key={conv._id}
                                    className={`conversation-item ${activeConversationId === conv._id ? 'active' : ''}`}
                                    onClick={() => handleSelectConversation(conv._id)}
                                >
                                    <Avatar size="large" style={{ backgroundColor: 'var(--brand-color)' }}>
                                        {getParticipantAvatar(conv.participants)}
                                    </Avatar>
                                    <div className="conversation-info">
                                        <div className="conversation-header">
                                            <span className="conversation-name">{getParticipantName(conv.participants)}</span>
                                            <span className="conversation-time">
                                                {conv.lastMessage?.createdAt ? new Date(conv.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                            </span>
                                        </div>
                                        <div className="last-message">
                                            {conv.lastMessage?.message || 'Start a conversation'}
                                        </div>
                                    </div>
                                </div>
                            ))
                    ) : (
                        <Empty description="No conversations" style={{ marginTop: '40px' }} />
                    )}
                </div>
                {/* Footer with Add Chat button */}
                <div className="chat-sidebar-footer">
                    <button className="add-chat-btn" onClick={() => setShowNewChatModal(true)}>
                        <BsPlusCircle />
                    </button>
                </div>
            </div>

            {/* New Chat / Group Modal */}
            <Modal
                title={isGroupMode ? "Create Group Chat" : "Start New Chat"}
                open={showNewChatModal}
                onCancel={() => {
                    setShowNewChatModal(false);
                    setUserSearchTerm('');
                    setIsGroupMode(false);
                    setSelectedUsers([]);
                    setGroupName('');
                }}
                footer={isGroupMode ? [
                    <Button key="cancel" onClick={() => setIsGroupMode(false)}>Back</Button>,
                    <Button key="create" type="primary" onClick={handleCreateGroup} disabled={!groupName.trim() || selectedUsers.length === 0}>
                        Create Group
                    </Button>
                ] : null}
                width={500}
            >
                {!isGroupMode && (
                    <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Input
                            prefix={<BsSearch />}
                            placeholder="Search users..."
                            value={userSearchTerm}
                            onChange={e => setUserSearchTerm(e.target.value)}
                            style={{ width: '70%' }}
                        />
                        <Button
                            icon={<BsPersonPlus />}
                            onClick={() => setIsGroupMode(true)}
                        >
                            New Group
                        </Button>
                    </div>
                )}

                {isGroupMode && (
                    <div style={{ marginBottom: '16px' }}>
                        <Input
                            placeholder="Group Name"
                            value={groupName}
                            onChange={e => setGroupName(e.target.value)}
                            style={{ marginBottom: '12px' }}
                        />
                        <Input
                            prefix={<BsSearch />}
                            placeholder="Search users to add..."
                            value={userSearchTerm}
                            onChange={e => setUserSearchTerm(e.target.value)}
                        />
                    </div>
                )}

                <div className="user-list-container">
                    {isUsersLoading ? (
                        <div style={{ textAlign: 'center', padding: '20px' }}><Spin /></div>
                    ) : filteredUsers.length > 0 ? (
                        filteredUsers.map(u => (
                            <div
                                key={u._id}
                                className="user-selection-item"
                                onClick={() => {
                                    if (isGroupMode) {
                                        const isSelected = selectedUsers.includes(u._id);
                                        if (isSelected) {
                                            setSelectedUsers(prev => prev.filter(id => id !== u._id));
                                        } else {
                                            setSelectedUsers(prev => [...prev, u._id]);
                                        }
                                    } else {
                                        handleStartChat(u);
                                    }
                                }}
                            >
                                {isGroupMode && (
                                    <Checkbox
                                        checked={selectedUsers.includes(u._id)}
                                        style={{ marginRight: '12px' }}
                                        onClick={(e) => e.stopPropagation()}
                                        onChange={(e) => {
                                            const isChecked = e.target.checked;
                                            if (isChecked) {
                                                setSelectedUsers(prev => [...prev, u._id]);
                                            } else {
                                                setSelectedUsers(prev => prev.filter(id => id !== u._id));
                                            }
                                        }}
                                    />
                                )}
                                <Avatar style={{ backgroundColor: 'var(--brand-color)' }}>
                                    {u.firstName?.charAt(0) || u.email?.charAt(0) || '?'}
                                </Avatar>
                                <div className="user-selection-info">
                                    <span className="user-selection-name">
                                        {`${u.firstName || ''} ${u.lastName || ''}`.trim() || 'User'}
                                    </span>
                                    <span className="user-selection-email">{u.email}</span>
                                </div>
                            </div>
                        ))
                    ) : (
                        <Empty description="No users found" />
                    )}
                </div>
            </Modal>

            {/* Main Chat Area */}
            <div className="chat-main">
                {(activeConversationId && !activeConversation && !newChatUser) ? (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                        <Spin tip="Loading conversation..." />
                    </div>
                ) : (activeConversationId || newChatUser) ? (
                    <>
                        <div className="chat-header">
                            <Avatar style={{ backgroundColor: 'var(--brand-color)' }}>
                                {newChatUser ?
                                    (newChatUser.firstName?.charAt(0) || newChatUser.email?.charAt(0) || '?') :
                                    getParticipantAvatar(activeConversation?.participants || [])
                                }
                            </Avatar>
                            <div className="active-user-info">
                                <span className="active-user-name">
                                    {newChatUser ?
                                        `${newChatUser.firstName || ''} ${newChatUser.lastName || ''}`.trim() || newChatUser.email || 'User' :
                                        getParticipantName(activeConversation?.participants || [])
                                    }
                                </span>
                                <span className="active-user-status">online</span>
                            </div>
                            <div style={{ marginLeft: 'auto' }}>
                                <Dropdown
                                    menu={{
                                        items: [
                                            ...(activeConversation?.type === 'group' ? [{
                                                key: 'info',
                                                label: 'Group Info',
                                                icon: <BsPersonPlus />,
                                                onClick: () => setShowChatDetails(true)
                                            }] : []),
                                            {
                                                key: 'delete',
                                                label: 'Delete Conversation',
                                                icon: <BsTrash />,
                                                danger: true,
                                                onClick: handleDeleteChat
                                            }
                                        ]
                                    }}
                                    trigger={['click']}
                                >
                                    <BsThreeDotsVertical className="action-btn" />
                                </Dropdown>
                            </div>
                        </div>

                        <div className="messages-container">
                            {isMessagesLoading && messages.length === 0 ? (
                                <div style={{ textAlign: 'center' }}><Spin /></div>
                            ) : messages.length === 0 && newChatUser ? (
                                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--secondary-text)' }}>
                                    <p>Start a conversation with {newChatUser.firstName || 'this user'}</p>
                                </div>
                            ) : messages.length > 0 ? (
                                messages.map((msg, index) => (
                                    <div
                                        key={msg._id || index}
                                        className={`message-bubble ${msg.senderId === userId ? 'sent' : 'received'}`}
                                    >
                                        <div className="message-text">{msg.message}</div>
                                        <div className="message-footer">
                                            <span className="message-time">{msg.time || new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                    </div>
                                ))
                            ) : null}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className="chat-input-area">
                            <BsEmojiSmile
                                className="action-btn"
                                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            />
                            {showEmojiPicker && (
                                <div style={{ position: 'absolute', bottom: '70px', left: '20px', zIndex: 100 }}>
                                    <EmojiPicker onEmojiClick={handleEmojiClick} />
                                </div>
                            )}
                            <BsPaperclip className="action-btn" />
                            <Input
                                className="chat-input"
                                placeholder="Type a message..."
                                value={inputValue}
                                onChange={e => setInputValue(e.target.value)}
                                onPressEnter={handleSend}
                                disabled={isSending}
                            />
                            <Button
                                type="primary"
                                shape="circle"
                                icon={<BsSend />}
                                onClick={handleSend}
                                disabled={!inputValue.trim() || isSending}
                            />
                        </div>
                    </>
                ) : (
                    <div className="no-chat-selected">
                        <div className="no-chat-icon"><BsSend /></div>
                        <h2>Select a conversation</h2>
                        <p>Pick a chat from the left to start messaging</p>
                    </div>
                )}
            </div>
            {/* Chat Details Drawer for Groups */}
            <Drawer
                title="Group Info"
                placement="right"
                onClose={() => setShowChatDetails(false)}
                open={showChatDetails}
                width={350}
            >
                {activeConversation && (
                    <div className="chat-details-content">
                        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                            <Avatar size={64} style={{ backgroundColor: 'var(--brand-color)', fontSize: '24px' }}>
                                {activeConversation.groupName?.[0] || 'G'}
                            </Avatar>
                            <h3 style={{ marginTop: '10px', marginBottom: '4px' }}>{activeConversation.groupName}</h3>
                            <span style={{ color: 'var(--secondary-text)' }}>{activeConversation.participants?.length} participants</span>
                        </div>

                        <div className="group-actions" style={{ marginBottom: '20px' }}>
                            <Button danger block icon={<BsTrash />} onClick={handleLeaveGroup}>Leave Group</Button>
                        </div>

                        <h4>Add Member</h4>
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                            <Input
                                placeholder="Search user to add..."
                                value={userSearchTerm}
                                onChange={e => setUserSearchTerm(e.target.value)}
                            />
                        </div>
                        {userSearchTerm && (
                            <List
                                className="search-results-list"
                                size="small"
                                bordered
                                dataSource={filteredUsers}
                                renderItem={u => (
                                    <List.Item actions={[<Button type="link" size="small" onClick={() => handleAddMember(u._id)}>Add</Button>]}>
                                        <List.Item.Meta
                                            avatar={<Avatar size="small">{u.firstName?.[0]}</Avatar>}
                                            title={`${u.firstName} ${u.lastName}`}
                                        />
                                    </List.Item>
                                )}
                                style={{ marginBottom: '20px', maxHeight: '150px', overflow: 'auto' }}
                            />
                        )}

                        <h4>Members</h4>
                        <List
                            itemLayout="horizontal"
                            dataSource={activeConversation.participants}
                            renderItem={(item) => (
                                <List.Item
                                    actions={item._id !== userId ? [
                                        <Popconfirm title="Remove member?" onConfirm={() => handleRemoveMember(item._id)}>
                                            <Button type="text" danger size="small">Remove</Button>
                                        </Popconfirm>
                                    ] : []}
                                >
                                    <List.Item.Meta
                                        avatar={<Avatar style={{ backgroundColor: 'var(--brand-color)' }}>{item.firstName?.[0]}</Avatar>}
                                        title={
                                            <span>
                                                {`${item.firstName} ${item.lastName}`}
                                                {item._id === userId && <span style={{ color: 'var(--secondary-text)', fontSize: '12px' }}> (You)</span>}
                                            </span>
                                        }
                                        description={item.email}
                                    />
                                </List.Item>
                            )}
                        />
                    </div>
                )}
            </Drawer>
        </div>
    );
};

export default UserWiseChat;
