import React, { useState, useEffect, useRef } from 'react';
import './GlobalChat.css';
import { Card, Avatar, Input, Spin, Button, Popover, Modal, Popconfirm } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { selectUserId, selectUser } from '../../../store/slices/authSlice';
import { useLazyGetRecentGlobalChatMessagesQuery, useAddGlobalChatMutation, useArchiveGlobalChatMessageMutation } from '../../../store/api';
import { useNotification } from '../../../contexts/NotificationContext';
import { useGlobalChatStore } from '../../../contexts/GlobalChatContext';
import { BsSend, BsEmojiSmile, BsX, BsPaperclip } from 'react-icons/bs';
import { AiOutlineDelete } from 'react-icons/ai';
import EmojiPicker from 'emoji-picker-react';
import { uploadToCloudinary, isCloudinaryImageUrl, isCloudinaryVideoUrl, isCloudinaryFileUrl, toAttachmentUrl, toPdfThumbnail } from '../../../utils/cloudinary';
import EmptyState from '../../CommonComponents/EmptyState/EmptyState';

const GlobalChat = ({
    className = '',
    title = "Global Chat",
    placeholder = "Type a message to everyone...",
    showTitle = true,
    height = '500px',
    onMessageSent = null
}) => {
    const userId = useSelector(selectUserId);
    const user = useSelector(selectUser);
    const { getMessages, setInitialMessages, ensureGlobalRoom } = useGlobalChatStore();
    const [deleteConfirmVisible, setDeleteConfirmVisible] = useState({});

    const [chatMessage, setChatMessage] = useState('');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [preview, setPreview] = useState({ open: false, url: '', type: 'image' });
    const [batchPicker, setBatchPicker] = useState({ open: false, items: [] });
    const [deletingMessageId, setDeletingMessageId] = useState(null);
    const imageInputRef = useRef(null);
    const videoInputRef = useRef(null);
    const docInputRef = useRef(null);

    // Size limits (in MB)
    const MAX_IMAGE_MB = 10;
    const MAX_VIDEO_MB = 100;
    const MAX_DOC_MB = 25;

    const bytesToMb = (bytes) => bytes / (1024 * 1024);

    // Get notification functions with fallbacks
    let showSuccess, showError;
    try {
        const notification = useNotification();
        showSuccess = notification?.success || ((message) => console.log('Success:', message));
        showError = notification?.error || ((message) => console.error('Error:', message));
    } catch (error) {
        showSuccess = (message) => console.log('Success:', message);
        showError = (message) => console.error('Error:', message);
    }

    const validateFileSize = (file, type) => {
        const sizeMb = bytesToMb(file.size);
        if (type === 'image' && sizeMb > MAX_IMAGE_MB) {
            showError(`Image too large. Max ${MAX_IMAGE_MB} MB`);
            return false;
        }
        if (type === 'video' && sizeMb > MAX_VIDEO_MB) {
            showError(`Video too large. Max ${MAX_VIDEO_MB} MB`);
            return false;
        }
        if (type === 'raw' && sizeMb > MAX_DOC_MB) {
            showError(`Document too large. Max ${MAX_DOC_MB} MB`);
            return false;
        }
        return true;
    };

    // Fetch recent global chat messages
    const [
        fetchGlobalChatMessages,
        { data: chatMessagesData, isFetching: isChatLoading, error: chatError }
    ] = useLazyGetRecentGlobalChatMessagesQuery();

    // Add global chat mutation
    const [addGlobalChat, { isLoading: isSendingChat }] = useAddGlobalChatMutation();

    // Archive global chat message mutation
    const [archiveGlobalChatMessage, { isLoading: isArchiving }] = useArchiveGlobalChatMessageMutation();

    const chatEndRef = useRef(null);
    const emojiPickerRef = useRef(null);
    const previousMessagesLengthRef = useRef(0);

    // Ensure we're subscribed to global chat room
    useEffect(() => {
        ensureGlobalRoom();
    }, [ensureGlobalRoom]);

    // Load chat history on mount
    useEffect(() => {
        fetchGlobalChatMessages({ count: 100 });
    }, [fetchGlobalChatMessages]);

    // Update local chat messages when API data changes
    useEffect(() => {
        const payload = chatMessagesData?.data;
        if (!payload || !Array.isArray(payload)) return;

        // Normalize archived messages - if message is archived, show deleted text
        const normalizedMessages = payload.map(msg => {
            // Check if message is archived (boolean status)
            // Check multiple possible field names and values
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

        const sortedMessages = [...normalizedMessages].sort((a, b) => {
            const dateA = new Date(a.createdAt || 0);
            const dateB = new Date(b.createdAt || 0);
            return dateA - dateB;
        });

        setInitialMessages(sortedMessages);
    }, [chatMessagesData, setInitialMessages]);

    const globalChatMessages = getMessages();

    // Auto-scroll to bottom only when NEW messages are added (not when messages are updated/deleted)
    useEffect(() => {
        const currentLength = globalChatMessages.length;
        const previousLength = previousMessagesLengthRef.current;

        // Only scroll if a new message was added (length increased)
        if (currentLength > previousLength && chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }

        // Update ref for next comparison
        previousMessagesLengthRef.current = currentLength;
    }, [globalChatMessages]);

    // Close emoji picker when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
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

    const handleSendMessage = async (overrideText) => {
        const textToSend = (overrideText ?? chatMessage).trim();
        if (!textToSend || !userId || isSendingChat) {
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
            const senderName = user?.firstName && user?.lastName
                ? `${user.firstName} ${user.lastName}`
                : user?.email || 'Unknown User';

            // Detect message type
            let messageType = 'text';
            if (isCloudinaryImageUrl(textToSend)) {
                messageType = 'image';
            } else if (isCloudinaryVideoUrl(textToSend)) {
                messageType = 'video';
            } else if (isCloudinaryFileUrl(textToSend)) {
                messageType = 'file';
            }

            const payload = {
                senderId: userId,
                senderName,
                senderEmail: user?.email || '',
                message: textToSend,
                messageType,
                time: currentTime
            };

            // Send to API for persistence
            await addGlobalChat(payload).unwrap();

            if (overrideText === undefined) {
                setChatMessage('');
            }

            // Call optional callback
            if (onMessageSent) {
                onMessageSent(payload);
            }
        } catch (error) {
            showError(error?.data?.message || error?.message || 'Failed to send message');
            console.error('Error sending message:', error);
        }
    };

    const handleEmojiClick = (emojiData) => {
        setChatMessage(prev => prev + emojiData.emoji);
    };

    const toggleEmojiPicker = () => {
        setShowEmojiPicker(!showEmojiPicker);
    };

    const handlePickImage = () => imageInputRef.current?.click();
    const handlePickVideo = () => videoInputRef.current?.click();
    const handlePickDoc = () => docInputRef.current?.click();

    const handleUpload = async (file, type) => {
        try {
            setIsUploading(true);
            if (!validateFileSize(file, type)) {
                setIsUploading(false);
                return;
            }
            const res = await uploadToCloudinary(file, type);
            const url = res.secure_url;
            if (!url) throw new Error('No secure_url from Cloudinary');

            await handleSendMessage(url);
        } catch (e) {
            showError(e?.message || 'Upload failed');
        } finally {
            setIsUploading(false);
        }
    };

    const onSelectBatchFiles = (fileList) => {
        if (!fileList || !fileList.length) return;
        const items = Array.from(fileList)
            .filter((f) => {
                const t = f.type.startsWith('video') ? 'video' : 'image';
                return validateFileSize(f, t);
            })
            .map((f, idx) => ({
                id: `${Date.now()}-${idx}`,
                file: f,
                url: URL.createObjectURL(f),
                type: f.type.startsWith('video') ? 'video' : 'image',
                progress: 0,
                uploadedUrl: ''
            }));
        setBatchPicker({ open: true, items });
    };

    const uploadBatchAndSend = async () => {
        setIsUploading(true);
        try {
            const items = [...batchPicker.items];
            for (let i = 0; i < items.length; i++) {
                const it = items[i];
                const res = await uploadToCloudinary(it.file, it.type);
                it.uploadedUrl = res.secure_url;
                it.progress = 100;
                setBatchPicker(prev => ({ open: true, items: [...items] }));
                if (it.uploadedUrl) {
                    await handleSendMessage(it.uploadedUrl);
                }
            }
            setBatchPicker({ open: false, items: [] });
        } catch (e) {
            showError(e?.message || 'Upload failed');
        } finally {
            setIsUploading(false);
        }
    };

    // Handle delete message
    const handleDeleteMessage = async (messageId) => {
        if (!messageId || !userId) return;

        try {
            // Set deleting state for smooth transition
            setDeletingMessageId(messageId);

            // Call API with archived: true
            await archiveGlobalChatMessage({ messageId, userId, archived: true }).unwrap();

            // Wait for smooth transition (0.2 seconds)
            await new Promise(resolve => setTimeout(resolve, 200));

            // Update local state immediately (socket event will also update for real-time)
            const currentMessages = getMessages();
            const updatedMessages = currentMessages.map(msg => {
                if (msg._id === messageId) {
                    return { 
                        ...msg, 
                        archived: true,
                        isArchived: true,
                        message: 'This message was deleted',
                        messageType: 'text' // Ensure it's treated as text, not image/video/file
                    };
                }
                return msg;
            });
            setInitialMessages(updatedMessages);
            
            // Clear deleting state
            setDeletingMessageId(null);
            showSuccess('Message deleted successfully');
            
            // Note: Socket event 'globalchat:archived' will also update the message for real-time sync
            // No need to refetch, socket will handle real-time updates for all users
        } catch (error) {
            setDeletingMessageId(null);
            showError(error?.data?.message || error?.message || 'Failed to delete message');
            console.error('Error deleting message:', error);
        }
    };

    // Function to detect and wrap emojis in spans for styling
    const formatMessageWithEmojis = (text) => {
        if (!text) return text;
        const emojiRegex = /(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/gu;
        return text.replace(emojiRegex, (emoji) => {
            return `<span class="emoji-large">${emoji}</span>`;
        });
    };

    // Handle download for high-quality files
    const handleDownload = async (url, type = 'image') => {
        try {
            if (!url || typeof url !== 'string') {
                showError('Invalid file URL');
                return;
            }

            const urlParts = url.split('/');
            let filename = urlParts[urlParts.length - 1].split('?')[0];

            if (!filename || !filename.includes('.')) {
                const extension = type === 'image' ? 'jpg' : type === 'video' ? 'mp4' : type === 'file' ? 'pdf' : 'jpg';
                filename = `download_${Date.now()}.${extension}`;
            }

            const downloadUrl = url;
            const response = await fetch(downloadUrl, {
                method: 'GET',
                mode: 'cors',
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const blob = await response.blob();

            if (!blob || blob.size === 0) {
                throw new Error('Empty file received');
            }

            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = filename;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();

            setTimeout(() => {
                document.body.removeChild(link);
                window.URL.revokeObjectURL(blobUrl);
            }, 100);

            showSuccess('File downloaded successfully!');
        } catch (error) {
            console.error('Download error:', error);
            showError(`Failed to download file: ${error.message || 'Please try right-clicking the image and "Save As"'}`);
        }
    };

    const renderChatMessages = () => {
        if (isChatLoading) {
            return (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                    <Spin size="large" />
                    <p style={{ marginTop: '16px', color: 'var(--secondary-text)' }}>Loading messages...</p>
                </div>
            );
        }

        if (chatError) {
            return (
                <EmptyState
                    image="/Images/NoTaskAvaible.png"
                    title="Error Loading Messages"
                    description={chatError?.data?.message || 'Failed to fetch messages. Please try refreshing.'}
                    className="compact"
                />
            );
        }

        if (globalChatMessages.length === 0) {
            return (
                <EmptyState
                    image="/Images/NoTaskAvaible.png"
                    title="No Messages Yet"
                    description="Be the first to start the conversation! Type a message below to get started."
                    className="compact"
                />
            );
        }

        return globalChatMessages.map((msg) => {
            const isSent = msg.senderId === userId;
            // Check if message is archived (boolean status)
            // Check multiple possible field names and values
            const isArchived = msg.archived === true || 
                             msg.archived === 'true' ||
                             msg.isArchived === true || 
                             msg.isArchived === 'true' ||
                             msg.status === 'archived' ||
                             msg.message === 'This message was deleted';
            const isPdf = /\.pdf$/i.test(msg.message);
            // Don't treat archived messages as images/videos/files
            const asImage = !isArchived && !isPdf && isCloudinaryImageUrl(msg.message);
            const asVideo = !isArchived && !isPdf && !asImage && isCloudinaryVideoUrl(msg.message);
            const asFile = !isArchived && (isPdf || (!asImage && !asVideo && isCloudinaryFileUrl(msg.message)));
            const pdfThumb = isPdf ? toPdfThumbnail(msg.message, 260) : null;

            return (
                <div
                    key={msg._id || `${msg.senderId}-${msg.createdAt}`}
                    className={`chat-message ${isSent ? 'sent' : 'received'} ${isArchived ? 'archived' : ''}`}
                >
                    {!isSent && (
                        <Avatar className="message-avatar">
                            {msg.senderName?.charAt(0) || msg.senderId?.charAt(0) || '?'}
                        </Avatar>
                    )}
                    <div className="message-content">
                        <div className={`message-bubble ${deletingMessageId === msg._id ? 'deleting' : ''}`}>
                            {/* Always check archived status first, even if message text is already "This message was deleted" */}
                            {(isArchived || msg.message === 'This message was deleted') ? (
                                <p className="message-text deleted-message">
                                    This message was deleted
                                </p>
                            ) : deletingMessageId === msg._id ? (
                                <p className="message-text deleting-message">
                                    Deleting...
                                </p>
                            ) : asImage ? (
                                <div style={{ position: 'relative', display: 'inline-block' }}>
                                    <img
                                        src={msg.message}
                                        alt="chat-img"
                                        style={{ maxWidth: 260, borderRadius: 8, cursor: 'zoom-in' }}
                                        onClick={() => setPreview({ open: true, url: msg.message, type: 'image' })}
                                    />
                                    <Button
                                        type="primary"
                                        icon={<DownloadOutlined />}
                                        size="small"
                                        style={{
                                            position: 'absolute',
                                            top: 8,
                                            right: 8,
                                            zIndex: 10,
                                            boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                                        }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDownload(msg.message, 'image');
                                        }}
                                        title="Download high-quality image"
                                    />
                                </div>
                            ) : asVideo ? (
                                <div style={{ position: 'relative', display: 'inline-block' }}>
                                    <video
                                        src={msg.message}
                                        controls
                                        style={{ maxWidth: 260, borderRadius: 8, cursor: 'zoom-in' }}
                                        onClick={() => setPreview({ open: true, url: msg.message, type: 'video' })}
                                    />
                                    <Button
                                        type="primary"
                                        icon={<DownloadOutlined />}
                                        size="small"
                                        style={{
                                            position: 'absolute',
                                            top: 8,
                                            right: 8,
                                            zIndex: 10,
                                            boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                                        }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDownload(msg.message, 'video');
                                        }}
                                        title="Download high-quality video"
                                    />
                                </div>
                            ) : asFile ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {isPdf ? (
                                        <object data={msg.message} type="application/pdf" width={260} height={360} style={{ borderRadius: 8 }}>
                                            {pdfThumb ? (
                                                <a href={msg.message} target="_blank" rel="noreferrer">
                                                    <img src={pdfThumb} alt="PDF preview" style={{ maxWidth: 260, borderRadius: 8 }} />
                                                </a>
                                            ) : (
                                                <a
                                                    href={toAttachmentUrl(msg.message)}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    style={{ color: 'inherit', textDecoration: 'underline' }}
                                                >
                                                    Open PDF
                                                </a>
                                            )}
                                        </object>
                                    ) : (
                                        <a
                                            href={toAttachmentUrl(msg.message)}
                                            target="_blank"
                                            rel="noreferrer"
                                            style={{ color: 'inherit', textDecoration: 'underline' }}
                                        >
                                            Open document
                                        </a>
                                    )}
                                    <Button
                                        type="primary"
                                        icon={<DownloadOutlined />}
                                        size="small"
                                        onClick={() => handleDownload(msg.message, 'file')}
                                        style={{ alignSelf: 'flex-start' }}
                                    >
                                        Download
                                    </Button>
                                </div>
                            ) : (
                                <p
                                    className="message-text"
                                    dangerouslySetInnerHTML={{
                                        __html: formatMessageWithEmojis(msg.message)
                                    }}
                                />
                            )}
                            <div className="message-time">
                                {msg.time || new Date(msg.createdAt).toLocaleString('en-US', {
                                    hour: 'numeric',
                                    minute: 'numeric',
                                    hour12: true
                                })}
                            </div>
                            {isSent && !isArchived && (
                                <Popconfirm
                                    title="Delete this message?"
                                    description="This action cannot be undone."
                                    onConfirm={(e) => {
                                        e?.stopPropagation();
                                        handleDeleteMessage(msg._id);
                                        setDeleteConfirmVisible(prev => {
                                            const newState = { ...prev };
                                            delete newState[msg._id];
                                            return newState;
                                        });
                                    }}
                                    onCancel={(e) => {
                                        e?.stopPropagation();
                                        setDeleteConfirmVisible(prev => {
                                            const newState = { ...prev };
                                            delete newState[msg._id];
                                            return newState;
                                        });
                                    }}
                                    okText="Delete"
                                    cancelText="Cancel"
                                    okButtonProps={{ danger: true }}
                                    trigger="click"
                                    placement="topRight"
                                >
                                    <Button
                                        type="text"
                                        icon={<AiOutlineDelete />}
                                        className="message-delete-btn"
                                        size="small"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                        }}
                                        loading={isArchiving || deletingMessageId === msg._id}
                                        title="Delete message"
                                    />
                                </Popconfirm>
                            )}
                        </div>
                        {!isSent && (
                            <div className="message-sender">
                                {msg.senderName || msg.senderId || 'Unknown User'}
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
            className={`global-chat-card ${className}`}
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
                    onPressEnter={() => handleSendMessage()}
                    className="comment-input"
                    disabled={isSendingChat || isUploading}
                    addonBefore={
                        <div className="chat-input-tools">
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
                            <Popover
                                trigger="click"
                                placement="topLeft"
                                overlayClassName="chat-attach-popover"
                                getPopupContainer={(triggerNode) => triggerNode.parentElement || document.body}
                                content={(
                                    <div className="attach-menu" onClick={(e) => e.stopPropagation()}>
                                        <Button
                                            type="text"
                                            className="attach-menu-item"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                handlePickImage();
                                            }}
                                        >
                                            Photo
                                        </Button>
                                        <Button
                                            type="text"
                                            className="attach-menu-item"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                handlePickVideo();
                                            }}
                                        >
                                            Video
                                        </Button>
                                        <Button
                                            type="text"
                                            className="attach-menu-item"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                handlePickDoc();
                                            }}
                                        >
                                            Document
                                        </Button>
                                    </div>
                                )}
                            >
                                <Button
                                    type="text"
                                    icon={<BsPaperclip />}
                                    className="attach-button"
                                    style={{
                                        color: 'var(--primary-text)',
                                        border: 'none',
                                        background: 'transparent'
                                    }}
                                />
                            </Popover>
                        </div>
                    }
                    suffix={
                        (isSendingChat || isUploading) ? (
                            <Spin size="small" />
                        ) : (
                            <BsSend
                                onClick={() => handleSendMessage()}
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
                {/* Hidden file inputs */}
                <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    style={{ display: 'none' }}
                    onChange={(e) => {
                        const files = e.target.files;
                        if (files && files.length) onSelectBatchFiles(files);
                        e.target.value = '';
                    }}
                />
                <input
                    ref={videoInputRef}
                    type="file"
                    accept="video/*"
                    multiple
                    style={{ display: 'none' }}
                    onChange={(e) => {
                        const files = e.target.files;
                        if (files && files.length) onSelectBatchFiles(files);
                        e.target.value = '';
                    }}
                />
                <input
                    ref={docInputRef}
                    type="file"
                    accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                    style={{ display: 'none' }}
                    onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                            await handleUpload(file, 'image');
                        }
                        e.target.value = '';
                    }}
                />
            </div>
            {/* Batch preview modal */}
            <Modal
                open={batchPicker.open}
                onCancel={() => setBatchPicker({ open: false, items: [] })}
                footer={[
                    <Button key="cancel" onClick={() => setBatchPicker({ open: false, items: [] })}>Cancel</Button>,
                    <Button key="send" type="primary" loading={isUploading} onClick={uploadBatchAndSend} disabled={batchPicker.items.length === 0}>Send</Button>
                ]}
                title="Send media"
                centered
                width={720}
                zIndex={1000}
                bodyStyle={{ background: 'var(--card-bg)' }}
            >
                <div className="batch-grid">
                    {batchPicker.items.map(item => (
                        <div key={item.id} className="batch-item">
                            {item.type === 'image' ? (
                                <img
                                    src={item.uploadedUrl || item.url}
                                    alt="sel"
                                    style={{ cursor: 'zoom-in', width: '100%', height: '100%', objectFit: 'cover' }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setPreview({ open: true, url: item.uploadedUrl || item.url, type: 'image' });
                                    }}
                                />
                            ) : (
                                <video
                                    src={item.uploadedUrl || item.url}
                                    style={{ cursor: 'zoom-in', width: '100%', height: '100%', objectFit: 'cover' }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setPreview({ open: true, url: item.uploadedUrl || item.url, type: 'video' });
                                    }}
                                />
                            )}
                            {isUploading && (
                                <div className="batch-progress">
                                    <div className="bar" style={{ width: `${item.progress}%` }} />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </Modal>
            {/* Fullscreen preview */}
            <Modal
                open={preview.open}
                onCancel={() => setPreview({ open: false, url: '', type: 'image' })}
                footer={[
                    <Button
                        key="download"
                        type="primary"
                        icon={<DownloadOutlined />}
                        onClick={() => handleDownload(preview.url, preview.type)}
                        size="large"
                    >
                        Download High Quality
                    </Button>
                ]}
                centered
                width={700}
                zIndex={2000}
                maskClosable={true}
                closable={true}
                bodyStyle={{ textAlign: 'center', background: 'var(--card-bg)', padding: '20px' }}
            >
                {preview.type === 'image' ? (
                    <img
                        src={preview.url}
                        alt="preview"
                        style={{
                            maxWidth: '100%',
                            maxHeight: '70vh',
                            borderRadius: 8,
                            objectFit: 'contain'
                        }}
                    />
                ) : (
                    <video
                        src={preview.url}
                        style={{
                            maxWidth: '100%',
                            maxHeight: '70vh',
                            borderRadius: 8
                        }}
                        controls
                        autoPlay
                    />
                )}
            </Modal>
        </Card>
    );
};

export default GlobalChat;

