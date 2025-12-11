import React, { useState } from 'react';
import { Row, Col, Tabs, Button, Input, Select, DatePicker, AutoComplete } from 'antd';
import { useSelector } from 'react-redux';
import { selectTheme } from '../../../../store/slices/themeSlice';
import { selectUser, selectUserId } from '../../../../store/slices/authSlice';
import { useGetAllUsersQuery, useGetTaskAssignQuery } from '../../../../store/api';
import ContentProviderTaskEntries from './ContentProviderTaskEntries';
import { BsFilter, BsSearch } from 'react-icons/bs';
import dayjs from 'dayjs';
import "../../ContentProviderPanel/ContentProviderPanel.css";

/**
 * ContentProviderTaskEntriesPage - Full page component for Task Entries
 * Includes tabs, filters, and the task entries component
 */
const ContentProviderTaskEntriesPage = () => {
    const theme = useSelector(selectTheme);
    const user = useSelector(selectUser);
    const userId = useSelector(selectUserId);
    const userFullName = (user?.name || [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || 'Your').trim();

    const [activeTab, setActiveTab] = useState('1');
    const [showFilters, setShowFilters] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDateRange, setSelectedDateRange] = useState(null);
    const [priorityFilter, setPriorityFilter] = useState('all');
    const [assignerFilter, setAssignerFilter] = useState('all');

    // Fetch all users to populate assigner filter
    const { data: allUsersData } = useGetAllUsersQuery();

    // Fetch tasks to get suggestions for search
    const { data: tasksData } = useGetTaskAssignQuery(userId);

    // Generate search suggestions from tasks
    const searchSuggestions = React.useMemo(() => {
        if (!tasksData?.data || !searchTerm) return [];

        const term = searchTerm.toLowerCase();
        const suggestions = new Set();

        tasksData.data.forEach(task => {
            // Task name suggestions
            if (task.taskName && task.taskName.toLowerCase().includes(term)) {
                suggestions.add(task.taskName);
            }
            // Client name suggestions
            if (task.clientName && task.clientName.toLowerCase().includes(term)) {
                suggestions.add(task.clientName);
            }
            // Category suggestions
            if (task.category && task.category.toLowerCase().includes(term)) {
                suggestions.add(task.category);
            }
        });

        return Array.from(suggestions).slice(0, 5).map(suggestion => ({
            value: suggestion,
            label: suggestion
        }));
    }, [tasksData, searchTerm]);

    // Date range presets
    const rangePresets = [
        { label: 'Today', value: [dayjs(), dayjs()] },
        { label: 'This Week', value: [dayjs().startOf('week'), dayjs().endOf('week')] },
        { label: 'This Month', value: [dayjs().startOf('month'), dayjs().endOf('month')] },
        { label: 'Last 7 Days', value: [dayjs().subtract(7, 'day'), dayjs()] },
        { label: 'Last 30 Days', value: [dayjs().subtract(30, 'day'), dayjs()] },
    ];

    // Get assigner options for filter
    const assignerOptions = React.useMemo(() => {
        if (!allUsersData?.data) return [];

        const assigners = new Set();
        tasksData?.data?.forEach(task => {
            if (task.userId) assigners.add(task.userId);
        });

        return Array.from(assigners).map(assignerId => {
            const assigner = allUsersData.data.find(u => u.userId === assignerId);
            const name = assigner
                ? `${assigner.firstName || ''} ${assigner.lastName || ''}`.trim() || assigner.email || assignerId
                : assignerId;
            return { value: assignerId, label: name };
        });
    }, [allUsersData, tasksData]);

    const toggleFilters = () => {
        setShowFilters(!showFilters);
    };

    const clearFilters = () => {
        setSearchTerm('');
        setSelectedDateRange(null);
        setPriorityFilter('all');
        setAssignerFilter('all');
    };

    const handleTabChange = (key) => {
        setActiveTab(key);
    };

    return (
        <div id="ContentProviderTaskEntriesPage" className={`theme-${theme}`}>
            <div className='ContentProviderPanel-container'>
                <div className="tasks-section">
                    <h2 className="panel-title" style={{ marginBottom: '24px' }}>{userFullName} Tasks</h2>
                    <br />
                    <Row>
                        <Col lg={18} md={18} sm={24} xs={24}>
                            <div className="AntdTabsNames">
                                <Tabs
                                    activeKey={activeTab}
                                    onChange={handleTabChange}
                                    type="card"
                                    items={[
                                        {
                                            key: '1',
                                            label: 'All Tasks'
                                        },
                                        {
                                            key: '2',
                                            label: 'Upcoming Tasks'
                                        },
                                        {
                                            key: '3',
                                            label: 'In Progress'
                                        },
                                        {
                                            key: '4',
                                            label: 'Completed'
                                        }
                                    ]}
                                />
                            </div>
                        </Col>
                        <Col lg={6} md={6} sm={24} xs={24}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                <Button
                                    type={showFilters ? 'primary' : 'default'}
                                    icon={<BsFilter />}
                                    onClick={toggleFilters}
                                    className={`AddFilterButton ${showFilters ? 'filter-active' : ''}`}
                                >
                                    Filters
                                </Button>
                            </div>
                        </Col>
                    </Row>

                    {/* Filters Section */}
                    {showFilters && (
                        <div className="filters-section">
                            <Row gutter={[16, 16]}>
                                <Col xs={24} sm={12} md={8}>
                                    <AutoComplete
                                        value={searchTerm}
                                        options={searchSuggestions}
                                        onSelect={(value) => setSearchTerm(value)}
                                        onSearch={(value) => setSearchTerm(value)}
                                        style={{ width: '100%' }}
                                        placeholder="Search tasks..."
                                    >
                                        <Input
                                            prefix={<BsSearch />}
                                            placeholder="Search by task name, client, or category..."
                                            allowClear
                                        />
                                    </AutoComplete>
                                </Col>
                                <Col xs={24} sm={12} md={8}>
                                    <DatePicker.RangePicker
                                        value={selectedDateRange}
                                        onChange={setSelectedDateRange}
                                        presets={rangePresets}
                                        style={{ width: '100%' }}
                                        placeholder={['Start Date', 'End Date']}
                                    />
                                </Col>
                                <Col xs={24} sm={12} md={4}>
                                    <Select
                                        value={priorityFilter}
                                        onChange={setPriorityFilter}
                                        style={{ width: '100%' }}
                                        placeholder="Priority"
                                    >
                                        <Select.Option value="all">All Priorities</Select.Option>
                                        <Select.Option value="high">High</Select.Option>
                                        <Select.Option value="medium">Medium</Select.Option>
                                        <Select.Option value="low">Low</Select.Option>
                                    </Select>
                                </Col>
                                <Col xs={24} sm={12} md={4}>
                                    <Select
                                        value={assignerFilter}
                                        onChange={setAssignerFilter}
                                        style={{ width: '100%' }}
                                        placeholder="Assigner"
                                    >
                                        <Select.Option value="all">All Assigners</Select.Option>
                                        {assignerOptions.map(option => (
                                            <Select.Option key={option.value} value={option.value}>
                                                {option.label}
                                            </Select.Option>
                                        ))}
                                    </Select>
                                </Col>
                            </Row>
                            <div style={{ marginTop: '12px', textAlign: 'right' }}>
                                <Button type="link" onClick={clearFilters} size="small">
                                    Clear Filters
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Task Entries */}
                    <ContentProviderTaskEntries
                        userId={userId}
                        activeTab={activeTab}
                        searchTerm={searchTerm}
                        selectedDateRange={selectedDateRange}
                        priorityFilter={priorityFilter}
                        assignerFilter={assignerFilter}
                    />
                </div>
            </div>
        </div>
    );
};

export default ContentProviderTaskEntriesPage;


