import React, { useState, useMemo } from 'react';
import './UserTaskAssignmentPanel.css';
import { Row, Col, Tabs, Button, Input, Select, DatePicker, AutoComplete } from 'antd';
import { useSelector } from 'react-redux';
import { selectTheme } from '../../../../store/slices/themeSlice';
import { selectUser, selectUserId } from '../../../../store/slices/authSlice';
import AllUserTaskEntries from './AllUserTaskEntries/AllUserTaskEntries';
import EmptyState from '../../../CommonComponents/EmptyState/EmptyState';
import { BsFilter, BsSearch } from 'react-icons/bs';
import { useGetAllUsersQuery, useGetTaskAssignQuery } from '../../../../store/api';
import dayjs from 'dayjs';

const UserTaskAssignmentPanel = () => {
    const [activeTab, setActiveTab] = useState('1');
    const [showFilters, setShowFilters] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDateRange, setSelectedDateRange] = useState(null);
    const [priorityFilter, setPriorityFilter] = useState('all');
    const [assignerFilter, setAssignerFilter] = useState('all');
    const theme = useSelector(selectTheme);
    const user = useSelector(selectUser);
    const userId = useSelector(selectUserId);
    const userFullName = (user?.name || [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || 'Your').trim();
    
    // Fetch all users to populate assigner filter
    const { data: allUsersData } = useGetAllUsersQuery();
    
    // Fetch tasks to get suggestions for search
    const { data: tasksData } = useGetTaskAssignQuery(userId);
    
    // Generate search suggestions from tasks
    const searchSuggestions = useMemo(() => {
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
    
    // Quick date range options for suggestions
    const dateRangeOptions = useMemo(() => [
        {
            label: 'Today',
            value: [dayjs(), dayjs()],
        },
        {
            label: 'This Week',
            value: [dayjs().startOf('week'), dayjs().endOf('week')],
        },
        {
            label: 'This Month',
            value: [dayjs().startOf('month'), dayjs().endOf('month')],
        },
        {
            label: 'Last 7 Days',
            value: [dayjs().subtract(7, 'day'), dayjs()],
        },
        {
            label: 'Last 30 Days',
            value: [dayjs().subtract(30, 'day'), dayjs()],
        },
    ], []);

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
        setActiveTab(key)
    };

    const renderTabContent = () => {
        const filterProps = {
            searchTerm,
            selectedDateRange,
            priorityFilter,
            assignerFilter
        };
        
        switch (activeTab) {
            case '1':
            case '2':
            case '3':
            case '4':
                return <AllUserTaskEntries activeTab={activeTab} {...filterProps} />;
            default:
                return <AllUserTaskEntries activeTab="1" {...filterProps} />;
        }
    };

    return (
        <div id="UserTaskAssignmentPanel" className={`theme-${theme}`}>
            <h2 style={{ textTransform: 'capitalize' }}>{userFullName} Tasks Management</h2>
            <div className="MarginTopMedium">
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
                                    // {
                                    //     key: '2',
                                    //     label: 'Upcoming Tasks'
                                    // },
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
                        <div className="AddFilterButton" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            <Button
                                icon={<BsFilter />}
                                onClick={toggleFilters}
                                className={showFilters ? 'filter-active' : ''}
                            >
                                Filters
                            </Button>
                        </div>
                    </Col>
                </Row>

                {/* Filter Section */}
                {showFilters && (
                    <div className="filters-section MarginBottomSmall" style={{
                        padding: '16px',
                        backgroundColor: 'var(--secondary-bg)',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)'
                    }}>
                        <Row gutter={[16, 16]} align="middle">
                            <Col xs={24} sm={24} md={12} lg={12}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <BsSearch style={{ color: 'var(--secondary-text)' }} />
                                    <AutoComplete
                                        value={searchTerm}
                                        onChange={setSearchTerm}
                                        options={searchSuggestions}
                                        placeholder="Search by task name, client name, or category..."
                                        style={{ flex: 1 }}
                                        allowClear
                                        filterOption={(inputValue, option) =>
                                            option?.value?.toLowerCase().includes(inputValue.toLowerCase()) || false
                                        }
                                        onSelect={(value) => setSearchTerm(value)}
                                        notFoundContent={searchTerm && searchSuggestions.length === 0 ? "No suggestions found" : null}
                                    />
                                </div>
                            </Col>
                            <Col xs={24} sm={24} md={12} lg={12}>
                                <DatePicker.RangePicker
                                    placeholder={['Start Date', 'End Date']}
                                    value={selectedDateRange}
                                    onChange={setSelectedDateRange}
                                    style={{ width: '100%' }}
                                    presets={dateRangeOptions}
                                />
                            </Col>
                            <Col xs={24} sm={24} md={12} lg={6}>
                                <Select
                                    value={priorityFilter}
                                    onChange={setPriorityFilter}
                                    placeholder="Filter by priority"
                                    style={{ width: '100%' }}
                                    showSearch
                                    filterOption={(input, option) =>
                                        (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                                    }
                                >
                                    <Select.Option value="all">All priorities</Select.Option>
                                    <Select.Option value="high">
                                        <span style={{ color: '#ff4d4f' }}>🔴</span> High Priority
                                    </Select.Option>
                                    <Select.Option value="medium">
                                        <span style={{ color: '#faad14' }}>🟡</span> Medium Priority
                                    </Select.Option>
                                    <Select.Option value="low">
                                        <span style={{ color: '#52c41a' }}>🟢</span> Low Priority
                                    </Select.Option>
                                </Select>
                            </Col>
                            <Col xs={24} sm={24} md={12} lg={6}>
                                <Select
                                    value={assignerFilter}
                                    onChange={setAssignerFilter}
                                    placeholder="Filter by assigner"
                                    style={{ width: '100%' }}
                                    showSearch
                                    filterOption={(input, option) =>
                                        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                                    }
                                    optionLabelProp="label"
                                >
                                    <Select.Option value="all" label="All assigners">All assigners</Select.Option>
                                    {(allUsersData?.data || []).map((usr) => {
                                        const userName = `${usr.firstName || ''} ${usr.lastName || ''}`.trim() || usr.email || usr.userId;
                                        return (
                                            <Select.Option key={usr.userId} value={usr.userId} label={userName}>
                                                {userName}
                                                {usr.email && usr.email !== userName && (
                                                    <span style={{ color: 'var(--secondary-text)', fontSize: '12px', marginLeft: '8px' }}>
                                                        ({usr.email})
                                                    </span>
                                                )}
                                            </Select.Option>
                                        );
                                    })}
                                </Select>
                            </Col>
                            <Col xs={24} sm={24} md={12} lg={6}>
                                <Button
                                    onClick={clearFilters}
                                    style={{ width: '100%' }}
                                >
                                    Clear Filters
                                </Button>
                            </Col>
                        </Row>
                    </div>
                )}

                <div>
                    <div className="AntdTabsContent user-AntdTabsContent">
                        {renderTabContent()}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserTaskAssignmentPanel;