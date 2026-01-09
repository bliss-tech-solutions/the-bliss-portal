import React, { useState, useEffect, useMemo } from 'react';
import './DailyTaskCalendar.css';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Plus,
  Calendar as CalendarIcon,
  Clock,
  Check,
  X
} from 'lucide-react';
import { Modal, Input, Button, Select, Form, TimePicker, Drawer, List, Tag, Collapse, Switch, Table, Tabs } from 'antd'; // Added Table, Tabs
import dayjs from 'dayjs';
import { useNotification } from '../../../contexts/NotificationContext';
import { useSelector } from 'react-redux';
import { selectUserId, selectUser } from '../../../store/slices/authSlice';
import {
  useCreateLeaveMutation,
  useGetUserLeavesQuery,
  useGetAllLeavesQuery,
  useGetAllUsersQuery,
  useRejectLeaveMutation,
  useAddFestiveNoteMutation,
  useUpdateFestiveMutation,
  useDeleteFestiveNoteMutation,
  useGetFestiveNotesByUserQuery
} from '../../../store/api';

const DailyTaskCalendar = ({
  initialEvents = [],
  userRole = 'user',
  onEventAdd
}) => {
  const { showSuccess, showError, warning } = useNotification();
  const userId = useSelector(selectUserId);
  const currentUser = useSelector(selectUser);
  const isHR = currentUser?.role === 'HR';

  // HR States
  const [bypassHolidays, setBypassHolidays] = useState(false);
  const [targetUserId, setTargetUserId] = useState(userId);

  // API Hooks
  const [createLeave, { isLoading: isCreating }] = useCreateLeaveMutation();
  const { data: usersData } = useGetAllUsersQuery(undefined, { skip: !isHR });
  const { data: leavesData, isLoading: isLoadingLeaves, refetch: refetchLeaves } = useGetUserLeavesQuery(targetUserId, {
    skip: !targetUserId
  });

  // Festive Notes Hooks
  const [addFestiveNote] = useAddFestiveNoteMutation();
  const [updateFestiveNote] = useUpdateFestiveMutation();
  const [deleteFestiveNote] = useDeleteFestiveNoteMutation();
  const { data: festiveNotesData, refetch: refetchNotes } = useGetFestiveNotesByUserQuery(targetUserId, {
    skip: !targetUserId,
  });

  // HR Leave Management Hooks
  const { data: allLeavesData, isLoading: isLoadingAllLeaves, refetch: refetchAllLeaves } = useGetAllLeavesQuery(undefined, { skip: !isHR });
  const [rejectLeaveMutation] = useRejectLeaveMutation();

  // HR Management States
  const [historyTab, setHistoryTab] = useState('personal'); // 'personal' | 'management'
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [selectedLeaveForReview, setSelectedLeaveForReview] = useState(null);
  const [reviewDatesSelection, setReviewDatesSelection] = useState({ approved: new Set(), rejected: new Set() });
  const [reviewInstructions, setReviewInstructions] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // HR Data Transformation: Flatten all user leaves for management table
  const managementLeaves = useMemo(() => {
    if (!allLeavesData?.data || !Array.isArray(allLeavesData.data)) return [];
    if (!usersData?.data || !Array.isArray(usersData.data)) return [];

    const usersMap = new Map();
    usersData.data.forEach(user => {
      usersMap.set(user.userId || user._id, {
        id: user.userId || user._id,
        name: `${user.firstName || user.name || ''} ${user.lastName || ''}`.trim() || 'Unknown',
        role: user.role
      });
    });

    const flatLeaves = [];
    allLeavesData.data.forEach(userRecord => {
      const uId = userRecord.userId;
      const user = usersMap.get(uId);

      if (userRecord.months && Array.isArray(userRecord.months)) {
        userRecord.months.forEach(monthData => {
          if (monthData.leaves && Array.isArray(monthData.leaves)) {
            monthData.leaves.forEach(leave => {
              // Generate date range
              const startDate = dayjs(leave.startDate);
              const endDate = dayjs(leave.endDate);
              const dates = [];
              let current = startDate;
              while (current.isBefore(endDate) || current.isSame(endDate, 'day')) {
                dates.push(current.format('YYYY-MM-DD'));
                current = current.add(1, 'day');
              }

              flatLeaves.push({
                ...leave,
                key: leave._id,
                userId: uId,
                userName: user?.name || uId,
                userRole: user?.role || 'user',
                month: monthData.month,
                dates: dates,
                submissionDate: leave.createdAt || leave.updatedAt
              });
            });
          }
        });
      }
    });
    return flatLeaves.sort((a, b) => dayjs(b.submissionDate).diff(dayjs(a.submissionDate)));
  }, [allLeavesData, usersData]);

  const handleOpenReview = (leave) => {
    setSelectedLeaveForReview(leave);
    setReviewDatesSelection({
      approved: new Set(leave.approvedDates || []),
      rejected: new Set(leave.rejectedDates || [])
    });
    setReviewInstructions('');
    setReviewModalVisible(true);
  };

  const handleToggleReviewDate = (date, type) => {
    setReviewDatesSelection(prev => {
      const nextApproved = new Set(prev.approved);
      const nextRejected = new Set(prev.rejected);

      if (type === 'approve') {
        if (nextApproved.has(date)) {
          nextApproved.delete(date);
        } else {
          nextApproved.add(date);
          nextRejected.delete(date);
        }
      } else {
        if (nextRejected.has(date)) {
          nextRejected.delete(date);
        } else {
          nextRejected.add(date);
          nextApproved.delete(date);
        }
      }
      return { approved: nextApproved, rejected: nextRejected };
    });
  };

  const handleSubmitReview = async () => {
    if (!selectedLeaveForReview) return;
    setIsUpdatingStatus(true);
    try {
      const body = {
        approverId: userId,
        instructions: reviewInstructions,
        approvedDates: Array.from(reviewDatesSelection.approved),
        rejectedDates: Array.from(reviewDatesSelection.rejected),
      };

      await rejectLeaveMutation({
        userId: selectedLeaveForReview.userId,
        month: selectedLeaveForReview.month,
        leaveId: selectedLeaveForReview._id,
        body
      }).unwrap();

      showSuccess('Leave status updated successfully');
      setReviewModalVisible(false);
      refetchAllLeaves();
    } catch (e) {
      showError(e?.data?.message || 'Failed to update leave status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // HR Table Columns
  const managementColumns = [
    {
      title: 'User',
      key: 'user',
      render: (_, record) => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontWeight: '600', color: 'var(--primary-text)' }}>{record.userName}</span>
          <span style={{ fontSize: '11px', color: 'var(--secondary-text)' }}>{record.userRole?.toUpperCase()}</span>
        </div>
      )
    },
    {
      title: 'Duration',
      key: 'duration',
      render: (_, record) => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontWeight: '500' }}>{record.dates?.length} Day(s)</span>
          <span style={{ fontSize: '11px', color: 'var(--secondary-text)' }}>
            {dayjs(record.startDate).format('MMM D')} - {dayjs(record.endDate).format('MMM D')}
          </span>
        </div>
      )
    },
    {
      title: 'Status',
      key: 'status',
      dataIndex: 'status',
      render: (status) => (
        <Tag color={status === 'approved' ? 'success' : status === 'rejected' ? 'error' : 'warning'} style={{ borderRadius: '50px', fontWeight: '600' }}>
          {status?.toUpperCase()}
        </Tag>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Button
          size="small"
          type="primary"
          ghost
          onClick={() => handleOpenReview(record)}
          disabled={record.status === 'cancelled'}
        >
          Review
        </Button>
      )
    }
  ];

  const [currentDate, setCurrentDate] = useState(() => {
    const saved = localStorage.getItem('calendar_currentDate');
    return saved ? dayjs(saved) : dayjs();
  });
  const [events, setEvents] = useState(initialEvents);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [editingNoteId, setEditingNoteId] = useState(null); // ID of the note being edited
  const [selectedColor, setSelectedColor] = useState('#1890ff'); // Default task color
  const [isViewDrawerOpen, setIsViewDrawerOpen] = useState(false);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [viewDate, setViewDate] = useState(null);
  const [activeCollapseKey, setActiveCollapseKey] = useState([]);
  const [isCompact, setIsCompact] = useState(false); // Compact view state
  const [isLeaveView, setIsLeaveView] = useState(() => {
    return localStorage.getItem('calendar_isLeaveView') === 'true';
  }); // Leave view state (hides tasks)
  const [selectedLeaveDates, setSelectedLeaveDates] = useState(() => {
    const saved = localStorage.getItem('calendar_selectedLeaveDates');
    return saved ? JSON.parse(saved) : [];
  }); // Selected dates for leave
  const [leaveReason, setLeaveReason] = useState(() => {
    return localStorage.getItem('calendar_leaveReason') || '';
  }); // Leave reason
  const [panelPosition, setPanelPosition] = useState(() => {
    const saved = localStorage.getItem('calendar_panelPosition');
    return saved ? JSON.parse(saved) : { x: 20, y: 20 };
  }); // Panel position from bottom-right
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [form] = Form.useForm();

  // Persist leave selection state to localStorage
  useEffect(() => {
    localStorage.setItem('calendar_selectedLeaveDates', JSON.stringify(selectedLeaveDates));
  }, [selectedLeaveDates]);

  useEffect(() => {
    localStorage.setItem('calendar_leaveReason', leaveReason);
  }, [leaveReason]);

  useEffect(() => {
    localStorage.setItem('calendar_panelPosition', JSON.stringify(panelPosition));
  }, [panelPosition]);

  useEffect(() => {
    localStorage.setItem('calendar_currentDate', currentDate.toString());
  }, [currentDate]);

  useEffect(() => {
    localStorage.setItem('calendar_isLeaveView', isLeaveView);
  }, [isLeaveView]);

  // Reset local events if initialEvents prop changes
  useEffect(() => {
    if (initialEvents.length > 0) {
      setEvents(initialEvents);
    }
  }, [initialEvents]);

  // Calendar Navigation
  const nextMonth = () => {
    setCurrentDate(currentDate.add(1, 'month'));
  };

  const prevMonth = () => {
    setCurrentDate(currentDate.subtract(1, 'month'));
  };

  const goToToday = () => {
    setCurrentDate(dayjs());
  };

  // Calendar Grid Generation
  const generateCalendarDays = () => {
    const startOfMonth = currentDate.startOf('month');

    // Calculate start of grid (previous Monday)
    const startDayOfWeek = startOfMonth.day(); // 0 (Sun) to 6 (Sat)
    // We want Monday (1) to be 0 offset.
    const daysFromMonday = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

    let day = startOfMonth.subtract(daysFromMonday, 'day');

    const calendarGrid = [];

    // Generate 6 weeks (42 days) to cover all scenarios
    for (let i = 0; i < 42; i++) {
      calendarGrid.push(day);
      day = day.add(1, 'day');
    }

    return calendarGrid;
  };

  const days = generateCalendarDays();

  // Event Handling
  const handleDayClick = (date) => {
    // Disable click for past dates (before today)
    if (date.isBefore(dayjs(), 'day')) {
      return;
    }

    // If in leave view mode, toggle date selection
    if (isLeaveView) {
      // Prevent selection of holidays and weekends (unless bypass is on for HR)
      if ((isHoliday(date) || isWeekend(date)) && !bypassHolidays) {
        warning("You cannot select holidays or non-working days for leave.");
        return;
      }

      // Check for sandwich rule before adding (unless bypass is on for HR)
      const sandwichConflict = !bypassHolidays ? checkSandwich(date, selectedLeaveDates) : null;
      if (sandwichConflict) {
        showError(
          <div>
            <strong>Sandwich Leave Detected!</strong><br />
            You cannot select this date because it bridges a gap ({sandwichConflict.gap}) with your leave on {sandwichConflict.conflictDate}.<br />
            <span style={{ fontSize: '12px', opacity: 0.9 }}>Company policy does not allow sandwich leaves.</span><br />
            <span style={{ fontSize: '12px', fontStyle: 'italic', marginTop: '4px', display: 'block' }}>
              If you have an emergency for the leave, please connect with HR to solve this issue.
            </span>
          </div>
        );
        return;
      }

      const dateStr = date.format('YYYY-MM-DD');
      setSelectedLeaveDates(prev => {
        if (prev.includes(dateStr)) {
          // Remove date if already selected
          return prev.filter(d => d !== dateStr);
        } else {
          // Add date to selection
          return [...prev, dateStr].sort();
        }
      });
    } else {
      setSelectedDate(date);
      // setIsAddModalOpen(true); // Optional: Open modal on day click
    }
  };

  const handleAddEventClick = () => {
    setSelectedDate(currentDate);
    setIsAddModalOpen(true);
  };

  // Quick Add Handler
  const handleQuickAdd = (e, date) => {
    e.stopPropagation();
    setSelectedDate(date);
    setIsAddModalOpen(true);
  };

  // Task Click Handler (Open Drawer & Highlight Task)
  const handleTaskClick = (e, task, date) => {
    e.stopPropagation();
    setViewDate(date);
    setActiveCollapseKey([task.id]); // Open specific task
    setIsViewDrawerOpen(true);
  };

  // View More Handler
  const handleViewMoreEvents = (e, date) => {
    e.stopPropagation();
    setViewDate(date);
    setActiveCollapseKey([]);
    setIsViewDrawerOpen(true);
  };

  const handleEditTask = (task) => {
    setEditingNoteId(task.noteId);
    setSelectedDate(dayjs(task.date));
    form.setFieldsValue({
      title: task.title,
      type: task.type || 'task',
      time: task.time && task.time !== 'All Day' ? dayjs(task.time, 'HH:mm') : null,
      description: task.originalDescription || '',
    });
    setIsAddModalOpen(true);
  };

  const handleArchiveTask = async (task) => {
    try {
      await deleteFestiveNote({
        date: task.date,
        noteId: task.noteId
      }).unwrap();
      showSuccess('Task deleted successfully!');
      refetchNotes();

      // If the drawer is open and we archived the last task, close it
      const remainingEvents = getEventsForDay(viewDate).filter(e => e.noteId !== task.noteId);
      if (remainingEvents.length === 0) {
        setIsViewDrawerOpen(false);
      }
    } catch (e) {
      showError(e?.data?.message || e?.message || 'Failed to delete task');
    }
  };

  const handleViewDrawerClose = () => {
    setIsViewDrawerOpen(false);
    setViewDate(null);
    setActiveCollapseKey([]);
  };

  const handleModalOk = () => {
    form.validateFields()
      .then(async (values) => {
        const dateStr = selectedDate ? selectedDate.format('YYYY-MM-DD') : currentDate.format('YYYY-MM-DD');
        const timeStr = values.time ? values.time.format('HH:mm') : 'All Day';

        // Map types to labels and colors for new backend schema
        const typeMapping = {
          meeting: { label: 'Meeting (Red)', color: '#f5222d' },
          work: { label: 'Deep Work (Blue)', color: '#1890ff' },
          personal: { label: 'Personal (Purple)', color: '#722ed1' },
          task: { label: 'Task (Green)', color: '#52c41a' },
          other: { label: 'Other (Orange)', color: '#faad14' }
        };

        const config = typeMapping[values.type] || typeMapping.task;

        // Combine metadata into description to keep UI consistent
        const descriptionBody = JSON.stringify({
          time: timeStr,
          originalDescription: values.description || ''
        });

        try {
          if (editingNoteId) {
            await updateFestiveNote({
              date: dateStr,
              noteId: editingNoteId,
              note: values.title,
              eventType: config.label,
              description: descriptionBody,
              color: config.color,
              archive: false,
            }).unwrap();
            showSuccess('Task updated successfully!');
          } else {
            await addFestiveNote({
              date: dateStr,
              note: values.title,
              eventType: config.label,
              userId: targetUserId,
              color: config.color,
              description: descriptionBody,
            }).unwrap();
            showSuccess('Task added successfully!');
          }

          setIsAddModalOpen(false);
          setEditingNoteId(null);
          form.resetFields();
          refetchNotes();
        } catch (e) {
          showError(e?.data?.message || e?.message || 'Failed to save task');
        }
      })
      .catch((info) => {
        console.log('Validate Failed:', info);
      });
  };

  const handleModalCancel = () => {
    setIsAddModalOpen(false);
    form.resetFields();
  };

  // Filter events for a specific day using Festive Notes Data
  const getEventsForDay = (day) => {
    const dateStr = day.format('YYYY-MM-DD');
    const buckets = festiveNotesData?.data || [];
    const bucket = buckets.find((b) => b.date === dateStr);

    const notes = (bucket?.notes || []).filter((n) => n?.archive !== true);

    // de-duplicate by title+color (matching FestiveCalender logic)
    const seen = new Map();
    const mappedEvents = [];

    notes.forEach((n) => {
      const title = (n.note || '').trim();
      if (!title) return;

      const key = title.toLowerCase() + (n.color || '');
      if (!seen.has(key)) {
        seen.set(key, true);

        let meta = { time: 'All Day', originalDescription: n.description || '' };
        try {
          if (n.description && n.description.startsWith('{')) {
            meta = JSON.parse(n.description);
          }
        } catch (e) { }

        // Map label back to type code for CSS/Styling logic
        const labelToType = {
          'Meeting (Red)': 'meeting',
          'Deep Work (Blue)': 'work',
          'Personal (Purple)': 'personal',
          'Task (Green)': 'task',
          'Other (Orange)': 'other'
        };

        mappedEvents.push({
          id: n._id || `${dateStr}-${title}`,
          title,
          color: n.color || '#1890ff',
          noteId: n._id,
          description: meta.originalDescription || n.description || '',
          originalDescription: meta.originalDescription || '',
          time: meta.time || 'All Day',
          type: labelToType[n.eventType] || 'task',
          date: dateStr
        });
      }
    });

    return mappedEvents;
  };

  // Transform API response to leave history format
  const leaveHistory = useMemo(() => {
    if (!leavesData?.data?.months) return [];
    const allLeaves = [];
    leavesData.data.months.forEach(monthData => {
      if (monthData.leaves) {
        monthData.leaves.forEach(leave => {
          // Generate date range array
          const startDate = dayjs(leave.startDate);
          const endDate = dayjs(leave.endDate);
          const dates = [];
          let current = startDate;
          while (current.isBefore(endDate) || current.isSame(endDate, 'day')) {
            dates.push(current.format('YYYY-MM-DD'));
            current = current.add(1, 'day');
          }
          allLeaves.push({
            id: leave._id,
            dates: dates,
            reason: monthData.reason || leave.reason || '',
            createdAt: leave.createdAt || leave.updatedAt,
            status: leave.status || 'pending',
            month: monthData.month,
            approvedDates: Array.isArray(leave.approvedDates) ? leave.approvedDates.map(d => dayjs(d).format('YYYY-MM-DD')) : [],
            rejectedDates: Array.isArray(leave.rejectedDates) ? leave.rejectedDates.map(d => dayjs(d).format('YYYY-MM-DD')) : []
          });
        });
      }
    });
    // Sort by createdAt descending (newest first)
    return allLeaves.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [leavesData]);

  // Drag handlers for leave panel
  const handleDragStart = (e) => {
    setIsDragging(true);
    // Store initial mouse position
    setDragOffset({
      mouseX: e.clientX,
      mouseY: e.clientY,
      startX: panelPosition.x,
      startY: panelPosition.y
    });
  };

  const handleDrag = (e) => {
    if (!isDragging) return;
    if (e.clientX === 0 && e.clientY === 0) return; // Ignore end of drag

    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    // Calculate how much the mouse moved
    const deltaX = dragOffset.mouseX - e.clientX;
    const deltaY = dragOffset.mouseY - e.clientY; // Inverted for bottom positioning

    // Calculate new position based on movement delta
    const newX = dragOffset.startX + deltaX;
    const newY = dragOffset.startY + deltaY;

    // Keep panel within viewport bounds
    const boundedX = Math.max(10, Math.min(newX, windowWidth - 360));
    const boundedY = Math.max(10, Math.min(newY, windowHeight - 100));

    setPanelPosition({ x: boundedX, y: boundedY });
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleDrag);
      document.addEventListener('mouseup', handleDragEnd);
      return () => {
        document.removeEventListener('mousemove', handleDrag);
        document.removeEventListener('mouseup', handleDragEnd);
      };
    }
  }, [isDragging, dragOffset, panelPosition]);

  // Hardcoded festivals
  const festivals = {
    '01-14': { name: 'Makar Sankranti', emoji: '🪁' },
    '01-26': { name: 'Republic Day', emoji: '🇮🇳' },
    '03-04': { name: 'Holi', emoji: '🎨' },
    '08-15': { name: 'Independence Day', emoji: '🇮🇳' },
    '08-28': { name: 'Raksha Bandhan', emoji: 'ꫂ❁' },
    '09-04': { name: 'Janmashtami', emoji: '🪈' },
    '10-20': { name: 'Dussehra', emoji: '🏹' },
    // Add more here
  };

  const isHoliday = (date) => {
    return !!festivals[date.format('MM-DD')];
  };

  const isWeekend = (date) => {
    const day = date.day(); // 0 is Sunday, 6 is Saturday

    // Sunday is always a weekend
    if (day === 0) return true;

    // Saturday is a weekend ONLY if it is the 3rd Saturday
    if (day === 6) {
      const dayOfMonth = date.date();
      // 3rd Saturday is always between the 15th and 21st of the month
      const weekNumber = Math.ceil(dayOfMonth / 7);
      return weekNumber === 3;
    }

    return false;
  };

  // Check for Sandwich Leave
  const checkSandwich = (targetDate, currentSelected) => {
    const targetStr = targetDate.format('YYYY-MM-DD');

    // If removing a date, no sandwich constraint usually
    if (currentSelected.includes(targetStr)) return null;

    // Check Backward
    let ptr = targetDate.subtract(1, 'day');
    let gapFound = false;
    let gapDays = [];

    while (isHoliday(ptr) || isWeekend(ptr)) {
      if (currentSelected.includes(ptr.format('YYYY-MM-DD'))) {
        gapFound = false; // It's connected
        break;
      }
      gapDays.push(ptr.format('MMM D'));
      gapFound = true;
      ptr = ptr.subtract(1, 'day');
    }

    // Now ptr is a work day (or we broke because of connection).
    // If a gap was found AND the work day `ptr` is selected -> SANDWICH
    if (gapFound && currentSelected.includes(ptr.format('YYYY-MM-DD'))) {
      return {
        type: 'backward',
        conflictDate: ptr.format('MMM D'),
        gap: gapDays.reverse().join(', ')
      };
    }

    // Check Forward
    ptr = targetDate.add(1, 'day');
    gapFound = false;
    gapDays = [];

    while (isHoliday(ptr) || isWeekend(ptr)) {
      if (currentSelected.includes(ptr.format('YYYY-MM-DD'))) {
        gapFound = false;
        break;
      }
      gapDays.push(ptr.format('MMM D'));
      gapFound = true;
      ptr = ptr.add(1, 'day');
    }
    if (gapFound && currentSelected.includes(ptr.format('YYYY-MM-DD'))) {
      return {
        type: 'forward',
        conflictDate: ptr.format('MMM D'),
        gap: gapDays.join(', ')
      };
    }

    return null;
  };

  return (
    <>
      <div className={`calendar-container ${isCompact ? 'compact-mode' : ''}`}>
        {/* Header */}
        <div className="calendar-header">
          <div className="calendar-header-left">
            <div className="calendar-day-badge">
              <span className="month">{currentDate.format('MMM')}</span>
              <span className="day">{currentDate.format('D')}</span>
            </div>
            <div className="calendar-date-display">
              <h2 className="calendar-current-month">
                {currentDate.format('MMMM YYYY')}
              </h2>
              <p className="calendar-date-range">
                {currentDate.startOf('month').format('MMM D, YYYY')} – {currentDate.endOf('month').format('MMM D, YYYY')}
              </p>
            </div>
          </div>

          <div className="calendar-controls">
            <button className="calendar-search-btn" title="Search events">
              <Search size={20} />
            </button>

            <div className="calendar-nav-group">
              <button className="calendar-nav-btn" onClick={prevMonth}>
                <ChevronLeft size={18} />
              </button>
              <button className="calendar-today-btn" onClick={goToToday}>
                Today
              </button>
              <button className="calendar-nav-btn" onClick={nextMonth}>
                <ChevronRight size={18} />
              </button>
            </div>

            <div
              className="calendar-view-select"
              onClick={() => setIsCompact(!isCompact)}
              style={{
                minWidth: 'auto',
                padding: '8px 12px',
                gap: 8,
                cursor: 'pointer',
                userSelect: 'none',
                height: 36
              }}
            >
              <span>{isCompact ? 'Compact View' : 'Full View'}</span>
              <CalendarIcon size={14} />
            </div>

            <button
              className="calendar-add-btn"
              style={{ marginRight: '8px' }}
              onClick={() => setIsLeaveView(!isLeaveView)}
            >
              <CalendarIcon size={18} />
              <span>{isLeaveView ? 'Back to Festive' : 'Get leaves'}</span>
            </button>

            <button className="calendar-add-btn" onClick={handleAddEventClick}>
              <Plus size={18} />
              <span>Add event</span>
            </button>
          </div>
        </div>

        {/* Grid */}
        <div className={`calendar-grid ${isCompact ? 'compact' : ''}`}>
          <div className="calendar-weekdays">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
              <div key={day} className="weekday-header">{day}</div>
            ))}
          </div>

          <div className={`calendar-days ${isCompact ? 'compact' : ''}`}>
            {days.map((day, index) => {
              const dateKey = day.format('MM-DD');
              const festival = festivals[dateKey];
              const dayEvents = getEventsForDay(day);
              const isToday = day.isSame(dayjs(), 'day');
              const isCurrentMonth = day.isSame(currentDate, 'month');
              const isPast = day.isBefore(dayjs(), 'day');
              const isOffDay = isHoliday(day) || isWeekend(day);
              const isLeaveDisabled = isLeaveView && isOffDay;

              return (
                <div
                  key={index}
                  className={`calendar-day-cell ${!isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''} ${isPast ? 'disabled' : ''} ${isLeaveDisabled ? 'disabled-leave-day' : ''} ${isCompact ? 'compact' : ''} ${isLeaveView && selectedLeaveDates.includes(day.format('YYYY-MM-DD')) ? 'selected-leave' : ''}`}
                  onClick={() => handleDayClick(day)}
                >
                  <div className="day-header">
                    <div className="day-header-left" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="day-number">{day.date()}</span>

                      {/* Festival Display */}
                      {festival && !isCompact && (
                        <div className="festival-tag" title={festival.name}>
                          <span className="festival-emoji">{festival.emoji}</span>
                          <span className="festival-name">{festival.name}</span>
                        </div>
                      )}

                      {/* Compact Mode Festival Dot */}
                      {festival && isCompact && (
                        <span title={festival.name} style={{ fontSize: 10 }}>{festival.emoji}</span>
                      )}
                    </div>

                    {!isPast && !isCompact && (
                      <button
                        className="quick-add-btn"
                        onClick={(e) => handleQuickAdd(e, day)}
                        title="Add Task"
                      >
                        <Plus size={12} />
                      </button>
                    )}
                  </div>

                  <div className={`day-events ${isCompact ? 'compact-events' : ''}`}>
                    {!isLeaveView && !isCompact ? (
                      // Standard View
                      <>
                        {dayEvents.slice(0, 3).map((event, idx) => (
                          <div
                            key={idx}
                            className={`event-pill type-${event.type || 'other'}`}
                            onClick={(e) => handleTaskClick(e, event, day)}
                          >
                            <span style={{ fontSize: '10px' }}>●</span>
                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{event.title}</span>
                            <span className="event-time">{event.time}</span>
                          </div>
                        ))}
                        {dayEvents.length > 3 && (
                          <div
                            className="more-events"
                            onClick={(e) => handleViewMoreEvents(e, day)}
                          >
                            {dayEvents.length - 3} more...
                          </div>
                        )}
                      </>
                    ) : !isLeaveView && isCompact ? (
                      // Compact View - Index Numbers
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center', padding: '0 4px' }}>
                        {dayEvents.map((event, idx) => (
                          <div
                            key={idx}
                            className={`compact-event-dot type-${event.type || 'other'}`}
                            onClick={(e) => handleTaskClick(e, event, day)}
                            title={`${event.title} (${event.time})`}
                          >
                            {idx + 1}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Add Event Modal */}
        <Modal
          title="Add New Event"
          open={isAddModalOpen}
          onOk={handleModalOk}
          onCancel={handleModalCancel}
          okText="Add Event"
        >
          <Form
            form={form}
            layout="vertical"
            name="eventForm"
            initialValues={{
              type: 'meeting',
              date: selectedDate
            }}
          >
            <Form.Item
              name="title"
              label="Event Title"
              rules={[{ required: true, message: 'Please enter event title' }]}
            >
              <Input placeholder="e.g., Team Standup" />
            </Form.Item>

            <Form.Item
              name="type"
              label="Event Type"
            >
              <Select>
                <Select.Option value="meeting">Meeting (Red)</Select.Option>
                <Select.Option value="work">Deep Work (Blue)</Select.Option>
                <Select.Option value="personal">Personal (Purple)</Select.Option>
                <Select.Option value="task">Task (Green)</Select.Option>
                <Select.Option value="other">Other (Orange)</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="time"
              label="Time"
            >
              <TimePicker format="HH:mm" style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
              name="description"
              label="Description"
            >
              <Input.TextArea placeholder="Add more details..." rows={2} />
            </Form.Item>

            <div style={{ marginTop: 16, color: 'var(--secondary-text)', fontSize: 13 }}>
              Selected Date: {selectedDate?.format('MMMM D, YYYY')}
            </div>
          </Form>
        </Modal>

        {/* View Events Drawer with Accordion */}
        <Drawer
          title={`Tasks for ${viewDate?.format('MMM D, YYYY')}`}
          placement="right"
          onClose={handleViewDrawerClose}
          open={isViewDrawerOpen}
          width={800}
          extra={
            <Button
              type="primary"
              size="small"
              icon={<Plus size={14} />}
              onClick={() => {
                setSelectedDate(viewDate);
                setIsAddModalOpen(true);
              }}
            >
              Add
            </Button>
          }
        >
          {viewDate && (
            <Collapse
              activeKey={activeCollapseKey}
              onChange={setActiveCollapseKey}
              accordion
              expandIconPosition="end"
            >
              {getEventsForDay(viewDate).map(event => (
                <Collapse.Panel
                  header={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="event-dot" style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: event.color || '#1890ff' }}></div>
                      <span style={{ fontWeight: 500 }}>{event.title}</span>
                    </div>
                  }
                  key={event.id}
                  extra={<span style={{ fontSize: 12, color: 'var(--secondary-text)' }}>{event.time}</span>}
                  className={`type-border-${event.type || 'event'}`}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                      <span style={{ color: 'var(--secondary-text)', fontSize: 12 }}>Type: </span>
                      <Tag color="blue">{event.type?.toUpperCase()}</Tag>
                    </div>
                    <div>
                      <span style={{ color: 'var(--secondary-text)', fontSize: 12 }}>Time: </span>
                      <span style={{ fontWeight: 500 }}>{event.time}</span>
                    </div>
                    {event.originalDescription && (
                      <div>
                        <span style={{ color: 'var(--secondary-text)', fontSize: 12 }}>Description: </span>
                        <div style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}>{event.originalDescription}</div>
                      </div>
                    )}
                    <div className="event-actions" style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                      <Button size="small" icon={<Plus size={14} />} onClick={() => handleEditTask(event)}>Edit</Button>
                      <Button size="small" danger onClick={() => handleArchiveTask(event)}>Delete</Button>
                    </div>
                  </div>
                </Collapse.Panel>
              ))}
            </Collapse>
          )}
        </Drawer>

        {/* Leave Selection Panel */}
        <div
          className={`leave-panel ${selectedLeaveDates.length > 0 ? 'visible' : ''} ${isDragging ? 'dragging' : ''}`}
          style={{
            bottom: `${panelPosition.y}px`,
            right: `${panelPosition.x}px`
          }}
        >
          <div className="leave-panel-content">
            {/* Drag Handle */}
            <div
              className="leave-panel-header"
              onMouseDown={handleDragStart}
            >
              <div className="drag-handle">
                <span>⋮⋮</span>
              </div>
              <h3>
                <CalendarIcon size={16} />
                Leave Request
              </h3>
            </div>

            {/* Selected Dates Section */}
            {/* HR Administration Controls */}
            {isHR && (
              <div style={{
                marginBottom: '16px',
                padding: '12px',
                background: 'rgba(var(--brand-color-rgb), 0.05)',
                borderRadius: '8px',
                border: '1px dashed var(--brand-color)'
              }}>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--brand-color)', display: 'block', marginBottom: '4px' }}>
                    Target User
                  </label>
                  <Select
                    showSearch
                    style={{ width: '100%' }}
                    placeholder="Search User..."
                    defaultValue={userId}
                    onChange={(val) => setTargetUserId(val)}
                    optionFilterProp="label"
                    filterOption={(input, option) =>
                      (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                    }
                    options={usersData?.data
                      ?.filter(u => u.role !== 'admin')
                      ?.map(u => ({
                        value: u.userId || u._id || u.id,
                        label: `${(`${u.firstName || u.name || ''} ${u.lastName || ''}`).trim() || 'Unknown'} (${u.role})`
                      })) || []}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--brand-color)' }}>
                    Bypass Holiday/Weekend Rules
                  </span>
                  <Switch
                    size="small"
                    checked={bypassHolidays}
                    onChange={(checked) => {
                      setBypassHolidays(checked);
                      // If turned OFF, clear restricted dates that were previously allowed
                      if (!checked) {
                        const filteredDates = selectedLeaveDates.filter(dateStr => {
                          const d = dayjs(dateStr);
                          return !isHoliday(d) && !isWeekend(d);
                        });

                        if (filteredDates.length !== selectedLeaveDates.length) {
                          setSelectedLeaveDates(filteredDates);
                          warning("Restricted dates (holidays/weekends) removed from selection.");
                        }
                      }
                    }}
                  />
                </div>
              </div>
            )}

            <div className="leave-dates-section">
              <div className="leave-dates-label">
                Selected Dates ({selectedLeaveDates.length})
              </div>
              <div className="leave-dates-list">
                {selectedLeaveDates.map((dateStr) => (
                  <div key={dateStr} className="leave-date-tag">
                    {dayjs(dateStr).format('MMM D, YYYY')}
                    <button
                      onClick={() => setSelectedLeaveDates(prev => prev.filter(d => d !== dateStr))}
                      title="Remove date"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Reason & Submit Section */}
            <div className="leave-form-section">
              <label htmlFor="leave-reason">
                Leave Reason
                <span style={{
                  fontSize: '11px',
                  fontWeight: 'normal',
                  marginLeft: '8px',
                  color: leaveReason.trim().length >= 10 ? 'var(--success-color)' : 'var(--secondary-text)'
                }}>
                  ({leaveReason.trim().length}/10 min)
                </span>
              </label>
              <textarea
                id="leave-reason"
                className="leave-reason-input"
                placeholder="Enter reason for leave (minimum 10 characters)..."
                value={leaveReason}
                onChange={(e) => setLeaveReason(e.target.value)}
              />
              {leaveReason.trim().length > 0 && leaveReason.trim().length < 10 && (
                <div style={{
                  fontSize: '11px',
                  color: 'var(--danger-color)',
                  marginTop: '4px'
                }}>
                  Please enter at least 10 characters
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="leave-actions">
              <button
                className="leave-submit-btn"
                disabled={selectedLeaveDates.length === 0 || leaveReason.trim().length < 10 || isCreating}
                onClick={async () => {
                  // Final safety check: if bypass is OFF, ensure no holidays/weekends are selected
                  if (!bypassHolidays) {
                    const hasRestricted = selectedLeaveDates.some(dateStr => {
                      const d = dayjs(dateStr);
                      return isHoliday(d) || isWeekend(d);
                    });
                    if (hasRestricted) {
                      showError("Cannot submit: Your selection includes holidays or weekends. Enable 'Bypass Rules' or remove those dates.");
                      return;
                    }
                  }

                  try {
                    const monthAbbr = dayjs(selectedLeaveDates[0]).format('MMM').toUpperCase();
                    const formattedLeaves = selectedLeaveDates.map(date => ({
                      startDate: date,
                      endDate: date
                    }));

                    const body = {
                      userId: targetUserId,
                      month: monthAbbr,
                      reason: leaveReason.trim(),
                      leaves: formattedLeaves,
                      // Add HR flags if submitting for someone else or as HR
                      ...(isHR && {
                        isHRLeave: true,
                        requesterRole: 'HR'
                      })
                    };

                    await createLeave(body).unwrap();
                    await refetchLeaves(); // Refresh history

                    showSuccess(`Leave request submitted for ${selectedLeaveDates.length} day(s)`);
                    setSelectedLeaveDates([]);
                    setLeaveReason('');
                    setIsLeaveView(false);

                    // Clear localStorage
                    localStorage.removeItem('calendar_selectedLeaveDates');
                    localStorage.removeItem('calendar_leaveReason');
                  } catch (e) {
                    showError(e?.data?.message || 'Failed to submit leave request');
                  }
                }}
              >
                {isCreating ? 'Submitting...' : 'Submit Leave'}
              </button>
              <button
                className="leave-clear-btn"
                onClick={() => {
                  setSelectedLeaveDates([]);
                  setLeaveReason('');
                }}
              >
                Clear All
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Standalone History Button */}
      {
        isLeaveView && (
          <div className="history-floating-btn-container" style={{
            position: 'fixed',
            bottom: '20px',
            right: panelPosition.x > 380 ? '20px' : `${panelPosition.x + 360}px`,
            zIndex: 999,
            transition: 'all 0.3s ease'
          }}>
            {!isDragging && (
              <button
                className="history-floating-btn"
                onClick={() => setIsHistoryDrawerOpen(true)}
                style={{
                  background: 'var(--card-bg)',
                  color: 'var(--brand-color)',
                  border: '1.5px solid var(--brand-color)',
                  padding: '10px 20px',
                  borderRadius: '50px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px var(--shadow)',
                  transition: 'all 0.2s ease'
                }}
              >
                <CalendarIcon size={18} />
                View Leave History
              </button>
            )}
          </div>
        )
      }

      {/* Leave History Drawer */}
      <Drawer
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingRight: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CalendarIcon className="drawer-title-icon" style={{ color: 'var(--brand-color)' }} />
              <span style={{ color: 'var(--primary-text)' }}>Leave History</span>
            </div>
            {isHR && (
              <Tabs
                activeKey={historyTab}
                onChange={setHistoryTab}
                size="small"
                style={{ marginBottom: -16 }}
                items={[
                  { label: 'My History', key: 'personal' },
                  { label: 'Team Management', key: 'management' }
                ]}
              />
            )}
          </div>
        }
        placement="right"
        onClose={() => setIsHistoryDrawerOpen(false)}
        open={isHistoryDrawerOpen}
        width={historyTab === 'personal' ? 600 : 800}
        styles={{
          header: { borderBottom: '1px solid var(--border-color)', background: 'var(--primary-bg)' },
          body: { background: 'var(--primary-bg)', padding: '0' }
        }}
      >
        <br />
        {historyTab === 'personal' ? (
          <List
            grid={{ gutter: 16, xs: 1, sm: 1, md: 1, lg: 2, xl: 2, xxl: 2 }}
            loading={isLoadingLeaves}
            dataSource={leaveHistory}
            className="history-list-grid"
            renderItem={(item) => {
              const statusClass = `status-${item.status || 'pending'}`;
              return (
                <List.Item style={{ padding: 0 }}>
                  <div className={`history-card ${statusClass}`}>
                    <div className="history-card-title">
                      {dayjs(item.dates[0]).format('MMMM YYYY')}
                    </div>
                    <div className="history-card-subtitle">
                      Applied on {dayjs(item.createdAt).format('MMM D, YYYY')}
                    </div>

                    <div className="history-card-status">
                      {item.status.toUpperCase()}
                    </div>

                    <div className="history-card-dates">
                      {item.dates.map(date => (
                        <div key={date} className="history-date-tag">
                          {dayjs(date).format('MMM D')}
                        </div>
                      ))}
                    </div>

                    <p className="history-reason-text">
                      {item.reason}
                    </p>
                  </div>
                </List.Item>
              );
            }}
          />
        ) : (
          <Table
            dataSource={managementLeaves}
            columns={managementColumns}
            loading={isLoadingAllLeaves}
            pagination={{ pageSize: 12 }}
            className="management-table"
            rowClassName={() => 'management-row'}
          />
        )}
      </Drawer>


      {/* Leave Review Modal (HR ONLY) */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CalendarIcon style={{ color: 'var(--brand-color)' }} />
            <span>Review Leave Request</span>
          </div>
        }
        open={reviewModalVisible}
        onCancel={() => setReviewModalVisible(false)}
        width={500}
        styles={{
          header: { borderBottom: '1px solid var(--border-color)', marginBottom: 16 },
          footer: { borderTop: '1px solid var(--border-color)', marginTop: 16 }
        }}
        footer={[
          <Button key="cancel" onClick={() => setReviewModalVisible(false)}>
            Cancel
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={isUpdatingStatus}
            onClick={handleSubmitReview}
            disabled={reviewDatesSelection.approved.size === 0 && reviewDatesSelection.rejected.size === 0}
          >
            Update Status
          </Button>
        ]}
      >
        {selectedLeaveForReview && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ background: 'var(--primary-bg)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontWeight: '700', fontSize: '15px' }}>{selectedLeaveForReview.userName}</span>
                <Tag color="warning" style={{ borderRadius: 4 }}>{selectedLeaveForReview.status.toUpperCase()}</Tag>
              </div>
              <div style={{ fontSize: '13px', color: 'var(--secondary-text)', lineHeight: '1.4' }}>
                <span style={{ fontWeight: '600' }}>Reason: </span>
                {selectedLeaveForReview.reason}
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontWeight: '600', fontSize: '13px', color: 'var(--primary-text)' }}>Select status for each date:</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button
                    size="small"
                    type="link"
                    style={{ fontSize: 12, padding: 0 }}
                    onClick={() => {
                      const s = { approved: new Set(selectedLeaveForReview.dates), rejected: new Set() };
                      setReviewDatesSelection(s);
                    }}
                  >
                    Approve All
                  </Button>
                  <Button
                    size="small"
                    type="link"
                    danger
                    style={{ fontSize: 12, padding: 0 }}
                    onClick={() => {
                      const s = { approved: new Set(), rejected: new Set(selectedLeaveForReview.dates) };
                      setReviewDatesSelection(s);
                    }}
                  >
                    Reject All
                  </Button>
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {selectedLeaveForReview.dates.map(date => {
                  const isApproved = reviewDatesSelection.approved.has(date);
                  const isRejected = reviewDatesSelection.rejected.has(date);

                  return (
                    <div
                      key={date}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        background: 'var(--card-bg)',
                        border: `1px solid ${isApproved ? '#52c41a' : isRejected ? '#ff4d4f' : 'var(--border-color)'}`,
                        borderRadius: '8px',
                        overflow: 'hidden',
                        padding: '4px 10px',
                        gap: 12,
                        boxShadow: (isApproved || isRejected) ? '0 2px 4px var(--shadow)' : 'none'
                      }}
                    >
                      <span style={{ fontSize: '12px', fontWeight: '600' }}>{dayjs(date).format('MMM D')}</span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <Button
                          size="small"
                          shape="circle"
                          icon={<Check size={12} />}
                          style={{
                            width: 22,
                            height: 22,
                            minWidth: 22,
                            background: isApproved ? '#52c41a' : 'transparent',
                            borderColor: isApproved ? '#52c41a' : 'var(--border-color)',
                            color: isApproved ? '#fff' : 'var(--secondary-text)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          onClick={() => handleToggleReviewDate(date, 'approve')}
                        />
                        <Button
                          size="small"
                          shape="circle"
                          icon={<X size={12} />}
                          style={{
                            width: 22,
                            height: 22,
                            minWidth: 22,
                            background: isRejected ? '#ff4d4f' : 'transparent',
                            borderColor: isRejected ? '#ff4d4f' : 'var(--border-color)',
                            color: isRejected ? '#fff' : 'var(--danger-color)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          onClick={() => handleToggleReviewDate(date, 'reject')}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: '600', fontSize: '13px', marginBottom: 8, color: 'var(--primary-text)' }}>
                Instructions / Comments <span style={{ fontWeight: 'normal', color: 'var(--secondary-text)', fontSize: 11 }}>(Optional)</span>
              </label>
              <Input.TextArea
                rows={3}
                placeholder="Enter notes for the user (e.g. why specific dates were rejected)..."
                value={reviewInstructions}
                onChange={e => setReviewInstructions(e.target.value)}
                style={{
                  background: 'var(--primary-bg)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--primary-text)',
                  borderRadius: '8px'
                }}
              />
            </div>
          </div>
        )}
      </Modal>

    </>
  );
};

// Helper for color mixing in JS (simplified for the prompt)
const colorMix = (color, opacity) => {
  if (!color) return 'transparent';
  if (color.startsWith('#')) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
  return color;
};

export default DailyTaskCalendar;
