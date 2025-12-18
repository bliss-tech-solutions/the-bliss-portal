import React from 'react';
import { Calendar, Modal, Form, Input, Button, Space, Popover } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, CalendarOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import './CalenderModule.css';

const { TextArea } = Input;

const CalenderModule = ({
    title = 'Calendar',
    maxTasksPerDate = 4,
    holidays = null,
    showActions = true,
    getTasksForDate,
    getHolidayForDate,
    onSaveTask,
    onArchiveTask,
    onEditTask,
    onDateSelect,
    onModalCancel,
    selectedDate,
    isModalVisible,
    setIsModalVisible,
    editingNoteId,
    form,
    selectedColor,
    setSelectedColor,
    taskColors = [],
    disabledDate,
}) => {
    const handleDateClick = (date, info) => {
        if (typeof onDateSelect === 'function') {
            onDateSelect(date, info);
            return;
        }
        // Default behavior: open modal (if handlers provided)
        // This is for cases where no onDateSelect is provided but we still want modal
        if (typeof onSaveTask === 'function' && setIsModalVisible) {
            setIsModalVisible(true);
            if (setSelectedColor && taskColors.length > 0) {
                setSelectedColor(taskColors[0].color);
            }
            if (form) {
                form.resetFields();
                if (taskColors.length > 0) {
                    form.setFieldsValue({ color: taskColors[0].color });
                }
            }
        }
    };

    const handleSaveTask = async () => {
        if (!onSaveTask || !selectedDate || !form) return;
        try {
            const values = await form.validateFields();
            const dateTasks = getTasksForDate ? getTasksForDate(selectedDate) : [];

            if (!editingNoteId && dateTasks.length >= maxTasksPerDate) {
                return; // Let parent handle validation message
            }

            await onSaveTask(selectedDate, { ...values, color: values.color || selectedColor }, editingNoteId);
        } catch (error) {
            // Let parent handle validation errors
            console.error('Validation failed:', error);
        }
    };

    const handleArchiveTask = async (task) => {
        if (!onArchiveTask || !selectedDate) return;
        await onArchiveTask(selectedDate, task);
    };

    const handleEditTask = (task) => {
        if (onEditTask) {
            onEditTask(task);
        }
    };

    const dateCellRender = (date) => {
        const dateTasks = getTasksForDate ? getTasksForDate(date) : [];
        const holiday = getHolidayForDate ? getHolidayForDate(date) : null;

        if (dateTasks.length === 0 && !holiday) return null;

        return (
            <Popover
                title={`Tasks for ${dayjs(date).format('MMM DD, YYYY')}`}
                content={
                    <div className="fc-tasks-popover">
                        {holiday && (
                            <div className="fc-holiday-row" style={{ marginBottom: 8 }}>
                                <span style={{ marginRight: 6 }}>{holiday.emoji}</span>
                                <span>{holiday.name}</span>
                            </div>
                        )}
                        {dateTasks.map(task => (
                            <div key={task.id} className="fc-task-item">
                                <Space>
                                    <span
                                        className="fc-task-color-dot"
                                        style={{ backgroundColor: task.color }}
                                    />
                                    <span>{task.title}</span>
                                </Space>
                            </div>
                        ))}

                        {showActions && typeof onDateSelect === 'function' && (
                            <Button
                                type="link"
                                icon={<PlusOutlined />}
                                onClick={() => {
                                    onDateSelect(date, { source: 'date' });
                                }}
                                size="small"
                                style={{ marginTop: 8, padding: 0 }}
                            >
                                Add Task
                            </Button>
                        )}
                    </div>
                }
                trigger="click"
            >
                <div className="fc-dots-row">
                    {holiday && (
                        <span title={holiday.name} style={{ marginRight: 6 }}>
                            {holiday.emoji}
                        </span>
                    )}
                    {dateTasks.slice(0, 4).map(task => (
                        <span key={task.id} className="fc-task-dot" style={{ backgroundColor: task.color }} title={task.title} />
                    ))}
                    {dateTasks.length > 4 && (
                        <span className="fc-task-more">+{dateTasks.length - 4}</span>
                    )}
                </div>
            </Popover>
        );
    };

    const currentTasks = selectedDate && getTasksForDate ? getTasksForDate(selectedDate) : [];

    return (
        <div className="festive-calendar-container">
            <div className="fc-header">
                <h2>{title}</h2>
            </div>

            <div className="fc-calendar-wrapper">
                <Calendar
                    dateCellRender={dateCellRender}
                    onSelect={handleDateClick}
                    disabledDate={disabledDate}
                    className="fc-calendar"
                    headerRender={({ value, type, onChange }) => {
                        const monthOptions = [];
                        const localeData = value.localeData();
                        for (let i = 0; i < 12; i++) {
                            const monthDate = dayjs().month(i);
                            const monthName = localeData.monthsShort(monthDate);
                            monthOptions.push(
                                <option key={i} value={i}>
                                    {monthName}
                                </option>
                            );
                        }
                        const year = value.year();
                        const month = value.month();
                        const options = [];
                        for (let i = year - 10; i < year + 10; i += 1) {
                            options.push(
                                <option key={i} value={i}>
                                    {i}
                                </option>
                            );
                        }
                        return (
                            <div className="fc-calendar-header">
                                <div className="fc-header-controls">
                                    <Button
                                        onClick={() => onChange(value.clone().subtract(1, type))}
                                        icon={<span>‹</span>}
                                        type="text"
                                    />
                                    <select
                                        value={month}
                                        onChange={(e) => {
                                            const newValue = value.clone().month(e.target.value);
                                            onChange(newValue);
                                        }}
                                        className="fc-month-select"
                                    >
                                        {monthOptions}
                                    </select>
                                    <select
                                        value={year}
                                        onChange={(e) => {
                                            const newValue = value.clone().year(e.target.value);
                                            onChange(newValue);
                                        }}
                                        className="fc-year-select"
                                    >
                                        {options}
                                    </select>
                                    <Button
                                        onClick={() => onChange(value.clone().add(1, type))}
                                        icon={<span>›</span>}
                                        type="text"
                                    />
                                </div>
                                <Button
                                    onClick={() => onChange(dayjs())}
                                    type="primary"
                                    size="small"
                                >
                                    Today
                                </Button>
                            </div>
                        );
                    }}
                />
            </div>

            {showActions && onSaveTask && (
                <Modal
                    title={
                        <div>
                            <CalendarOutlined />
                            {selectedDate && `Tasks for ${dayjs(selectedDate).format('MMMM DD, YYYY')}`}
                            <br /><br />
                        </div>
                    }
                    open={isModalVisible}
                    onOk={handleSaveTask}
                    onCancel={() => {
                        if (typeof onModalCancel === 'function') {
                            onModalCancel();
                        } else {
                            if (setIsModalVisible) setIsModalVisible(false);
                            if (setSelectedColor && taskColors.length > 0) {
                                setSelectedColor(taskColors[0].color);
                            }
                            if (form) form.resetFields();
                        }
                    }}
                    okText={editingNoteId ? 'Update Task' : 'Add Task'}
                    cancelText="Close"
                    width={600}
                    className="fc-task-modal"
                >
                    <div className="fc-current-tasks">
                        {currentTasks.map(task => (
                            <div key={task.id} className="fc-task-card">
                                <div className="fc-task-card-header">
                                    <Space>
                                        <span
                                            className="fc-task-color-dot"
                                            style={{ backgroundColor: task.color }}
                                        />
                                        <span className="fc-task-title">{task.title}</span>
                                    </Space>
                                    {showActions && (
                                        <Space>
                                            <Button
                                                type="text"
                                                icon={<EditOutlined />}
                                                size="small"
                                                onClick={() => handleEditTask(task)}
                                                title="Edit note"
                                            />
                                            <Button
                                                type="text"
                                                danger
                                                icon={<DeleteOutlined />}
                                                size="small"
                                                onClick={() => handleArchiveTask(task)}
                                                title="Archive this date"
                                            />
                                        </Space>
                                    )}
                                </div>
                                {task.description && (
                                    <p className="fc-task-description">{task.description}</p>
                                )}
                            </div>
                        ))}
                        {currentTasks.length >= maxTasksPerDate && !editingNoteId && (
                            <p className="fc-limit-warning">Maximum {maxTasksPerDate} tasks reached for this date!</p>
                        )}
                    </div>

                    {form && (
                        <Form
                            form={form}
                            layout="vertical"
                            className="fc-task-form"
                        >
                            <Form.Item
                                label="Task Title"
                                name="title"
                                rules={[{ required: true, message: 'Please enter task title' }]}
                            >
                                <Input placeholder="Enter task title" />
                            </Form.Item>

                            <Form.Item
                                label="Description"
                                name="description"
                            >
                                <TextArea
                                    rows={3}
                                    placeholder="Enter task description (optional)"
                                />
                            </Form.Item>

                            {taskColors.length > 0 && (
                                <Form.Item
                                    label="Colors"
                                    name="color"
                                    initialValue={taskColors[0]?.color}
                                >
                                    <div className="fc-color-picker">
                                        {taskColors.map(colorOption => (
                                            <div
                                                key={colorOption.id}
                                                className={`fc-color-option ${selectedColor === colorOption.color ? 'fc-color-selected' : ''}`}
                                                onClick={() => {
                                                    if (setSelectedColor) {
                                                        setSelectedColor(colorOption.color);
                                                    }
                                                    if (form) {
                                                        form.setFieldsValue({ color: colorOption.color });
                                                    }
                                                }}
                                                style={{
                                                    backgroundColor: colorOption.color,
                                                }}
                                                title={colorOption.label}
                                            />
                                        ))}
                                    </div>
                                </Form.Item>
                            )}
                        </Form>
                    )}
                </Modal>
            )}
        </div>
    );
};

export default CalenderModule;
