import React, { useState, useEffect, useRef } from 'react';
import './TaskChat.css';
import { Card, Avatar, Input, Spin, Button, Popover, Modal } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { selectUserId, selectUser } from '../../../store/slices/authSlice';
import { useLazyGetTaskChatMessagesQuery, useAddTaskChatMutation } from '../../../store/api';
import { useNotification } from '../../../contexts/NotificationContext';
import { useTaskChatStore } from '../../../contexts/TaskChatContext';
import { BsSend, BsEmojiSmile, BsX, BsPaperclip } from 'react-icons/bs';
import EmojiPicker from 'emoji-picker-react';
import { uploadToCloudinary, isCloudinaryImageUrl, isCloudinaryVideoUrl, isCloudinaryFileUrl, toAttachmentUrl, toPdfThumbnail } from '../../../utils/cloudinary';

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
    const { getMessagesForTask, setInitialMessages, ensureTaskRoom } = useTaskChatStore();

    const [chatMessage, setChatMessage] = useState('');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [preview, setPreview] = useState({ open: false, url: '', type: 'image' });
    const [batchPicker, setBatchPicker] = useState({ open: false, items: [] }); // items: {id, file, url, type, progress, uploadedUrl}
    const imageInputRef = useRef(null);
    const videoInputRef = useRef(null);
    const mediaMultiInputRef = useRef(null);
    const docInputRef = useRef(null);

    // Size limits (in MB)
    const MAX_IMAGE_MB = 10;        // ~10MB
    const MAX_VIDEO_MB = 100;       // ~100MB
    const MAX_DOC_MB = 25;          // ~25MB

    const bytesToMb = (bytes) => bytes / (1024 * 1024);
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

    // Fetch chat messages for this task only once (initial load / manual refetch)
    const [
        fetchTaskChatMessages,
        { data: chatMessagesData, isFetching: isChatLoading, error: chatError }
    ] = useLazyGetTaskChatMessagesQuery();

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

    // Ensure we're subscribed to this task's socket room
    useEffect(() => {
        if (!taskId) return;
        ensureTaskRoom(taskId);
    }, [ensureTaskRoom, taskId]);

    // Load chat history for the active task once (or whenever taskId changes)
    useEffect(() => {
        if (taskId) {
            fetchTaskChatMessages(taskId);
        }
    }, [taskId, fetchTaskChatMessages]);

    // Update local chat messages when API data changes
    useEffect(() => {
        const payload = chatMessagesData?.data;

        if (!payload) return;

        // Ensure we only process messages for the CURRENT taskId to avoid race conditions
        const incomingTaskId = chatMessagesData?.taskId || taskId;
        if (incomingTaskId !== taskId) return;

        const baseMessages = Array.isArray(payload)
            ? payload
            : payload.messages || [];

        const processedMessages = customMessageFilter
            ? customMessageFilter(baseMessages)
            : baseMessages;

        const sortedMessages = [...processedMessages].sort((a, b) => {
            const dateA = new Date(a.createdAt);
            const dateB = new Date(b.createdAt);
            return dateA - dateB;
        });

        setInitialMessages(taskId, sortedMessages);
    }, [chatMessagesData, customMessageFilter, setInitialMessages, taskId]);

    const taskChatMessages = getMessagesForTask(taskId);

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

    const handleSendMessage = async (overrideText) => {
        const textToSend = (overrideText ?? chatMessage).trim();
        if (!textToSend || !taskId || !receiverId || isSendingChat) {
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

            const payload = {
                taskId,
                senderId: userId,
                receiverId,
                userName,
                message: textToSend,
                time: currentTime,
                createdAt: new Date().toISOString()
            };

            // Send to API for persistence
            await addTaskChat(payload).unwrap();

            if (overrideText === undefined) {
                setChatMessage('');
            }
            // showSuccess('Message sent successfully!');

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
        // Keep emoji picker open for multiple selections
        // setShowEmojiPicker(false); // Removed this line
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

            // Directly send as a regular message with the URL (backend unchanged)
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
                // Upload
                const res = await uploadToCloudinary(it.file, it.type);
                it.uploadedUrl = res.secure_url;
                it.progress = 100;
                setBatchPicker(prev => ({ open: true, items: [...items] }));
                // Send after each upload to preserve order
                if (it.uploadedUrl) {
                    await handleSendMessage(it.uploadedUrl);
                }
            }
            // cleanup
            setBatchPicker({ open: false, items: [] });
        } catch (e) {
            showError(e?.message || 'Upload failed');
        } finally {
            setIsUploading(false);
        }
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

    // Handle download for high-quality files
    const handleDownload = async (url, type = 'image') => {
        try {
            if (!url || typeof url !== 'string') {
                showError('Invalid file URL');
                return;
            }

            // Get filename from URL or generate one based on type
            const urlParts = url.split('/');
            let filename = urlParts[urlParts.length - 1].split('?')[0];

            // Extract extension from URL or use default based on type
            if (!filename || !filename.includes('.')) {
                const extension = type === 'image' ? 'jpg' : type === 'video' ? 'mp4' : type === 'file' ? 'pdf' : 'jpg';
                filename = `download_${Date.now()}.${extension}`;
            }

            // Use the original message URL directly (no modifications)
            const downloadUrl = url;

            // Fetch the file as blob to force download (not open in browser)
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

            // Create blob URL and trigger download
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = filename; // This forces download instead of opening
            link.style.display = 'none'; // Hide the link
            document.body.appendChild(link);
            link.click();

            // Cleanup
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
            // Detect PDFs first to avoid misclassifying /image/upload/*.pdf as an image
            const isPdf = /\.pdf$/i.test(msg.message);
            const asImage = !isPdf && isCloudinaryImageUrl(msg.message);
            const asVideo = !isPdf && !asImage && isCloudinaryVideoUrl(msg.message);
            const asFile = isPdf || (!asImage && !asVideo && isCloudinaryFileUrl(msg.message));
            const pdfThumb = isPdf ? toPdfThumbnail(msg.message, 260) : null;

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
                            {asImage ? (
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
                                        // Try inline preview via <object>. If browser can't render, it falls back to the link
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
                    onPressEnter={() => handleSendMessage()}
                    className="comment-input"
                    disabled={isSendingChat}
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
                                content={(
                                    <div className="attach-menu">
                                        <Button
                                            type="text"
                                            className="attach-menu-item"
                                            onClick={handlePickImage}
                                        >
                                            Photo
                                        </Button>
                                        <Button
                                            type="text"
                                            className="attach-menu-item"
                                            onClick={handlePickVideo}
                                        >
                                            Video
                                        </Button>
                                        <Button
                                            type="text"
                                            className="attach-menu-item"
                                            onClick={handlePickDoc}
                                        >
                                            Document
                                        </Button>
                                        {/* Multiple option removed: Photo/Video now support multi-select with preview */}
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
                            // Upload PDFs and office docs as 'image' resource to allow inline viewing on Cloudinary
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
                                    src={item.url}
                                    alt="sel"
                                    style={{ cursor: 'zoom-in' }}
                                    onClick={() => setPreview({ open: true, url: item.url, type: 'image' })}
                                />
                            ) : (
                                <video
                                    src={item.url}
                                    style={{ cursor: 'zoom-in' }}
                                    onClick={() => setPreview({ open: true, url: item.url, type: 'video' })}
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
                zIndex={1100}
                bodyStyle={{ textAlign: 'center', background: 'var(--card-bg)' }}
            >
                {preview.type === 'image' ? (
                    <img src={preview.url} alt="preview" style={{ maxWidth: '100%', borderRadius: 8 }} />
                ) : (
                    <video src={preview.url} style={{ maxWidth: '100%', borderRadius: 8 }} controls autoPlay />
                )}
            </Modal>
        </Card>
    );
};

export default TaskChat;
