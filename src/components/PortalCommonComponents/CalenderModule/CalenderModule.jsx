import React from 'react';
import { Calendar, Modal, Form, Input, Button, Space, Popover, Select } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, CalendarOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons';
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
                return;
            }

            await onSaveTask(selectedDate, { ...values, color: values.color || selectedColor }, editingNoteId);
        } catch (error) {
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
                            <div className="fc-holiday-row" style={{ marginBottom: 4 }}>
                                <span style={{ marginRight: 6 }}>{holiday.emoji}</span>
                                <span style={{ fontSize: '13px', fontWeight: 500 }}>{holiday.name}</span>
                            </div>
                        )}
                        {dateTasks.map(task => (
                            <div key={task.id} className="fc-task-item">
                                <Space size={8}>
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
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDateSelect(date, { source: 'date' });
                                }}
                                size="small"
                                style={{ marginTop: 8, padding: 0, fontSize: '12px' }}
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
                        <span title={holiday.name} style={{ marginRight: 2, fontSize: '10px' }}>
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
                            monthOptions.push({
                                label: localeData.monthsShort(dayjs().month(i)),
                                value: i,
                            });
                        }
                        const year = value.year();
                        const yearOptions = [];
                        for (let i = year - 10; i < year + 10; i += 1) {
                            yearOptions.push({
                                label: i,
                                value: i,
                            });
                        }

                        return (
                            <div className="fc-calendar-header">
                                <div className="fc-header-controls">
                                    <Button
                                        size="small"
                                        onClick={() => onChange(value.clone().subtract(1, type))}
                                        icon={<LeftOutlined style={{ fontSize: '12px' }} />}
                                        type="text"
                                        style={{ color: '#fff' }}
                                    />
                                    <Select
                                        size="small"
                                        variant="borderless"
                                        className="fc-month-select"
                                        popupClassName="fc-header-select-dropdown"
                                        dropdownMatchSelectWidth={false}
                                        value={value.month()}
                                        options={monthOptions}
                                        onChange={(newMonth) => onChange(value.clone().month(newMonth))}
                                    />
                                    <Select
                                        size="small"
                                        variant="borderless"
                                        className="fc-year-select"
                                        popupClassName="fc-header-select-dropdown"
                                        dropdownMatchSelectWidth={false}
                                        value={year}
                                        options={yearOptions}
                                        onChange={(newYear) => onChange(value.clone().year(newYear))}
                                    />
                                    <Button
                                        size="small"
                                        onClick={() => onChange(value.clone().add(1, type))}
                                        icon={<RightOutlined style={{ fontSize: '12px' }} />}
                                        type="text"
                                        style={{ color: '#fff' }}
                                    />
                                </div>
                                <Button
                                    onClick={() => onChange(dayjs())}
                                    type="default"
                                    size="small"
                                    className='global-button-secondary'
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
                        <Space>
                            <CalendarOutlined style={{ color: 'var(--accent-color)' }} />
                            <span>{selectedDate && `Tasks for ${dayjs(selectedDate).format('MMM DD, YYYY')}`}</span>
                        </Space>
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
                    okText={editingNoteId ? 'Update' : 'Add Task'}
                    cancelText="Cancel"
                    width={500}
                    centered
                    className="fc-task-modal"
                >
                    <div className="fc-current-tasks">
                        {currentTasks.map(task => (
                            <div key={task.id} className="fc-task-card">
                                <div className="fc-task-card-header">
                                    <Space size={8}>
                                        <span
                                            className="fc-task-color-dot"
                                            style={{ backgroundColor: task.color }}
                                        />
                                        <span className="fc-task-title">{task.title}</span>
                                    </Space>
                                    {showActions && (
                                        <Space size={0}>
                                            <Button
                                                type="text"
                                                icon={<EditOutlined style={{ fontSize: '14px' }} />}
                                                size="small"
                                                onClick={() => handleEditTask(task)}
                                            />
                                            <Button
                                                type="text"
                                                danger
                                                icon={<DeleteOutlined style={{ fontSize: '14px' }} />}
                                                size="small"
                                                onClick={() => handleArchiveTask(task)}
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
                            <div className="fc-limit-warning">Maximum {maxTasksPerDate} tasks reached for this date.</div>
                        )}
                    </div>

                    {form && (
                        <Form
                            form={form}
                            layout="vertical"
                            className="fc-task-form"
                            requiredMark={false}
                        >
                            <Form.Item
                                label="Task Title"
                                name="title"
                                rules={[{ required: true, message: 'Required' }]}
                            >
                                <Input placeholder="What needs to be done?" />
                            </Form.Item>

                            <Form.Item
                                label="Description"
                                name="description"
                            >
                                <TextArea
                                    rows={2}
                                    placeholder="Add more details..."
                                />
                            </Form.Item>

                            {taskColors.length > 0 && (
                                <Form.Item
                                    label="Task Color"
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
