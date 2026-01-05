import React, { useState, useMemo } from 'react';
import {
  Form,
  message,
  Row,
  Col,
  Card,
  List,
  Typography,
  Tag,
  Space,
  Empty,
  Button,
  Drawer,
  Tabs,
  Table,
  Modal,
  DatePicker,
  Select,
  Calendar,
  Alert,
  Input,
} from 'antd';
const { RangePicker } = DatePicker;
const { Option } = Select;
import dayjs from 'dayjs';
import CalenderModule from '../../../PortalCommonComponents/CalenderModule/CalenderModule';
import {
  useAddFestiveNoteMutation,
  useGetFestiveNotesByUserQuery,
  useUpdateFestiveMutation,
  useGetAllLeavesQuery,
  useGetAllUsersQuery,
  useRejectLeaveMutation,
  useCreateLeaveMutation,
} from '../../../../store/api';
import { useSelector } from 'react-redux';
import { useSocket } from '../../../../contexts/SocketContext';
import './FestiveCalender.css';

const { Title, Text } = Typography;

// Task color palette
const TASK_COLORS = [
  { id: 1, color: '#1890ff', label: 'Blue' },
  { id: 2, color: '#52c41a', label: 'Green' },
  { id: 3, color: '#faad14', label: 'Orange' },
  { id: 4, color: '#f5222d', label: 'Red' },
  { id: 5, color: '#722ed1', label: 'Purple' },
  { id: 6, color: '#13c2c2', label: 'Cyan' },
];

// Fixed holidays
const FIXED_HOLIDAYS = {
  '01-01': { name: 'New Year', emoji: '🎉' },
  '01-26': { name: 'Republic Day', emoji: '🏵️' },
  '08-15': { name: 'Independence Day', emoji: '🇮🇳' },
  '10-02': { name: 'Gandhi Jayanti', emoji: '🕊️' },
  '12-25': { name: 'Christmas', emoji: '🎄' },
};

