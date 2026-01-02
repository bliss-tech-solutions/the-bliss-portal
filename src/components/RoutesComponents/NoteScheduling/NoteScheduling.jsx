import React, { useState, useEffect, useMemo } from 'react';
import { Button, Modal, Input, Select, Tag, Space, Card, Row, Col, Typography, Badge, Drawer, Divider, List, Avatar, message, Popconfirm, Image, Tooltip } from 'antd';
// No antd icons needed anymore
import { useSelector } from 'react-redux';
import { selectTheme } from '../../../store/slices/themeSlice';
import { selectUser, selectUserId } from '../../../store/slices/authSlice';
import {
    useCreateDailyWorkingTaskMutation,
    useGetUserDailyWorkingTasksQuery,
    useGetAllDailyWorkingTasksQuery,
    useUpdateDailyWorkingTaskMutation,
    useDeleteDailyWorkingTaskMutation,
    useGetAllClientsQuery,
} from '../../../store/api';
import { useNotification } from '../../../contexts/NotificationContext';
import {
    BsPlus,
    BsGrid,
    BsListUl,
    BsClock,
    BsThreeDots,
    BsTrash,
    BsFilter,
    BsChevronRight,
    BsImage,
    BsCalendar,
    BsFlag,
    BsType,
    BsLightningCharge,
    BsPaperclip,
} from 'react-icons/bs';
import dayjs from 'dayjs';
import { uploadToCloudinary } from '../../../utils/cloudinary';
import './NoteScheduling.css';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const NoteScheduling = () => {
    const theme = useSelector(selectTheme);
    const userId = useSelector(selectUserId);
    const user = useSelector(selectUser);
    const { showSuccess, showError } = useNotification();

    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isDrawerVisible, setIsDrawerVisible] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);
    const [viewMode, setViewMode] = useState('board');

    // Task Form State
    const [taskForm, setTaskForm] = useState({
        title: '',
        priority: 'Medium',
        status: 'Not Started',
        content: '',
        type: 'text',
        imageUrl: '',
    });

    const [editForm, setEditForm] = useState({
        title: '',
        status: '',
        priority: '',
        content: '',
        referenceData: [],
    });

    const [isUploading, setIsUploading] = useState(false);

    // Fetch clients
    const { data: clientsData } = useGetAllClientsQuery();
    const clients = clientsData?.data || [];

    // Handle Local Storage Persistence
    useEffect(() => {
        const savedDraft = localStorage.getItem('noteSchedulingDraft');
        if (savedDraft) {
            try {
                setTaskForm(JSON.parse(savedDraft));
            } catch (e) {
                console.error('Failed to load draft:', e);
            }
        }
    }, []);

    useEffect(() => {
        if (taskForm.title || taskForm.content || taskForm.clientName || taskForm.brochure) {
            localStorage.setItem('noteSchedulingDraft', JSON.stringify(taskForm));
        }
    }, [taskForm]);

    const handleClearDraft = () => {
        const freshForm = { title: '', priority: 'Medium', status: 'Not Started', content: '', type: 'text', imageUrl: '' };
        setTaskForm(freshForm);
        localStorage.removeItem('noteSchedulingDraft');
        message.info('Draft cleared');
    };

    const handleDeleteImage = () => {
        setTaskForm(prev => ({ ...prev, imageUrl: '', type: 'text' }));
        message.info('Image removed');
    };

    // Fetch tasks
    const { data: tasksData, isLoading, isError } = useGetUserDailyWorkingTasksQuery(userId, {
        skip: !userId
    });

    const [createTask] = useCreateDailyWorkingTaskMutation();
    const [updateTask] = useUpdateDailyWorkingTaskMutation();
    const [deleteTask] = useDeleteDailyWorkingTaskMutation();

    const tasks = useMemo(() => {
        if (!tasksData?.data) return [];
        // Flatten tasks from all DailyWorking records
        return tasksData.data.reduce((acc, current) => {
            const dateTasks = current.tasks.map(t => ({
                ...t,
                date: current.date, // Include the parent's date if needed
                parentDate: current.date
            }));
            return [...acc, ...dateTasks];
        }, []);
    }, [tasksData]);

    const showModal = () => {
        setIsModalVisible(true);
    };

    const handleCancel = () => setIsModalVisible(false);

    const handleOpenDrawer = (task) => {
        setSelectedTask(task);
        setEditForm({
            title: task.title,
            priority: task.priority,
            status: task.status,
            content: task.referenceData?.find(r => r.type === 'text')?.content || '',
            referenceData: task.referenceData || [],
        });
        setIsDrawerVisible(true);
    };

    const closeTaskDetails = () => {
        setIsDrawerVisible(false);
        setSelectedTask(null);
    };

    const handleCreateTask = async () => {
        if (!taskForm.title.trim()) {
            return message.error('Task title is required');
        }
        try {
            const referenceData = [];
            if (taskForm.content) {
                referenceData.push({ type: taskForm.type, content: taskForm.content });
            }
            if (taskForm.imageUrl) {
                referenceData.push({ type: 'image', content: taskForm.imageUrl });
            }

            await createTask({
                userId,
                title: taskForm.title.trim(),
                priority: taskForm.priority,
                status: taskForm.status,
                date: dayjs().format('YYYY-MM-DD'),
                referenceData
            }).unwrap();
            message.success('Task created successfully');
            handleClearDraft();
            setIsModalVisible(false);
        } catch (err) {
            message.error(err?.data?.message || 'Failed to create task');
        }
    };

    const handleUpdateStatus = async (taskId, newStatus) => {
        try {
            await updateTask({ taskId, body: { status: newStatus } }).unwrap();
            message.success('Status updated');
        } catch (err) {
            message.error(err?.data?.message || 'Failed to update status');
        }
    };

    const handleDeleteTask = async (taskId) => {
        try {
            await deleteTask(taskId).unwrap();
            message.success('Task deleted');
            if (selectedTask?._id === taskId) closeTaskDetails();
        } catch (err) {
            message.error('Failed to delete task');
        }
    };

    const handleSaveUpdate = async () => {
        if (!editForm.title.trim()) {
            return message.error('Task title is required');
        }
        try {
            // Find existing text reference or create new one
            let newReferenceData = [...editForm.referenceData];
            const textIdx = newReferenceData.findIndex(r => r.type === 'text');

            if (textIdx > -1) {
                newReferenceData[textIdx] = { ...newReferenceData[textIdx], content: editForm.content };
            } else if (editForm.content) {
                newReferenceData.push({ type: 'text', content: editForm.content });
            }

            await updateTask({
                taskId: selectedTask._id,
                body: {
                    title: editForm.title.trim(),
                    status: editForm.status,
                    priority: editForm.priority,
                    // clientName and brochure are not in the update schema
                    referenceData: newReferenceData
                }
            }).unwrap();
            message.success('Task updated successfully');
            closeTaskDetails();
        } catch (err) {
            message.error('Failed to update task');
        }
    };

    const handleImageUpload = async (file) => {
        if (!file) return;
        setIsUploading(true);
        try {
            const data = await uploadToCloudinary(file);
            setTaskForm(prev => ({ ...prev, imageUrl: data?.secure_url, type: 'image' }));
            message.success('Image uploaded successfully');
        } catch (err) {
            console.error('Upload error:', err);
            message.error('Upload failed. Please try again.');
        } finally {
            setIsUploading(false);
        }
    };


    const TaskCard = ({ task }) => (
        <div className="task-card" onClick={() => handleOpenDrawer(task)}>
            <div className="task-title">{task.title}</div>

            <div className="task-meta">
                <span className={`priority-tag priority-${(task.priority || 'Medium').toLowerCase()}`}>
                    {task.priority}
                </span>
                <div className="task-date">
                    <BsCalendar style={{ fontSize: '11px' }} />
                    {dayjs(task.date || task.parentDate || task.createdAt).format('MMM D, YYYY')}
                </div>
            </div>

            <div className="card-indicators">
                {/* Indicators can be added here */}
            </div>

            <div className="task-attachments">
                {task.referenceData?.slice(0, 1).map((ref, idx) => (
                    <React.Fragment key={idx}>
                        {ref.type === 'image' && <img src={ref.content} alt="Attachment" className="attachment-preview" />}
                        {ref.type === 'text' && <div className="attachment-text">{ref.content}</div>}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );

    const BoardColumn = ({ status, tasks }) => {
        const filteredTasks = tasks.filter(t => {
            if (status === 'Not Started') return t.status === 'Not Started' || t.status === 'Todo';
            if (status === 'In Process') return t.status === 'In Process' || t.status === 'In Progress';
            return t.status === status;
        });
        return (
            <Card>
                <div className="board-column">
                    <div className="column-header">
                        <div className="column-title">
                            <span className={`status-badge status-${status.toLowerCase().replace(/\s+/g, '')}`}>{status}</span>
                            <span className="task-count">{filteredTasks.length}</span>
                        </div>
                        <Space className="column-actions">
                            <BsPlus className="icon-btn" onClick={showModal} />
                            <BsThreeDots className="icon-btn" />
                        </Space>
                    </div>
                    <div className="column-tasks">
                        {filteredTasks.map(task => (
                            <TaskCard key={task._id} task={task} />
                        ))}
                        <button className="add-task-btn" onClick={() => {
                            setTaskForm(prev => ({ ...prev, status }));
                            setIsModalVisible(true);
                        }}>
                            <BsPlus /> New
                        </button>
                    </div>
                </div>
            </Card>
        );
    };

    const ListView = () => (
        <div className="list-view-container">
            <div className="list-header-row">
                <div className="list-col col-title">Title</div>
                <div className="list-col col-status">Status</div>
                <div className="list-col col-priority">Priority</div>
                <div className="list-col col-date">Date</div>
            </div>
            {tasks.length === 0 && (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--secondary-text)' }}>
                    No tasks found. Click "New Task" to get started.
                </div>
            )}
            {tasks.map(task => (
                <div key={task._id} className="list-item-row" onClick={() => handleOpenDrawer(task)}>
                    <div className="list-col col-title">
                        <BsPlus style={{ marginRight: '12px', color: 'var(--secondary-text)' }} />
                        {task.title}
                    </div>
                    <div className="list-col col-status">
                        <span className={`status-badge status-${(task.status || 'Not Started').toLowerCase().replace(/\s+/g, '')}`}>{task.status}</span>
                    </div>
                    <div className="list-col col-priority">
                        <span className={`priority-tag priority-${(task.priority || 'Medium').toLowerCase()}`}>
                            {task.priority || 'Medium'}
                        </span>
                    </div>
                    <div className="list-col col-date">
                        {dayjs(task.date || task.parentDate || task.createdAt).format('MMM D, YYYY')}
                    </div>
                </div>
            ))}
            <button className="list-add-btn" onClick={showModal}>
                <BsPlus style={{ marginRight: '8px' }} /> New Task
            </button>
        </div>
    );

    return (
        <Card>
            <div className={`note-scheduling-container theme-${theme}`}>
                <div className="note-scheduling-header">
                    <div className="note-scheduling-title-section">
                        <h2 className='SecondaryText'>Task Board</h2>
                        <div className="note-scheduling-description">
                            Hi {user?.firstName || 'User'}, manage your tasks with real-time sync.
                        </div>
                    </div>
                    <div className="note-scheduling-actions">
                        <Space size="large">
                            <div className="view-switcher">
                                <button
                                    className={`view-btn ${viewMode === 'board' ? 'active' : ''}`}
                                    onClick={() => setViewMode('board')}
                                >
                                    Board
                                </button>
                                <button
                                    className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                                    onClick={() => setViewMode('list')}
                                >
                                    List
                                </button>
                            </div>
                            <Button type="primary" icon={<BsPlus />} onClick={showModal} className="global-action-btn notion-new-btn">
                                New Task
                            </Button>
                        </Space>
                    </div>
                </div>

                {isLoading ? (
                    <div style={{ padding: '100px', textAlign: 'center' }}>Loading tasks...</div>
                ) : viewMode === 'board' ? (
                    <div className="board-container">
                        {['Not Started', 'In Process', 'Completed'].map(status => (
                            <BoardColumn key={status} status={status} tasks={tasks} />
                        ))}
                    </div>
                ) : (
                    <ListView />
                )}

                {/* Task Details Drawer */}
                <Drawer
                    title={null}
                    placement="right"
                    onClose={closeTaskDetails}
                    open={isDrawerVisible}
                    width={650}
                    className="notion-drawer"
                >
                    {selectedTask && (
                        <div className="drawer-content">
                            <div className="drawer-actions">
                                <Space>
                                    <Popconfirm
                                        title="Delete task?"
                                        onConfirm={() => handleDeleteTask(selectedTask._id)}
                                        okText="Yes"
                                        cancelText="No"
                                    >
                                        <Button icon={<BsTrash />} type="text" danger />
                                    </Popconfirm>
                                    <Button icon={<BsThreeDots />} type="text" />
                                </Space>
                            </div>

                            <div className="drawer-title-area">
                                <Input
                                    value={editForm.title}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                                    className="drawer-task-title-input"
                                    bordered={false}
                                    placeholder="Task Title"
                                />
                            </div>

                            <div className="drawer-fields">
                                <div className="drawer-field-row">
                                    <div className="field-label"><Badge status="default" /> Status</div>
                                    <div className="field-value">
                                        <Select
                                            value={editForm.status}
                                            bordered={false}
                                            className="notion-select"
                                            onChange={(val) => setEditForm(prev => ({ ...prev, status: val }))}
                                        >
                                            <Option value="Not Started">Not Started</Option>
                                            <Option value="In Process">In Process</Option>
                                            <Option value="Completed">Completed</Option>
                                        </Select>
                                    </div>
                                </div>
                                <div className="drawer-field-row">
                                    <div className="field-label"><BsFlag /> Priority</div>
                                    <div className="field-value">
                                        <Select
                                            value={editForm.priority}
                                            bordered={false}
                                            className="notion-select"
                                            onChange={(val) => setEditForm(prev => ({ ...prev, priority: val }))}
                                        >
                                            <Option value="High">High</Option>
                                            <Option value="Medium">Medium</Option>
                                            <Option value="Low">Low</Option>
                                        </Select>
                                    </div>
                                </div>
                                <div className="drawer-field-row">
                                    <div className="field-label"><BsCalendar /> Date</div>
                                    <div className="field-value">
                                        <Text>{dayjs(selectedTask.date || selectedTask.parentDate || selectedTask.createdAt).format('MMMM D, YYYY')}</Text>
                                    </div>
                                </div>
                            </div>

                            <Divider style={{ margin: '24px 0' }} />

                            <div className="drawer-body">
                                <div className='drawer-Content-section'>
                                    <div className="drawer-section-title">Reference Data & Notes</div>
                                    <div className="drawer-attachments">
                                        {editForm.referenceData?.filter(r => r.type === 'image').map((ref, idx) => (
                                            <div key={idx} className="drawer-attachment-item">
                                                <div className="image-attachment">
                                                    <img src={ref.content} alt="Attachment" />
                                                </div>
                                            </div>
                                        ))}
                                        <div className="drawer-notes-area">
                                            <Input.TextArea
                                                value={editForm.content}
                                                onChange={(e) => setEditForm(prev => ({ ...prev, content: e.target.value }))}
                                                placeholder="Add some notes..."
                                                autoSize={{ minRows: 4 }}
                                                bordered={false}
                                                className="drawer-notes-input"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="drawer-footer">
                                <Button
                                    type="primary"
                                    onClick={handleSaveUpdate}
                                    className="global-action-btn"
                                    block
                                    size="large"
                                >
                                    Update Task
                                </Button>
                            </div>
                        </div>
                    )}
                </Drawer>

                <Modal
                    title={null}
                    open={isModalVisible}
                    onCancel={handleCancel}
                    footer={null}
                    width={700}
                    centered
                    className="notion-modal"
                    bodyStyle={{ padding: 0 }}
                >
                    <div className="notion-modal-inner">
                        <Input
                            placeholder="Untitled"
                            className="notion-modal-input notion-modal-title"
                            value={taskForm.title}
                            onChange={(e) => setTaskForm(prev => ({ ...prev, title: e.target.value }))}
                            autoFocus
                        />

                        <div className="notion-field-rows">
                            <div className="notion-field-row">
                                <div className="notion-field-label">
                                    <Badge color="#9b9b9b" /> Status
                                </div>
                                <div className="notion-field-value">
                                    <Select
                                        value={taskForm.status}
                                        style={{ width: '100%' }}
                                        bordered={false}
                                        dropdownStyle={{ minWidth: '150px' }}
                                        onChange={(val) => setTaskForm(prev => ({ ...prev, status: val }))}
                                    >
                                        <Option value="Not Started"><span className="status-badge status-notstarted">Not Started</span></Option>
                                        <Option value="In Process"><span className="status-badge status-inprocess">In Process</span></Option>
                                        <Option value="Completed"><span className="status-badge status-completed">Completed</span></Option>
                                    </Select>
                                </div>
                            </div>

                            <div className="notion-field-row">
                                <div className="notion-field-label">
                                    <BsFlag /> Priority
                                </div>
                                <div className="notion-field-value">
                                    <Select
                                        value={taskForm.priority}
                                        style={{ width: '100%' }}
                                        bordered={false}
                                        onChange={(val) => setTaskForm(prev => ({ ...prev, priority: val }))}
                                    >
                                        <Option value="High"><span className="priority-tag priority-high">High</span></Option>
                                        <Option value="Medium"><span className="priority-tag priority-medium">Medium</span></Option>
                                        <Option value="Low"><span className="priority-tag priority-low">Low</span></Option>
                                    </Select>
                                </div>
                            </div>

                            <div className="notion-field-row">
                                <div className="notion-field-label">
                                    <BsPlus /> Attachment Type
                                </div>
                                <div className="notion-field-value">
                                    <Select
                                        value={taskForm.type}
                                        style={{ width: '100%' }}
                                        bordered={false}
                                        onChange={(val) => setTaskForm(prev => ({ ...prev, type: val }))}
                                    >
                                        <Option value="text">Text / Note</Option>
                                        <Option value="image">Image URL</Option>
                                    </Select>
                                </div>
                            </div>

                            <div className="notion-field-row">
                                <div className="notion-field-label">
                                    <BsCalendar /> Date
                                </div>
                                <div className="notion-field-value">
                                    <span style={{ paddingLeft: '4px', color: 'var(--primary-text)', fontSize: '14px' }}>
                                        {dayjs().format('MMMM D, YYYY')}
                                    </span>
                                </div>
                            </div>

                            <div className="notion-field-row">
                                <div className="notion-field-label">
                                    <BsImage /> Upload Image
                                </div>
                                <div className="notion-field-value">
                                    <Input
                                        type="file"
                                        style={{ display: 'none' }}
                                        id="modal-image-upload"
                                        accept="image/*"
                                        onChange={(e) => handleImageUpload(e.target.files[0])}
                                    />
                                    <Button
                                        icon={<BsPlus />}
                                        onClick={() => document.getElementById('modal-image-upload').click()}
                                        loading={isUploading}
                                        size="small"
                                        type="dashed"
                                    >
                                        {taskForm.imageUrl ? 'Change Image' : 'Select Image'}
                                    </Button>
                                    {taskForm.imageUrl && (
                                        <Space style={{ marginLeft: '12px' }}>
                                            <Image
                                                src={taskForm.imageUrl}
                                                width={40}
                                                height={40}
                                                style={{ borderRadius: '4px', objectFit: 'cover', cursor: 'pointer' }}
                                                preview={{
                                                    mask: <BsLightningCharge style={{ fontSize: '12px' }} />
                                                }}
                                            />
                                            <Tooltip title="Delete Image">
                                                <Button
                                                    icon={<BsTrash />}
                                                    size="small"
                                                    danger
                                                    type="text"
                                                    onClick={handleDeleteImage}
                                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                />
                                            </Tooltip>
                                        </Space>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="notion-modal-body">
                            <Input.TextArea
                                placeholder={taskForm.type === 'image' ? "Paste image URL here..." : "Add some details..."}
                                autoSize={{ minRows: 6 }}
                                bordered={false}
                                style={{ padding: 0 }}
                                value={taskForm.content}
                                onChange={(e) => setTaskForm(prev => ({ ...prev, content: e.target.value }))}
                            />
                        </div>

                        <div className="notion-modal-footer">
                            <Button key="clear" onClick={handleClearDraft} type="link" danger style={{ marginRight: 'auto', paddingLeft: 0 }}>
                                Clear Draft
                            </Button>
                            <Button key="cancel" onClick={handleCancel} className="global-secondary-btn" style={{ borderRadius: '6px' }}>
                                Cancel
                            </Button>
                            <Button key="submit" type="primary" onClick={handleCreateTask} className="global-action-btn" style={{ borderRadius: '6px' }}>
                                Create Task
                            </Button>
                        </div>
                    </div>
                </Modal>
            </div>
        </Card>
    );
};

export default NoteScheduling;