const FestiveCalender = () => {
  const [selectedDate, setSelectedDate] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedColor, setSelectedColor] = useState(TASK_COLORS[0].color);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [form] = Form.useForm();

  const userId = useSelector(
    (state) => state.auth?.userId || state.auth?.user?._id || state.auth?.user?.id
  );

  const [addFestiveNote] = useAddFestiveNoteMutation();
  const [updateFestive] = useUpdateFestiveMutation();
  const { data: festiveNotesData, refetch } = useGetFestiveNotesByUserQuery(userId, {
    skip: !userId,
  });

  // Leaves / approvals
  const [createLeave] = useCreateLeaveMutation();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [dateModalVisible, setDateModalVisible] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);

  // Map of leaveId -> Set(dateStr)
  const [selectedDates, setSelectedDates] = useState(new Map());
  // Map of `${leaveId}-${dateStr}` -> 'approve' | 'reject'
  const [dateActions, setDateActions] = useState(new Map());

  // Map userId -> { approved:Set, rejected:Set, instructions:string }
  const [pendingSelections, setPendingSelections] = useState(new Map());

  // userId when opening modal from all-users table
  const [modalContextUserId, setModalContextUserId] = useState(null);
  const [modalInstructions, setModalInstructions] = useState('');

  // Emergency leave creation states
  const [emergencyLeaveModalVisible, setEmergencyLeaveModalVisible] = useState(false);
  const [selectedUserForLeave, setSelectedUserForLeave] = useState(null);
  const [emergencyLeaveDates, setEmergencyLeaveDates] = useState(new Set());
  const [emergencyLeaveReason, setEmergencyLeaveReason] = useState('');

  const { data: allLeavesData, refetch: refetchAllLeaves } = useGetAllLeavesQuery();
  const { data: allUsersData } = useGetAllUsersQuery();
  const { socket } = useSocket(); // kept (no functionality change)
  const [rejectLeave] = useRejectLeaveMutation();

  // ----------------------------
  // FESTIVE TASKS HELPERS
  // ----------------------------
  const getTasksForDate = (date) => {
    const dateStr = dayjs(date).format('YYYY-MM-DD');
    const buckets = festiveNotesData?.data || [];
    const bucket = buckets.find((b) => b.date === dateStr);

    const notes = (bucket?.notes || []).filter((n) => n?.archive !== true);

    // de-duplicate by title+color
    const seen = new Map();
    notes.forEach((n) => {
      const title = (n.note || '').trim();
      if (!title) return;

      const key = title.toLowerCase() + (n.color || '');
      if (!seen.has(key)) {
        seen.set(key, {
          id: n._id || `${dateStr}-${title}`,
          title,
          color: n.color || '#1890ff',
          noteId: n._id,
          description: n.description || '',
        });
      }
    });

    return Array.from(seen.values());
  };

  const allTasksWithDates = useMemo(() => {
    const buckets = festiveNotesData?.data || [];
    const tasksList = [];

    buckets.forEach((bucket) => {
      const dateStr = bucket.date;
      const notes = (bucket.notes || []).filter((n) => n?.archive !== true);

      notes.forEach((n) => {
        const title = (n.note || '').trim();
        if (!title) return;

        tasksList.push({
          id: n._id || `${dateStr}-${title}`,
          title,
          color: n.color || '#1890ff',
          date: dateStr,
          description: n.description || '',
          noteId: n._id,
        });
      });
    });

    return tasksList.sort((a, b) => dayjs(b.date).diff(dayjs(a.date)));
  }, [festiveNotesData]);

  // ----------------------------
  // LEAVES DATA TRANSFORM
  // ----------------------------
  const usersWithLeaves = useMemo(() => {
    if (!allLeavesData?.data || !Array.isArray(allLeavesData.data)) return [];
    if (!allUsersData?.data || !Array.isArray(allUsersData.data)) return [];

    const usersMap = new Map();

    // create base users from allUsersData
    allUsersData.data.forEach((user) => {
      usersMap.set(user.userId || user._id, {
        id: user.userId || user._id,
        name:
          `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
          user.userId ||
          'Unknown',
        email: user.email || user.userEmail || '',
        position: user.position || user.role || '',
        leaves: [],
      });
    });

    // attach leaves
    allLeavesData.data.forEach((userLeaveData) => {
      const uId = userLeaveData.userId;

      if (!usersMap.get(uId)) {
        usersMap.set(uId, {
          id: uId,
          name: uId,
          email: '',
          position: '',
          leaves: [],
        });
      }

      const userForLeaves = usersMap.get(uId);
      const leaves = [];

      if (userLeaveData.months && Array.isArray(userLeaveData.months)) {
        userLeaveData.months.forEach((monthData) => {
          if (monthData.leaves && Array.isArray(monthData.leaves)) {
            monthData.leaves.forEach((leave) => {
              const startDate = dayjs(leave.startDate);
              const endDate = dayjs(leave.endDate);

              const dates = [];
              let currentDate = startDate;

              while (currentDate.isBefore(endDate) || currentDate.isSame(endDate)) {
                dates.push(currentDate.format('YYYY-MM-DD'));
                currentDate = currentDate.add(1, 'day');
              }

              leaves.push({
                id: leave._id,
                dates,
                reason: monthData.reason || leave.reason || 'No reason provided',
                status: leave.status || 'pending',
                createdAt: leave.createdAt || leave.updatedAt || new Date().toISOString(),
                leaveData: leave,
                monthData,
                approvedDates: Array.isArray(leave.approvedDates)
                  ? leave.approvedDates.map((d) => dayjs(d).format('YYYY-MM-DD'))
                  : [],
                rejectedDates: Array.isArray(leave.rejectedDates)
                  ? leave.rejectedDates.map((d) => dayjs(d).format('YYYY-MM-DD'))
                  : [],
              });
            });
          }
        });
      }

      userForLeaves.leaves = leaves;
    });

    return Array.from(usersMap.values()).filter((u) => u.leaves.length > 0);
  }, [allLeavesData, allUsersData]);

  const usersWithPendingLeaves = useMemo(() => {
    return usersWithLeaves
      .map((user) => ({
        ...user,
        leaves: user.leaves.filter((l) => l.status === 'pending'),
      }))
      .filter((user) => user.leaves.length > 0);
  }, [usersWithLeaves]);

  const getUserLeavesByStatus = useMemo(() => {
    if (!selectedUser) return { approved: [], pending: [], cancelled: [], all: [] };

    const user = usersWithLeaves.find((u) => u.id === selectedUser);
    if (!user) return { approved: [], pending: [], cancelled: [], all: [] };

    const approved = user.leaves.filter((l) => l.status === 'approved');
    const pending = user.leaves.filter((l) => l.status === 'pending');
    const cancelled = user.leaves.filter((l) => l.status === 'cancelled');
    const all = user.leaves.sort((a, b) => dayjs(b.createdAt).diff(dayjs(a.createdAt)));

    return { approved, pending, cancelled, all };
  }, [selectedUser, usersWithLeaves]);

  const currentUser = useMemo(() => {
    if (!selectedUser) return null;
    return usersWithLeaves.find((u) => u.id === selectedUser);
  }, [selectedUser, usersWithLeaves]);

  // ----------------------------
  // LEAVES ACTIONS / UI HANDLERS
  // ----------------------------
  const submitUserSelections = async (userRecord) => {
    const saved = pendingSelections.get(userRecord.id);
    if (!saved) return;

    const user = usersWithLeaves.find((u) => u.id === userRecord.id);
    if (!user) return;

    // group selected dates by leave id
    const selectionsByLeave = new Map();

    const addToMap = (dateStr, type) => {
      const leave = user.leaves.find((l) => l.dates.includes(dateStr));
      if (!leave) return;

      const key = leave.id;
      const entry =
        selectionsByLeave.get(key) || {
          approved: new Set(),
          rejected: new Set(),
          month: leave.monthData?.month,
          leaveId: leave.id,
        };

      entry[type].add(dateStr);
      selectionsByLeave.set(key, entry);
    };

    saved.approved?.forEach((d) => addToMap(d, 'approved'));
    saved.rejected?.forEach((d) => addToMap(d, 'rejected'));

    for (const [, entry] of selectionsByLeave) {
      const fallbackDate = Array.from(entry.approved)[0] || Array.from(entry.rejected)[0];
      const monthCode =
        entry.month || (fallbackDate ? dayjs(fallbackDate).format('MMM').toUpperCase() : undefined);

      const body = {
        approverId: userId,
        instructions: saved?.instructions || '',
        approvedDates: Array.from(entry.approved),
        rejectedDates: Array.from(entry.rejected),
      };

      await rejectLeave({
        userId: userRecord.id,
        month: monthCode,
        leaveId: entry.leaveId,
        body,
      }).unwrap();
    }

    setPendingSelections((prev) => {
      const next = new Map(prev);
      next.delete(userRecord.id);
      return next;
    });

    refetchAllLeaves();
  };

  const handleViewUserLeaves = (uId) => {
    setSelectedUser(uId);
    setDrawerVisible(true);
  };

  const handleCreateEmergencyLeave = (uId) => {
    setSelectedUserForLeave(uId);
    setEmergencyLeaveModalVisible(true);
    setEmergencyLeaveDates(new Set());
    setEmergencyLeaveReason('');
  };

  const handleDrawerClose = () => {
    setDrawerVisible(false);
    setSelectedUser(null);
    setDateModalVisible(false);
    setSelectedLeave(null);
    setSelectedDates(new Map());
    setDateActions(new Map());
    setEmergencyLeaveModalVisible(false);
    setSelectedUserForLeave(null);
    setEmergencyLeaveDates(new Set());
    setEmergencyLeaveReason('');
    setModalContextUserId(null);
    setModalInstructions('');
  };

  const handleOpenDateModal = (leave, userIdForContext = null) => {
    setSelectedLeave(leave);
    setModalContextUserId(userIdForContext);

    if (userIdForContext) {
      const saved = pendingSelections.get(userIdForContext);
      setModalInstructions(saved?.instructions || '');
    } else {
      setModalInstructions('');
    }

    setDateModalVisible(true);
  };

  const buildUserFlattenedLeave = (user) => {
    if (!user) return null;

    const flatDates = Array.from(
      new Set(
        user.leaves.flatMap((l) => {
          const approved = new Set(l.approvedDates || []);
          const rejected = new Set(l.rejectedDates || []);
          return (l.dates || []).filter((d) => !approved.has(d) && !rejected.has(d));
        })
      )
    );

    return {
      id: `${user.id}__bulk`,
      dates: flatDates.sort((a, b) => dayjs(a).diff(dayjs(b))),
      reason: user.leaves[0]?.reason || 'User Leaves',
      createdAt: user.leaves[0]?.createdAt || new Date().toISOString(),
    };
  };

  const handleDateSelect = (dateStr, leaveId) => {
    setSelectedDates((prevDates) => {
      const nextDates = new Map(prevDates);
      const dates = nextDates.get(leaveId) || new Set();

      if (dates.has(dateStr)) {
        // deselect
        dates.delete(dateStr);
        if (dates.size === 0) nextDates.delete(leaveId);
        else nextDates.set(leaveId, dates);

        // remove action
        const key = `${leaveId}-${dateStr}`;
        setDateActions((prev) => {
          const next = new Map(prev);
          next.delete(key);
          return next;
        });
      } else {
        // select
        dates.add(dateStr);
        nextDates.set(leaveId, dates);
      }

      return nextDates;
    });
  };

  const handleDateAction = (dateStr, leaveId, action) => {
    const key = `${leaveId}-${dateStr}`;

    // ensure date selected
    setSelectedDates((prevDates) => {
      const nextDates = new Map(prevDates);
      const dates = nextDates.get(leaveId) || new Set();
      if (!dates.has(dateStr)) {
        dates.add(dateStr);
        nextDates.set(leaveId, dates);
      }
      return nextDates;
    });

    // toggle / set action
    setDateActions((prev) => {
      const next = new Map(prev);
      const currentAction = prev.get(key);

      if (currentAction === action) next.delete(key);
      else next.set(key, action);

      return next;
    });
  };

  const handleApproveDate = (dateStr, leaveId) => {
    handleDateAction(dateStr, leaveId, 'approve');
  };

  const handleRejectDate = (dateStr, leaveId) => {
    handleDateAction(dateStr, leaveId, 'reject');
  };

  const getDateStatus = (dateStr, leaveId) => {
    const action = dateActions.get(`${leaveId}-${dateStr}`);
    if (action === 'approve') return 'Leave is Approved';
    if (action === 'reject') return 'Leave is Rejected';
    return null;
  };

  // ✅ This is the block that was floating outside (now correctly inside a function)
  // Kept as-is (no functionality change). You can use it if you later want to submit instantly.
  const handleSubmitLeaveDates = async (leaveId) => {
    const dates = selectedDates.get(leaveId);
    if (!dates || dates.size === 0) {
      message.warning('Please select at least one date');
      return;
    }

    const updates = Array.from(dates).map((dateStr) => ({
      date: dateStr,
      action: dateActions.get(`${leaveId}-${dateStr}`) || 'approve',
    }));

    console.log('Updating leave:', leaveId, updates);
    message.success(`${updates.length} date(s) updated successfully`);

    // Reset selections for this leave
    setSelectedDates((prev) => {
      const next = new Map(prev);
      next.delete(leaveId);
      return next;
    });

    // Remove date actions for this leave
    setDateActions((prev) => {
      const next = new Map(prev);
      Array.from(dates).forEach((dateStr) => {
        next.delete(`${leaveId}-${dateStr}`);
      });
      return next;
    });
  };

  // ----------------------------
  // EMERGENCY LEAVE
  // ----------------------------
  const handleEmergencyLeaveDateSelect = (date) => {
    const dateStr = dayjs(date).format('YYYY-MM-DD');
    setEmergencyLeaveDates((prev) => {
      const next = new Set(prev);
      if (next.has(dateStr)) next.delete(dateStr);
      else next.add(dateStr);
      return next;
    });
  };

  const handleSubmitEmergencyLeave = async () => {
    if (!selectedUserForLeave || emergencyLeaveDates.size === 0 || !emergencyLeaveReason.trim()) {
      message.warning('Please select dates and provide a reason');
      return;
    }

    const sortedDates = Array.from(emergencyLeaveDates).sort();
    const leaves = [];
    let currentRange = { startDate: sortedDates[0], endDate: sortedDates[0] };

    for (let i = 1; i < sortedDates.length; i++) {
      const current = dayjs(sortedDates[i]);
      const previous = dayjs(sortedDates[i - 1]);

      if (current.diff(previous, 'day') === 1) {
        currentRange.endDate = sortedDates[i];
      } else {
        leaves.push(currentRange);
        currentRange = { startDate: sortedDates[i], endDate: sortedDates[i] };
      }
    }
    leaves.push(currentRange);

    const monthAbbr = dayjs(sortedDates[0]).format('MMM').toUpperCase();

    const body = {
      userId: selectedUserForLeave,
      month: monthAbbr,
      reason: emergencyLeaveReason.trim(),
      leaves,
      isHRLeave: true,
    };

    try {
      await createLeave(body).unwrap();
      message.success('Emergency leave created successfully');
      setEmergencyLeaveModalVisible(false);
      setSelectedUserForLeave(null);
      setEmergencyLeaveReason('');
      setEmergencyLeaveDates(new Set());
      refetchAllLeaves();
    } catch (e) {
      message.error(e?.data?.message || e?.message || 'Failed to create emergency leave');
    }
  };

  // ----------------------------
  // HOLIDAYS & CALENDAR HANDLERS
  // ----------------------------
  const getHolidayForDate = (date) => {
    const md = dayjs(date).format('MM-DD');
    return FIXED_HOLIDAYS[md] || null;
  };

  const handleDateClick = (date, info) => {
    if (info && info.source && info.source !== 'date') return;

    setSelectedDate(date);
    setIsModalVisible(true);
    setSelectedColor(TASK_COLORS[0].color);
    setEditingNoteId(null);

    form.resetFields();
    form.setFieldsValue({ color: TASK_COLORS[0].color });
  };

  const handleSaveTask = async (date, values, editingId) => {
    try {
      const dateStr = dayjs(date).format('YYYY-MM-DD');
      const dateTasks = getTasksForDate(date);

      if (!editingId && dateTasks.length >= 4) {
        message.warning('Maximum 4 tasks allowed per date!');
        return;
      }

      if (editingId) {
        await updateFestive({
          date: dateStr,
          noteId: editingId,
          note: values.title,
          description: values.description || '',
          color: values.color || selectedColor,
          archive: false,
        }).unwrap();
        message.success('Task updated successfully!');
      } else {
        await addFestiveNote({
          date: dateStr,
          note: values.title,
          description: values.description || '',
          userId,
          color: values.color || selectedColor,
        }).unwrap();
        message.success('Task added successfully!');
      }

      await refetch();
      form.resetFields();
      setSelectedColor(TASK_COLORS[0].color);
      setEditingNoteId(null);
      setIsModalVisible(false);
    } catch (e) {
      message.error(e?.data?.message || e?.message || 'Failed to save task');
      throw e; // keep as-is (CalenderModule validation flow)
    }
  };

  const handleArchiveTask = async (date, task) => {
    try {
      await updateFestive({
        date: dayjs(date).format('YYYY-MM-DD'),
        noteId: task.noteId,
        note: task.title,
        color: task.color,
        description: task.description || '',
        archive: true,
      }).unwrap();

      await refetch();
      message.success('Archived successfully');
      setIsModalVisible(false);
    } catch (e) {
      message.error(e?.data?.message || 'Failed to archive');
    }
  };

  const handleEditTask = (task) => {
    setSelectedColor(task.color);
    setEditingNoteId(task.noteId);
    form.setFieldsValue({
      title: task.title,
      description: task.description,
      color: task.color,
    });
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
    setSelectedColor(TASK_COLORS[0].color);
    setEditingNoteId(null);
    form.resetFields();
  };

  // ----------------------------
  // RENDER
  // ----------------------------
  return (
    <div className="festive-calendar-page">
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 level={4} style={{ margin: 0 }}>Festive Calendar</h2>
              <Button
                type="primary"
                className="global-action-btn"
                onClick={() => {
                  setSelectedUserForLeave(null);
                  setEmergencyLeaveModalVisible(true);
                  setEmergencyLeaveDates(new Set());
                  setEmergencyLeaveReason('');
                }}
              >
                Submit Leave for User
              </Button>
            </div>
          }>
            <CalenderModule
              title=""
              maxTasksPerDate={4}
              holidays={FIXED_HOLIDAYS}
              showActions={true}
              getTasksForDate={getTasksForDate}
              getHolidayForDate={getHolidayForDate}
              onDateSelect={handleDateClick}
              onSaveTask={handleSaveTask}
              onArchiveTask={handleArchiveTask}
              onEditTask={handleEditTask}
              onModalCancel={handleModalCancel}
              selectedDate={selectedDate}
              isModalVisible={isModalVisible}
              setIsModalVisible={setIsModalVisible}
              editingNoteId={editingNoteId}
              form={form}
              selectedColor={selectedColor}
              setSelectedColor={setSelectedColor}
              taskColors={TASK_COLORS}
            />
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card
            title={<h2 level={5} style={{ margin: 0 }}>Tasks</h2>}
            style={{ marginBottom: 16 }}
            className="festive-tasks-container"
          >
            <div className="festive-tasks-list">
              {allTasksWithDates.length === 0 ? (
                <Empty className="Colorset" description="No tasks added yet" />
              ) : (
                <List
                  dataSource={allTasksWithDates}
                  renderItem={(item) => (
                    <List.Item className="festive-task-item">
                      <List.Item.Meta
                        title={
                          <Space>
                            <span
                              className="festive-task-color-dot"
                              style={{ backgroundColor: item.color }}
                            />
                            <Text strong>{item.title}</Text>
                          </Space>
                        }
                        description={
                          <Space direction="vertical" size={4}>
                            <Tag color="blue">{dayjs(item.date).format('MMM DD, YYYY')}</Tag>
                            {item.description && (
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {item.description}
                              </Text>
                            )}
                          </Space>
                        }
                      />
                    </List.Item>
                  )}
                />
              )}
            </div>
          </Card>

          <Card
            title={<h2 level={5} style={{ margin: 0 }}>Latest Leaves</h2>}
            className="festive-leaves-container"
          >
            <div className="festive-leaves-list">
              {usersWithPendingLeaves.length === 0 ? (
                <Empty description="No pending leaves" />
              ) : (
                <List
                  dataSource={usersWithPendingLeaves.slice(0, 5)}
                  renderItem={(user) => (
                    <List.Item className="festive-leave-item">
                      <List.Item.Meta
                        title={
                          <Space direction="vertical" size={4} style={{ width: '100%' }}>
                            <Text strong>{user.name}</Text>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {user.position}
                            </Text>
                            <Text type="secondary" style={{ fontSize: 11 }}>
                              {user.email}
                            </Text>
                            <div style={{ marginTop: 4 }}>
                              <Tag color="blue">
                                {user.leaves.length} Leave{user.leaves.length !== 1 ? 's' : ''}
                              </Tag>
                            </div>
                          </Space>
                        }
                      />
                    </List.Item>
                  )}
                />
              )}
            </div>

            <div className="festive-leaves-view-button">
              <Button
                type="default"
                className="global-action-btn"
                block
                onClick={() => {
                  setSelectedUser(null);
                  setDrawerVisible(true);
                }}
                disabled={usersWithPendingLeaves.length === 0}
              >
                View Leaves
              </Button>
            </div>
          </Card>

          <Drawer
            title={
              selectedUser ? (
                <div className="drawer-header-content">
                  <Title level={4} style={{ margin: 0, color: 'var(--primary-text)' }}>
                    {currentUser?.name || 'User'} Leaves
                  </Title>
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    {currentUser?.email || ''} • {currentUser?.position || ''}
                  </Text>
                </div>
              ) : (
                <Title level={4} style={{ margin: 0, color: 'var(--primary-text)' }}>
                  All Users Leaves
                </Title>
              )
            }
            placement="right"
            onClose={handleDrawerClose}
            open={drawerVisible}
            width={selectedUser ? 1100 : 1000}
            className="festive-leaves-drawer"
          >
            {!selectedUser ? (
              <Table
                dataSource={usersWithPendingLeaves}
                rowKey="id"
                pagination={{
                  pageSize: 10,
                  showTotal: (total) => `Total ${total} employees`,
                  showSizeChanger: false,
                }}
                className="festive-leaves-table"
                columns={[
                  {
                    title: 'Employee Name',
                    key: 'userName',
                    dataIndex: 'name',
                    render: (name, record) => (
                      <Space direction="vertical" size={0}>
                        <Text strong style={{ fontSize: 15 }}>{name}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {record.position || '-'}
                        </Text>
                      </Space>
                    ),
                    width: 250,
                  },
                  {
                    title: 'Contact Information',
                    key: 'email',
                    dataIndex: 'email',
                    render: (email) => (
                      <Text type="secondary" style={{ fontSize: 13 }}>
                        {email || '-'}
                      </Text>
                    ),
                    width: 220,
                  },
                  {
                    title: 'Selected Status',
                    key: 'leavesStatus',
                    render: (_, record) => {
                      const saved = pendingSelections.get(record.id);
                      const approvedCount = saved?.approved?.size || 0;
                      const rejectedCount = saved?.rejected?.size || 0;
                      return (
                        <Space size={12}>
                          <Tag color="success" style={{ padding: '2px 10px', borderRadius: 4, margin: 0 }}>
                            Approve: <strong>{approvedCount}</strong>
                          </Tag>
                          <Tag color="error" style={{ padding: '2px 10px', borderRadius: 4, margin: 0 }}>
                            Reject: <strong>{rejectedCount}</strong>
                          </Tag>
                        </Space>
                      );
                    },
                    width: 240,
                  },
                  {
                    title: 'Pending Dates',
                    key: 'totalLeaves',
                    render: (_, record) => {
                      const totalDates = record.leaves.reduce((acc, l) => {
                        const approved = new Set(l.approvedDates || []);
                        const rejected = new Set(l.rejectedDates || []);
                        const remaining = (l.dates || []).filter((d) => !approved.has(d) && !rejected.has(d));
                        return acc + remaining.length;
                      }, 0);

                      return (
                        <Button
                          type="link"
                          className="total-leaves-btn"
                          onClick={() => {
                            const leave = buildUserFlattenedLeave(record);
                            handleOpenDateModal(leave, record.id);
                          }}
                          style={{ padding: 0 }}
                        >
                          <Tag color={totalDates > 0 ? 'processing' : 'default'} style={{ cursor: 'pointer' }}>
                            {totalDates} {totalDates === 1 ? 'Date' : 'Dates'}
                          </Tag>
                        </Button>
                      );
                    },
                    width: 150,
                  },
                  {
                    title: 'Action',
                    key: 'action',
                    align: 'center',
                    render: (_, record) => {
                      const saved = pendingSelections.get(record.id);
                      const approvedCount = saved?.approved?.size || 0;
                      const rejectedCount = saved?.rejected?.size || 0;
                      const isReady = approvedCount + rejectedCount > 0;

                      return (
                        <Button
                          type="primary"
                          disabled={!isReady}
                          className={`global-action-btn ${isReady ? '' : 'disabled'}`}
                          style={{ height: 32, fontSize: 12 }}
                          onClick={async () => {
                            try {
                              await submitUserSelections(record);
                              message.success(`Status updated for ${record.name}`);
                            } catch (e) {
                              message.error(e?.data?.message || e?.message || 'Failed to submit');
                            }
                          }}
                        >
                          Apply
                        </Button>
                      );
                    },
                    width: 120,
                  },
                ]}
              />
            ) : selectedUser && currentUser ? (
              <div className="user-leaves-view">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                  <Button
                    type="default"
                    onClick={() => setSelectedUser(null)}
                    className="global-secondary-btn back-btn"
                    style={{ height: 36, fontSize: 13 }}
                  >
                    ← Back to All Users
                  </Button>
                  <Button
                    type="primary"
                    onClick={() => handleCreateEmergencyLeave(selectedUser)}
                    className="global-action-btn"
                    style={{ height: 36, fontSize: 13 }}
                  >
                    Create Emergency Leave
                  </Button>
                </div>

                <Tabs defaultActiveKey="all" className="festive-tabs">
                  <Tabs.TabPane tab={`All Requests (${getUserLeavesByStatus.all.length})`} key="all">
                    <Table
                      dataSource={getUserLeavesByStatus.all}
                      rowKey="id"
                      pagination={{ pageSize: 10 }}
                      className="festive-leaves-table"
                      columns={[
                        {
                          title: 'Request ID',
                          key: 'reqId',
                          dataIndex: 'id',
                          render: (id) => <Text code style={{ fontSize: 11 }}>{id.slice(-8).toUpperCase()}</Text>,
                          width: 120,
                        },
                        {
                          title: 'Leave Dates',
                          key: 'leavesDates',
                          dataIndex: 'dates',
                          render: (dates, record) => {
                            const approved = new Set(record.approvedDates || []);
                            const rejected = new Set(record.rejectedDates || []);
                            const remaining = (dates || []).filter((d) => !approved.has(d) && !rejected.has(d));

                            return (
                              <Button
                                type="link"
                                className="total-leaves-btn"
                                disabled={remaining.length === 0}
                                onClick={() => handleOpenDateModal({ ...record, dates: remaining })}
                                style={{ padding: 0 }}
                              >
                                <Tag color={remaining.length > 0 ? 'processing' : 'default'}>
                                  {remaining.length} {remaining.length === 1 ? 'Date' : 'Dates'}
                                </Tag>
                              </Button>
                            );
                          },
                          width: 150,
                        },
                        {
                          title: 'Reason for Leave',
                          key: 'reason',
                          dataIndex: 'reason',
                          render: (reason) => (
                            <Text ellipsis={{ tooltip: reason }} style={{ maxWidth: 280, fontSize: 13 }}>
                              {reason}
                            </Text>
                          ),
                          width: 300,
                        },
                        {
                          title: 'Current Status',
                          key: 'status',
                          dataIndex: 'status',
                          render: (status) => {
                            const colorMap = {
                              approved: 'success',
                              pending: 'warning',
                              cancelled: 'error',
                            };
                            return (
                              <Tag color={colorMap[status] || 'default'} style={{ borderRadius: 4, textTransform: 'capitalize' }}>
                                {status || 'PENDING'}
                              </Tag>
                            );
                          },
                          width: 120,
                        },
                        {
                          title: 'Submitted On',
                          key: 'createdAt',
                          dataIndex: 'createdAt',
                          render: (createdAt) => (
                            <Text type="secondary" style={{ fontSize: 13 }}>
                              {dayjs(createdAt).format('MMM DD, YYYY')}
                            </Text>
                          ),
                          width: 150,
                        },
                      ]}
                    />
                  </Tabs.TabPane>

                  <Tabs.TabPane tab={`Approved (${getUserLeavesByStatus.approved.length})`} key="approved">
                    <Empty description="No approved leaves for this period" style={{ marginTop: 40 }} />
                  </Tabs.TabPane>

                  <Tabs.TabPane tab={`Pending (${getUserLeavesByStatus.pending.length})`} key="pending">
                    <Empty description="No pending leaves" style={{ marginTop: 40 }} />
                  </Tabs.TabPane>

                  <Tabs.TabPane tab={`Cancelled (${getUserLeavesByStatus.cancelled.length})`} key="cancelled">
                    <Empty description="No cancelled leaves" style={{ marginTop: 40 }} />
                  </Tabs.TabPane>
                </Tabs>
              </div>
            ) : (
              <Empty description="No user selected" />
            )}

            {/* Date Selection Modal */}
            <Modal
              title={<Text strong>Select Dates for Leave</Text>}
              open={dateModalVisible}
              onCancel={() => {
                setDateModalVisible(false);
                setSelectedLeave(null);
                setModalContextUserId(null);
                setModalInstructions('');
              }}
              footer={[
                <div className="FlexAdjustContainer" key="footer">
                  <Button
                    key="cancel"
                    onClick={() => {
                      setDateModalVisible(false);
                      setSelectedLeave(null);
                      setModalContextUserId(null);
                      setModalInstructions('');
                    }}
                    className="global-action-btn"
                  >
                    Cancel
                  </Button>
                  <Button
                    key="ok"
                    type="primary"
                    onClick={() => {
                      if (!selectedLeave) return;

                      // Save selections into pendingSelections when opened from all-users table
                      if (modalContextUserId) {
                        const datesSelected = selectedDates.get(selectedLeave.id);
                        const approved = new Set();
                        const rejected = new Set();

                        if (datesSelected && datesSelected.size) {
                          Array.from(datesSelected).forEach((dateStr) => {
                            const action = dateActions.get(`${selectedLeave.id}-${dateStr}`);
                            if (action === 'approve') approved.add(dateStr);
                            else if (action === 'reject') rejected.add(dateStr);
                          });
                        }

                        setPendingSelections((prev) => {
                          const next = new Map(prev);
                          const existing =
                            next.get(modalContextUserId) || { approved: new Set(), rejected: new Set(), instructions: '' };

                          approved.forEach((d) => existing.approved.add(d));
                          rejected.forEach((d) => existing.rejected.add(d));
                          existing.instructions = modalInstructions;

                          next.set(modalContextUserId, existing);
                          return next;
                        });
                      }

                      setDateModalVisible(false);
                      setSelectedLeave(null);
                      setModalContextUserId(null);
                      setModalInstructions('');

                      // NOTE: You were not submitting instantly before,
                      // so we are not calling handleSubmitLeaveDates() here.
                      // (Function exists to keep your previous block, but unused.)
                    }}
                    className="global-action-btn"
                  >
                    OK
                  </Button>
                </div>,
              ]}
              width={700}
              className="festive-date-modal"
            >
              {selectedLeave && (
                <div className="festive-date-modal-content">
                  {modalContextUserId && (
                    <div style={{ marginBottom: 12 }}>
                      <Text type="secondary" style={{ display: 'block', marginBottom: 6 }}>
                        Instructions (optional)
                      </Text>
                      <Input.TextArea
                        value={modalInstructions}
                        onChange={(e) => setModalInstructions(e.target.value)}
                        rows={2}
                        placeholder="Add approver instructions..."
                      />
                    </div>
                  )}

                  <div style={{ marginBottom: 16 }}>
                    <Text type="secondary">Select dates and choose approve or reject:</Text>
                  </div>

                  <div className="festive-modal-dates-list">
                    <Row gutter={[16, 16]}>
                      {selectedLeave.dates.map((dateStr) => {
                        const key = `${selectedLeave.id}-${dateStr}`;
                        const isSelected = selectedDates.get(selectedLeave.id)?.has(dateStr);
                        const action = dateActions.get(key);
                        const status = getDateStatus(dateStr, selectedLeave.id);

                        return (
                          <Col xs={24} key={dateStr}>
                            <Card
                              className={`festive-leave-reason-card ${isSelected ? 'selected' : ''} ${action ? `action-${action}` : ''
                                }`}
                              bodyStyle={{ padding: 16 }}
                            >
                              <div className="Leave-Reason-Content">
                                <div>
                                  <div className="festive-reason-header">
                                    <Button
                                      size="middle"
                                      type={isSelected ? 'primary' : 'default'}
                                      onClick={() => handleDateSelect(dateStr, selectedLeave.id)}
                                      className="global-action-btn"
                                      icon={isSelected ? <span className="festive-check-icon">✓</span> : null}
                                      style={{ marginBottom: 8 }}
                                    >
                                      {dayjs(dateStr).format('MMMM DD, YYYY')}
                                    </Button>
                                  </div>

                                  <div className="festive-reason-content">
                                    <Text>{selectedLeave.reason}</Text>
                                  </div>
                                </div>

                                <div className="Approved-Rejected-Buttons">
                                  <Button
                                    type={action === 'approve' ? 'primary' : 'default'}
                                    className={`global-action-btn approve ${action === 'approve' ? 'active' : ''}`}
                                    onClick={() => handleApproveDate(dateStr, selectedLeave.id)}
                                  >
                                    Approve
                                  </Button>

                                  <Button
                                    danger={action === 'reject'}
                                    type={action === 'reject' ? 'primary' : 'default'}
                                    className={`festive-action-btn reject ${action === 'reject' ? 'active' : ''}`}
                                    onClick={() => handleRejectDate(dateStr, selectedLeave.id)}
                                  >
                                    Reject
                                  </Button>
                                </div>
                              </div>

                              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-color)' }}>
                                <div className="Leave-Reason-Content">
                                  <div>
                                    <Space direction="vertical" size={4}>
                                      <Text type="secondary" style={{ fontSize: 12 }}>
                                        Requested Date:
                                      </Text>
                                      <Text style={{ fontSize: 13 }}>
                                        {dayjs(selectedLeave.createdAt).format('MMM DD, YYYY')}
                                      </Text>
                                    </Space>
                                  </div>

                                  {status && (
                                    <div className="ButtonClickStatus">
                                      <Tag color={action === 'approve' ? 'green' : 'red'} style={{ margin: 0 }}>
                                        {status}
                                      </Tag>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </Card>
                          </Col>
                        );
                      })}
                    </Row>
                  </div>

                  <div className="festive-selection-summary">
                    <Alert
                      message={
                        <Space>
                          <Text strong>Selection Summary:</Text>
                          <Tag color="blue" style={{ borderRadius: 12, padding: '0 12px' }}>
                            {selectedDates.get(selectedLeave.id)?.size || 0} Dates Selected
                          </Tag>
                        </Space>
                      }
                      type="info"
                      showIcon
                      style={{ borderRadius: 8 }}
                    />
                  </div>
                </div>
              )}
            </Modal>
          </Drawer>

          {/* Emergency Leave Creation Modal */}
          <Modal
            title={<Text strong>Create Emergency Leave</Text>}
            open={emergencyLeaveModalVisible}
            onCancel={() => {
              setEmergencyLeaveModalVisible(false);
              setSelectedUserForLeave(null);
              setEmergencyLeaveDates(new Set());
              setEmergencyLeaveReason('');
            }}
            footer={[
              <Button
                key="cancel"
                onClick={() => {
                  setEmergencyLeaveModalVisible(false);
                  setSelectedUserForLeave(null);
                  setEmergencyLeaveDates(new Set());
                  setEmergencyLeaveReason('');
                }}
                className="global-action-btn"
              >
                Cancel
              </Button>,
              <Button
                key="submit"
                type="primary"
                onClick={handleSubmitEmergencyLeave}
                className="global-action-btn"
              >
                Create Leave
              </Button>,
            ]}
            width={800}
            className="emergency-leave-modal"
          >
            {emergencyLeaveModalVisible && (
              <div className="emergency-leave-modal-content">
                <div style={{ marginBottom: 16 }}>
                  <Text strong>Select Employee:</Text>
                  <Select
                    showSearch
                    style={{ width: '100%', marginTop: 8 }}
                    placeholder="Search for an employee..."
                    optionFilterProp="children"
                    value={selectedUserForLeave}
                    onChange={(val) => setSelectedUserForLeave(val)}
                  >
                    {allUsersData?.data?.map(u => (
                      <Option key={u.userId || u._id} value={u.userId || u._id}>
                        {`${u.firstName || ''} ${u.lastName || ''}`.trim() || u.userId || u.email}
                      </Option>
                    ))}
                  </Select>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <Text strong>Reason for Leave:</Text>
                  <Input.TextArea
                    value={emergencyLeaveReason}
                    onChange={(e) => setEmergencyLeaveReason(e.target.value)}
                    rows={3}
                    placeholder="Enter reason for emergency leave..."
                    style={{ marginTop: 8 }}
                  />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <Text strong>Select Leave Dates:</Text>
                  <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ background: 'var(--secondary-bg)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <Text type="secondary" style={{ display: 'block', marginBottom: '8px' }}>Select Range (for long leaves):</Text>
                      <RangePicker
                        style={{ width: '100%' }}
                        className="global-range-picker"
                        onChange={(dates) => {
                          if (dates) {
                            const [start, end] = dates;
                            const nextDates = new Set(emergencyLeaveDates);
                            let curr = dayjs(start);
                            while (curr.isBefore(end) || curr.isSame(end, 'day')) {
                              nextDates.add(curr.format('YYYY-MM-DD'));
                              curr = curr.add(1, 'day');
                            }
                            setEmergencyLeaveDates(nextDates);
                          }
                        }}
                      />
                    </div>

                    <div style={{ background: 'var(--secondary-bg)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <Text type="secondary" style={{ display: 'block', marginBottom: '8px' }}>Or toggle individual dates:</Text>
                      <Calendar fullscreen={false} onSelect={handleEmergencyLeaveDateSelect} />
                    </div>
                  </div>
                </div>

                <div>
                  <Text strong>Selected Dates:</Text>
                  <div style={{ marginTop: 8 }}>
                    {emergencyLeaveDates.size === 0 ? (
                      <Text type="secondary">No dates selected</Text>
                    ) : (
                      <Space wrap>
                        {Array.from(emergencyLeaveDates)
                          .sort()
                          .map((dateStr) => (
                            <Tag
                              key={dateStr}
                              closable
                              onClose={() => handleEmergencyLeaveDateSelect(dayjs(dateStr))}
                              color="blue"
                            >
                              {dayjs(dateStr).format('MMM DD, YYYY')}
                            </Tag>
                          ))}
                      </Space>
                    )}
                  </div>
                </div>
              </div>
            )}
          </Modal>
        </Col>
      </Row>
    </div>
  );
};

export default FestiveCalender;
