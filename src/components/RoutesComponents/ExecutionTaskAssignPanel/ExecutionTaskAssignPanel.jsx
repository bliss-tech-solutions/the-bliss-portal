import React, { useState, useEffect, useMemo } from "react";
import "./ExecutionTaskAssignPanel.css";
import { Row, Col, Button, Tabs, Drawer, Form, Input, Select, Upload, DatePicker, TimePicker, Alert, Radio, Tag } from "antd";
import { BiTask } from "react-icons/bi";
import { IoClose } from "react-icons/io5";
import { BsUpload, BsClock, BsSearch, BsFilter, BsCardChecklist, BsPersonPlus, BsClockHistory, BsPaperclip } from "react-icons/bs";
import { useSelector } from "react-redux";
import { selectTheme } from "../../../store/slices/themeSlice";
import { selectUserId, selectUser } from "../../../store/slices/authSlice";
import { useAddTaskAssignMutation, useUpdateTaskAssignMutation, useGetAllUsersQuery, useLazyGetTaskAssignByDateQuery } from "../../../store/api";
import { useNotification } from "../../../contexts/NotificationContext";
import { emitTaskAdded, onTaskAdded, offTaskAdded, onTaskUpdated, offTaskUpdated } from "../../../utils/socket";
import AllTaskEntries from "./AllTaskEntries/AllTaskEntries";
import { uploadToCloudinary } from "../../../utils/cloudinary";
import dayjs from "dayjs";
import InlineLoader from "../../CommonComponents/InlineLoader/InlineLoader";

const { TextArea } = Input;

// TabPane is deprecated, using items prop instead

const ExecutionTaskAssignPanel = () => {
    const [activeTab, setActiveTab] = useState('1');
    const [drawerVisible, setDrawerVisible] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [form] = Form.useForm();
    const [fileList, setFileList] = useState([]);
    const [selectedReceiverUserId, setSelectedReceiverUserId] = useState(null);
    const [selectedPosition, setSelectedPosition] = useState(null);
    const [availableUsers, setAvailableUsers] = useState([]);
    const [showFilters, setShowFilters] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDateRange, setSelectedDateRange] = useState(null);
    const [taskFilterUser, setTaskFilterUser] = useState('all');
    const [taskFilterCategory, setTaskFilterCategory] = useState('all');
    const [taskFilterStatus, setTaskFilterStatus] = useState('all');
    const [uploadingImages, setUploadingImages] = useState(false);
    const [uploadedImageUrls, setUploadedImageUrls] = useState([]);
    const [slotStart, setSlotStart] = useState(null);
    const [slotDuration, setSlotDuration] = useState(null);
    const [slotEnd, setSlotEnd] = useState(null);
    const [slotWarning, setSlotWarning] = useState(null);
    const [slotSuggestions, setSlotSuggestions] = useState([]);
    const [conflictSuggestions, setConflictSuggestions] = useState([]);
    const [conflictMessage, setConflictMessage] = useState(null);
    const [selectedSlotDate, setSelectedSlotDate] = useState(dayjs().startOf('day'));
    const [bookedSlots, setBookedSlots] = useState([]);
    const [isLoadingBookings, setIsLoadingBookings] = useState(false);

    const theme = useSelector(selectTheme);
    const userId = useSelector(selectUserId);
    const user = useSelector(selectUser);

    const [addTaskAssign, { isLoading: isAddingTask }] = useAddTaskAssignMutation();
    const [updateTaskAssign, { isLoading: isUpdatingTask }] = useUpdateTaskAssignMutation();
    const isLoading = isAddingTask || isUpdatingTask;
    const [triggerGetTaskAssignByDate] = useLazyGetTaskAssignByDateQuery();
    const notification = useNotification();
    const showSuccess = notification?.showSuccess || ((msg) => console.log('Success:', msg));
    const showError = notification?.showError || ((msg) => console.error('Error:', msg));

    // Fetch all users from API
    const { data: allUsersData, isLoading: isLoadingUsers } = useGetAllUsersQuery();

    // Socket.io listener for real-time task updates (notifications only)
    // Note: AllTaskEntries component handles the actual refetch
    useEffect(() => {
        // Listen for task added events (show notification)
        const handleTaskAdded = (data) => {
            if (!data) return;

            // Check if this task is created by current user (execution role)
            const isCreatedByCurrentUser = data.userId === userId;

            if (isCreatedByCurrentUser) {
                console.log('✅ New task created via socket:', data);
                showSuccess(`Task created: ${data.taskName || 'New task'}`);
                // AllTaskEntries will handle refetch via its own socket listener
            }
        };

        // Listen for task update events (show notification)
        const handleTaskUpdated = (data) => {
            if (!data) return;
            console.log('✅ Task updated via socket:', data);
            // AllTaskEntries will handle refetch via its own socket listener
        };

        // Set up socket listeners
        onTaskAdded(handleTaskAdded);
        onTaskUpdated(handleTaskUpdated);

        // Cleanup on unmount
        return () => {
            offTaskAdded(handleTaskAdded);
            offTaskUpdated(handleTaskUpdated);
        };
    }, [userId, showSuccess]);

    const handleTabChange = (key) => {
        setActiveTab(key);
    };

    const showDrawer = () => {
        setIsEditing(false);
        setEditingTask(null);
        resetDrawerState();
        setDrawerVisible(true);
    };

    const handleEditTask = (task) => {
        console.log('📝 Editing task:', task);
        setIsEditing(true);
        setEditingTask(task);

        // Pre-fill form fields
        form.setFieldsValue({
            taskName: task.taskName,
            clientName: task.clientName,
            category: task.category?.toLowerCase().replace(/\s+/g, '-'),
            priority: task.priority,
            description: task.description,
            timeSpend: task.timeSpend,
        });

        // Set local states for assignment and scheduling
        const position = task.category?.toLowerCase().replace(/\s+/g, '-');
        setSelectedPosition(position);

        // Filter users for this position
        const allUsers = allUsersData?.data || [];
        const currentUserRole = user?.role;
        const otherRoleUsers = allUsers.filter(u => u.role !== currentUserRole);
        const usersWithPosition = otherRoleUsers.filter(u =>
            u.position?.toLowerCase().replace(/\s+/g, '-') === position
        );
        setAvailableUsers(usersWithPosition);
        setSelectedReceiverUserId(task.receiverUserId);
        form.setFieldsValue({ selectedUser: task.receiverUserId });

        // Pre-fill scheduling
        if (task.slots && task.slots.length > 0) {
            const slot = task.slots[0];
            const slotDate = dayjs(slot.slotDate);
            const start = dayjs(slot.start);
            const end = dayjs(slot.end);

            setSelectedSlotDate(slotDate);
            setSlotStart(start);
            setSlotEnd(end);
            setSlotDuration(slot.durationMinutes);
            form.setFieldsValue({
                slotStart: start,
                slotDuration: slot.durationMinutes
            });
        }

        // Handle images
        if (task.taskImages) {
            setUploadedImageUrls(task.taskImages);
            setFileList(task.taskImages.map((url, index) => ({
                uid: `-${index}`,
                name: url.split('/').pop(),
                status: 'done',
                url: url,
                response: { secure_url: url }
            })));
        }

        setDrawerVisible(true);
    };

    const toggleFilters = () => {
        setShowFilters(!showFilters);
    };

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
    };

    const handleDateRangeChange = (dates) => {
        setSelectedDateRange(dates);
    };

    const clearFilters = () => {
        setSearchTerm('');
        setSelectedDateRange(null);
        setTaskFilterUser('all');
        setTaskFilterCategory('all');
        setTaskFilterStatus('all');
    };

    const TASK_DRAFT_STORAGE_KEY = 'executionTaskAssignDraft';

    // Reset all drawer-related state and form fields + clear localStorage draft
    const resetDrawerState = () => {
        form.resetFields();
        form.setFieldsValue({
            category: undefined,
            selectedUser: undefined,
            taskName: undefined,
            clientName: undefined,
            priority: undefined,
            description: undefined,
            slotStart: undefined,
            slotDuration: undefined
        });
        setFileList([]);
        setUploadedImageUrls([]);
        setSlotStart(null);
        setSlotDuration(null);
        setSlotEnd(null);
        setSlotWarning(null);
        setSlotSuggestions([]);
        setConflictSuggestions([]);
        setConflictMessage(null);
        setSelectedReceiverUserId(null);
        setSelectedPosition(null);
        setAvailableUsers([]);
        setSelectedSlotDate(dayjs().startOf('day'));
        setBookedSlots([]);
        try {
            localStorage.removeItem(TASK_DRAFT_STORAGE_KEY);
        } catch { }
    };

    const onClose = () => {
        setDrawerVisible(false);
        // Do NOT reset here so the user can continue later; draft is kept in localStorage
    };

    const handleFileChange = async ({ fileList: newFileList, file }) => {
        // If a new file is being added
        if (file && file.status === undefined) {
            // Get the actual file object - Ant Design Upload structure
            const fileToUpload = file.originFileObj || file;

            // Validate file object
            if (!fileToUpload) {
                showError('Invalid file selected');
                setFileList(prev => prev.filter(f => f.uid !== file.uid));
                return;
            }

            // Check if it's a File instance
            if (!(fileToUpload instanceof File)) {
                console.error('File object is not a File instance:', fileToUpload);
                showError('Invalid file format');
                setFileList(prev => prev.filter(f => f.uid !== file.uid));
                return;
            }

            // Set uploading status
            file.status = 'uploading';
            const updatedList = [...newFileList];
            setFileList(updatedList);

            try {
                setUploadingImages(true);
                console.log('Uploading file:', fileToUpload.name, fileToUpload.type);

                // Upload to Cloudinary as raw document
                const result = await uploadToCloudinary(fileToUpload, 'raw');

                if (!result || !result.secure_url) {
                    throw new Error('Invalid response from Cloudinary');
                }

                const documentUrl = result.secure_url;
                console.log('Upload successful:', documentUrl);

                // Update file list with uploaded URL
                const finalFileList = updatedList.map(f => {
                    if (f.uid === file.uid) {
                        return {
                            ...f,
                            status: 'done',
                            url: documentUrl,
                            response: { secure_url: documentUrl }
                        };
                    }
                    return f;
                });

                setFileList(finalFileList);
                setUploadedImageUrls(prev => [...prev, documentUrl]);
                setUploadingImages(false);
            } catch (error) {
                console.error('Error uploading document:', error);
                showError('Failed to upload document: ' + (error.message || 'Unknown error'));
                setUploadingImages(false);
                // Remove failed file from list
                setFileList(prev => prev.filter(f => f.uid !== file.uid));
            }
        } else if (file && file.status === 'removed') {
            // Remove URL from uploadedImageUrls when file is removed
            const removedUrl = file.url || file.response?.secure_url;
            if (removedUrl) {
                setUploadedImageUrls(prev => prev.filter(url => url !== removedUrl));
            }
            setFileList(newFileList);
        } else {
            setFileList(newFileList);
        }
    };

    const uploadProps = {
        fileList,
        onChange: handleFileChange,
        beforeUpload: () => false,
        multiple: true,
        listType: "text",
        accept: "*/*" // Accept all file types including images
    };

    const applySlotSuggestion = (suggestion) => {
        if (!suggestion) return;
        const suggestedStart = suggestion.start ? dayjs(suggestion.start) : null;
        const suggestedEnd = suggestion.end ? dayjs(suggestion.end) : null;

        if (!suggestedStart || !suggestedEnd || !suggestedStart.isValid() || !suggestedEnd.isValid()) return;

        const duration = Math.max(suggestedEnd.diff(suggestedStart, 'minute'), 5);
        setSlotStart(suggestedStart);
        setSlotEnd(suggestedEnd);
        setSlotDuration(duration);
        form.setFieldsValue({
            slotStart: suggestedStart,
            slotDuration: duration
        });
        setSlotWarning(null);
        setConflictMessage(null);
        setConflictSuggestions([]);
    };

    // Dynamic positions based on ALL users from API - show OTHER roles' positions
    const getAvailablePositions = () => {
        const currentUserRole = user?.role; // Logged-in user's role
        const allUsers = allUsersData?.data || [];

        console.log('🔍 Current User Role:', currentUserRole);
        console.log('👥 All Users from API:', allUsers);

        if (isLoadingUsers || allUsers.length === 0) {
            return []; // Return empty if still loading or no users
        }

        // Filter users with DIFFERENT roles (not same as logged-in user)
        const otherRoleUsers = allUsers.filter(u => u.role !== currentUserRole);

        console.log('✅ Users with OTHER roles:', otherRoleUsers);

        // Extract unique positions from other role users
        const uniquePositions = [...new Set(
            otherRoleUsers
                .filter(u => u.position) // Only users with positions
                .map(u => u.position) // Get position
        )];

        console.log('📋 Unique Positions from OTHER roles:', uniquePositions);

        // Convert to dropdown format (just positions, no userId yet)
        const positionOptions = uniquePositions.map(position => ({
            value: position.toLowerCase().replace(/\s+/g, '-'), // "Graphics Designer" -> "graphics-designer"
            label: position // "Graphics Designer"
        }));

        console.log('🎯 Position Dropdown Options:', positionOptions);

        return positionOptions;
    };

    // Handle position selection - populate users list for that position
    const handlePositionChange = (selectedPosition) => {
        const allUsers = allUsersData?.data || [];
        const currentUserRole = user?.role;

        console.log('🎯 Position Selected:', selectedPosition);

        // Filter other role users
        const otherRoleUsers = allUsers.filter(u => u.role !== currentUserRole);

        // Find ALL users with the selected position
        const usersWithPosition = otherRoleUsers.filter(u =>
            u.position?.toLowerCase().replace(/\s+/g, '-') === selectedPosition
        );

        console.log('👥 Users with selected position:', usersWithPosition);

        // Set the selected position and available users
        setSelectedPosition(selectedPosition);
        setAvailableUsers(usersWithPosition);

        // Reset receiver selection
        setSelectedReceiverUserId(null);
        setSlotSuggestions([]);
        setConflictSuggestions([]);
        setConflictMessage(null);
        setSlotStart(null);
        setSlotDuration(null);
        setSlotEnd(null);
        form.setFieldsValue({ slotStart: null, slotDuration: null });
    };

    // Get users for the selected position
    const getUsersForPosition = () => {
        if (!selectedPosition || availableUsers.length === 0) {
            return [];
        }

        return availableUsers.map(user => ({
            value: user.userId,
            label: `${user.firstName} ${user.lastName} (${user.email})`
        }));
    };

    // Handle user selection from the users list
    const handleUserSelection = (selectedUserId) => {
        setSelectedReceiverUserId(selectedUserId);
        const selectedUser = availableUsers.find(u => u.userId === selectedUserId);
        console.log('✅ Selected User:', {
            userId: selectedUser?.userId,
            name: `${selectedUser?.firstName} ${selectedUser?.lastName}`,
            position: selectedUser?.position
        });
        setSlotStart(null);
        setSlotDuration(null);
        setSlotEnd(null);
        setSlotWarning(null);
        form.setFieldsValue({ slotStart: null, slotDuration: null });
        setConflictMessage(null);
        setConflictSuggestions([]);
        setSelectedSlotDate(dayjs().startOf('day'));
        setBookedSlots([]);
    };

    const dateOptions = useMemo(() => {
        return Array.from({ length: 20 }, (_, index) => dayjs().startOf('day').add(index, 'day'));
    }, []);

    const handleDateSelect = (date) => {
        const nextDate = date ? date.clone() : dayjs().startOf('day');
        setSelectedSlotDate(nextDate);
    };

    useEffect(() => {
        if (!selectedReceiverUserId || !selectedSlotDate) {
            setBookedSlots([]);
            setIsLoadingBookings(false);
            return;
        }
        const dateString = selectedSlotDate.format('YYYY-MM-DD');
        setIsLoadingBookings(true);
        triggerGetTaskAssignByDate({ userId: selectedReceiverUserId, date: dateString })
            .unwrap()
            .then((response) => {
                console.log('[ExecutionTaskAssignPanel] getTaskAssignByDate response:', response);

                // Extract booked slots from the response
                const data = response?.data || response || {};
                const tasks = Array.isArray(data.tasks) ? data.tasks : [];

                // Collect all slots from all tasks
                const slots = [];
                tasks.forEach((task) => {
                    if (Array.isArray(task.slots)) {
                        task.slots.forEach((slot) => {
                            slots.push({
                                taskId: task.taskId,
                                taskName: task.taskName,
                                slotId: slot.slotId,
                                start: slot.start,
                                end: slot.end,
                                slotDate: slot.slotDate,
                                status: slot.status,
                                durationMinutes: slot.durationMinutes,
                                extensionMinutes: slot.extensionMinutes || 0
                            });
                        });
                    }
                });

                setBookedSlots(slots);
                console.log(`📅 Booked slots for ${dateString}:`, slots);
                console.log(`📊 Total booked slots: ${slots.length}`);
            })
            .catch((error) => {
                console.error('[ExecutionTaskAssignPanel] getTaskAssignByDate error:', error);
                setBookedSlots([]);
            })
            .finally(() => {
                setIsLoadingBookings(false);
            });
    }, [selectedReceiverUserId, selectedSlotDate, triggerGetTaskAssignByDate]);

    const SLOT_DURATION_OPTIONS = [
        { label: '15 minutes', value: 15 },
        { label: '20 minutes', value: 20 },
        { label: '30 minutes', value: 30 },
        { label: '45 minutes', value: 45 },
        { label: '1 hour', value: 60 },
        { label: '2 hours', value: 120 },
        { label: '3 hours', value: 180 },
    ];

    const getBookingStatusColor = (status = '') => {
        const normalized = status?.toLowerCase();
        if (normalized === 'completed') return 'green';
        if (normalized === 'in-progress') return 'blue';
        if (normalized === 'scheduled') return 'gold';
        return '#8c8c8c';
    };

    const getDisabledStartTimes = () => {
        const OFFICE_START_HOUR = 10; // 10 AM -> 10:30 with minutes
        const OFFICE_START_MINUTE = 30;
        const OFFICE_END_HOUR = 21; // 9 PM

        const now = dayjs();
        const isToday = selectedSlotDate && selectedSlotDate.isSame(now, 'day');

        const disabledHours = [];
        for (let hour = 0; hour < OFFICE_START_HOUR; hour++) {
            disabledHours.push(hour);
        }
        for (let hour = OFFICE_END_HOUR + 1; hour < 24; hour++) {
            disabledHours.push(hour);
        }

        if (isToday) {
            for (let hour = OFFICE_START_HOUR; hour <= OFFICE_END_HOUR; hour++) {
                if (hour < now.hour()) {
                    disabledHours.push(hour);
                }
            }
        }

        const uniqueHours = Array.from(new Set(disabledHours));

        const disabledMinutes = (selectedHour) => {
            const minutes = [];

            if (selectedHour === OFFICE_START_HOUR) {
                for (let minute = 0; minute < OFFICE_START_MINUTE; minute++) {
                    minutes.push(minute);
                }
            }

            if (selectedHour === OFFICE_END_HOUR) {
                for (let minute = 1; minute < 60; minute++) {
                    minutes.push(minute);
                }
            }

            if (isToday && selectedHour === now.hour()) {
                for (let minute = 0; minute < now.minute(); minute++) {
                    if (!minutes.includes(minute)) {
                        minutes.push(minute);
                    }
                }
            }

            return Array.from(new Set(minutes));
        };

        return {
            disabledHours: () => uniqueHours,
            disabledMinutes
        };
    };

    const updateSlotMeta = (startValue, durationValue) => {
        setSlotWarning(null);

        if (!startValue || !durationValue || !selectedSlotDate) {
            setSlotEnd(null);
            return;
        }

        // Combine selected date with start time
        const selectedDate = selectedSlotDate.format('YYYY-MM-DD');
        const selectedTime = startValue.format('HH:mm:ss');
        const combinedStart = dayjs(`${selectedDate} ${selectedTime}`);
        const endOfDay = selectedSlotDate.hour(19).minute(30);

        // For today's date, check if it's past 7:30 PM
        const now = dayjs();
        const isToday = selectedSlotDate.isSame(now, 'day');
        const latest = dayjs().hour(19).minute(30);

        if (isToday && now.isAfter(latest)) {
            setSlotWarning('Task slots are unavailable after 7:30 PM today.');
            setSlotEnd(null);
            return;
        }

        const computedEnd = combinedStart.add(durationValue, 'minute');

        if (computedEnd.isAfter(endOfDay)) {
            setSlotWarning('Selected duration extends beyond 7:30 PM. Choose an earlier start or shorter duration.');
            setSlotEnd(null);
            return;
        }

        setSlotEnd(computedEnd);
    };

    // Persist draft form + scheduling state to localStorage
    const persistDraftToStorage = () => {
        try {
            const formValues = form.getFieldsValue([
                'category',
                'selectedUser',
                'taskName',
                'clientName',
                'priority',
                'description',
                'slotStart',
                'slotDuration'
            ]);

            const draft = {
                ...formValues,
                slotStart: formValues.slotStart ? formValues.slotStart.toISOString() : null,
                slotDuration: formValues.slotDuration ?? null,
                selectedReceiverUserId,
                selectedPosition,
                selectedSlotDate: selectedSlotDate ? selectedSlotDate.toISOString() : null,
            };

            localStorage.setItem(TASK_DRAFT_STORAGE_KEY, JSON.stringify(draft));
        } catch {
            // ignore storage errors
        }
    };

    const handleSlotStartChange = (value) => {
        if (!value) {
            setSlotStart(null);
            setSlotDuration(null);
            setSlotEnd(null);
            setSlotWarning(null);
            form.setFieldsValue({ slotStart: null, slotDuration: null });
            return;
        }

        setSlotStart(value);
        form.setFieldsValue({ slotStart: value });

        if (slotDuration) {
            updateSlotMeta(value, slotDuration);
        } else {
            setSlotEnd(null);
            setSlotWarning(null);
        }
        setConflictMessage(null);
        setConflictSuggestions([]);
        persistDraftToStorage();
    };

    const handleSlotDurationChange = (valueOrEvent) => {
        const value = valueOrEvent && valueOrEvent.target ? valueOrEvent.target.value : valueOrEvent;

        if (value === undefined || value === null) {
            setSlotDuration(null);
            setSlotEnd(null);
            form.setFieldsValue({ slotDuration: null });
            return;
        }

        const durationValue = Number(value);
        setSlotDuration(durationValue);
        form.setFieldsValue({ slotDuration: durationValue });

        if (slotStart) {
            updateSlotMeta(slotStart, durationValue);
        } else {
            setSlotEnd(null);
        }
        setConflictMessage(null);
        setConflictSuggestions([]);
        persistDraftToStorage();
    };

    const validateSlotStart = (_, value) => {
        if (!selectedReceiverUserId) {
            return Promise.resolve();
        }

        if (!value) {
            return Promise.reject(new Error('Please select a start time'));
        }

        if (!selectedSlotDate) {
            return Promise.reject(new Error('Please select a date first'));
        }

        // Combine selected date with selected time for validation
        const selectedDate = selectedSlotDate.format('YYYY-MM-DD');
        const selectedTime = value.format('HH:mm:ss');
        const combinedStart = dayjs(`${selectedDate} ${selectedTime}`);

        const now = dayjs();
        const latest = dayjs().hour(19).minute(30);
        const isToday = selectedSlotDate.isSame(now, 'day');
        const endOfDay = selectedSlotDate.hour(19).minute(30);

        if (isToday) {
            if (now.isAfter(latest)) {
                return Promise.reject(new Error('Task slots are unavailable after 7:30 PM'));
            }
            if (combinedStart.isBefore(now)) {
                return Promise.reject(new Error('Start time must be later than the current time'));
            }
        }

        if (combinedStart.isAfter(endOfDay)) {
            return Promise.reject(new Error('Start time must be on or before 7:30 PM'));
        }

        return Promise.resolve();
    };

    const validateSlotDuration = (_, value) => {
        if (!selectedReceiverUserId) {
            return Promise.resolve();
        }

        if (!slotStart) {
            return Promise.reject(new Error('Select a start time first'));
        }

        if (!selectedSlotDate) {
            return Promise.reject(new Error('Please select a date first'));
        }

        if (!value) {
            return Promise.reject(new Error('Please choose a duration'));
        }

        // Combine selected date with start time for validation
        const selectedDate = selectedSlotDate.format('YYYY-MM-DD');
        const selectedTime = slotStart.format('HH:mm:ss');
        const combinedStart = dayjs(`${selectedDate} ${selectedTime}`);
        const endOfDay = selectedSlotDate.hour(19).minute(30);
        const computedEnd = combinedStart.add(Number(value), 'minute');

        if (computedEnd.isAfter(endOfDay)) {
            return Promise.reject(new Error('Duration pushes the task past 7:30 PM'));
        }

        return Promise.resolve();
    };

    // Persist draft whenever form values change
    const handleFormValuesChange = () => {
        persistDraftToStorage();
    };

    // Hydrate draft from localStorage on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem(TASK_DRAFT_STORAGE_KEY);
            if (!stored) return;
            const draft = JSON.parse(stored);
            if (!draft || typeof draft !== 'object') return;

            const {
                category,
                selectedUser,
                taskName,
                clientName,
                priority,
                description,
                slotStart: draftSlotStart,
                slotDuration: draftSlotDuration,
                selectedReceiverUserId: draftReceiverId,
                selectedPosition: draftPosition,
                selectedSlotDate: draftSlotDate,
            } = draft;

            form.setFieldsValue({
                category,
                selectedUser,
                taskName,
                clientName,
                priority,
                description,
                slotDuration: draftSlotDuration ?? undefined,
            });

            if (draftPosition) {
                setSelectedPosition(draftPosition);
            }
            if (draftReceiverId) {
                setSelectedReceiverUserId(draftReceiverId);
            }
            if (draftSlotDate) {
                const restoredDate = dayjs(draftSlotDate);
                if (restoredDate.isValid()) {
                    setSelectedSlotDate(restoredDate);
                }
            }
            if (draftSlotStart) {
                const restoredStart = dayjs(draftSlotStart);
                if (restoredStart.isValid()) {
                    setSlotStart(restoredStart);
                }
            }
            if (draftSlotStart && draftSlotDuration && draftSlotDate) {
                const restoredStart = dayjs(draftSlotStart);
                if (restoredStart.isValid()) {
                    const computedEnd = restoredStart.add(Number(draftSlotDuration), 'minute');
                    setSlotEnd(computedEnd);
                    setSlotDuration(Number(draftSlotDuration));
                }
            }
        } catch {
            // ignore storage errors
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const isDurationDisabled = (value) => {
        if (!slotStart || !selectedSlotDate) return false;
        const selectedDate = selectedSlotDate.format('YYYY-MM-DD');
        const selectedTime = slotStart.format('HH:mm:ss');
        const combinedStart = dayjs(`${selectedDate} ${selectedTime}`);
        const endOfDay = selectedSlotDate.hour(19).minute(30);
        return combinedStart.add(Number(value), 'minute').isAfter(endOfDay);
    };

    const handleAddTask = async (values) => {
        try {
            if (!selectedSlotDate) {
                showError('Please select a date first');
                return;
            }

            const selectedStart = values.slotStart || slotStart;
            const selectedDuration = Number(values.slotDuration || slotDuration);

            if (!selectedStart || !selectedDuration) {
                showError('Please select both start time and duration');
                return;
            }

            // Combine selected date with selected time
            const selectedDate = selectedSlotDate.format('YYYY-MM-DD');
            const selectedTime = selectedStart.format('HH:mm:ss');
            const combinedStart = dayjs(`${selectedDate} ${selectedTime}`);

            // For today's date, validate time restrictions
            const now = dayjs();
            const latest = dayjs().hour(19).minute(30);
            const isToday = selectedSlotDate.isSame(now, 'day');

            if (isToday) {
                if (now.isAfter(latest)) {
                    showError('Cannot assign slots after 7:30 PM');
                    return;
                }
                if (combinedStart.isBefore(now)) {
                    showError('Start time must be later than the current time');
                    return;
                }
            }

            // Always validate end time is before 7:30 PM
            const computedEnd = combinedStart.add(selectedDuration, 'minute');
            const endOfDay = selectedSlotDate.hour(19).minute(30);

            if (computedEnd.isAfter(endOfDay)) {
                showError('Selected slot exceeds 7:30 PM. Adjust the start or duration.');
                return;
            }

            const slots = [{
                start: combinedStart.toISOString(),
                end: computedEnd.toISOString(),
                durationMinutes: selectedDuration,
                slotDate: selectedDate
            }];

            const taskData = {
                userId: userId, // Creator/Sender userId
                receiverUserId: selectedReceiverUserId, // ✅ Receiver userId (from selected position)
                taskName: values.taskName,
                clientName: values.clientName,
                category: values.category,
                priority: values.priority,
                timeSpend: values.timeSpend || '',
                description: values.description || '',
                chatMessages: [], // Empty array for new tasks
                taskImages: uploadedImageUrls, // ✅ Include uploaded Cloudinary URLs
                slots
            };

            console.log('📤 Sending Task Data with Receiver:', {
                creatorUserId: userId,
                receiverUserId: selectedReceiverUserId,
                taskData
            });

            // Send to API
            if (isEditing && editingTask) {
                await updateTaskAssign({
                    taskId: editingTask._id,
                    body: taskData
                }).unwrap();
                showSuccess('Task updated successfully!');
            } else {
                await addTaskAssign(taskData).unwrap();
                // Emit socket event for real-time update
                emitTaskAdded(taskData);
                showSuccess('Task added successfully!');
            }

            // After successful submit, close drawer and clear draft
            resetDrawerState();
            setIsEditing(false);
            setEditingTask(null);
            setDrawerVisible(false);
        } catch (error) {
            if (error?.status === 409) {
                const message = error?.data?.message || 'Selected slot is unavailable. Please choose a different time.';
                const suggestions = error?.data?.suggestions || [];
                setConflictMessage(message);
                setConflictSuggestions(suggestions);
                showError(message);
            } else {
                showError(error?.data?.message || 'Failed to add task');
            }
            console.error('Error adding task:', error);
        }
    };

    const renderTabContent = () => {
        const commonProps = {
            searchTerm,
            selectedDateRange,
            userFilter: taskFilterUser,
            categoryFilter: taskFilterCategory
        };

        switch (activeTab) {
            case '1':
                return (
                    <AllTaskEntries
                        {...commonProps}
                        statusFilter={taskFilterStatus === 'deleted' ? 'all' : taskFilterStatus}
                        showArchivedOnly={taskFilterStatus === 'deleted'}
                        onEditTask={handleEditTask}
                    />
                );
            case '2':
                return (
                    <AllTaskEntries
                        {...commonProps}
                        statusFilter="pending"
                        onEditTask={handleEditTask}
                    />
                );
            case '3':
                return (
                    <AllTaskEntries
                        {...commonProps}
                        statusFilter="completed"
                        onEditTask={handleEditTask}
                    />
                );
            case '4':
                // Deleted tab → show ONLY archived tasks
                return (
                    <AllTaskEntries
                        {...commonProps}
                        statusFilter="all"
                        showArchivedOnly={true}
                    />
                );
            default:
                return <div>No content available.</div>;
        }
    };

    const formatExtensionTimestamp = (timestamp) => {
        if (!timestamp) return null;
        return dayjs(timestamp).format('MMM D, hh:mm A');
    };

    const formatSuggestionWindow = (suggestion) => {
        if (!suggestion) return '';
        const start = suggestion.start ? dayjs(suggestion.start) : null;
        const end = suggestion.end ? dayjs(suggestion.end) : null;
        if (!start || !start.isValid() || !end || !end.isValid()) return '';
        return `${start.format('hh:mm A')} - ${end.format('hh:mm A')}`;
    };

    const formatBookingWindow = (booking) => {
        if (!booking) return '';
        const start = booking.start ? dayjs(booking.start) : null;
        const end = booking.end ? dayjs(booking.end) : null;
        if (!start || !start.isValid() || !end || !end.isValid()) return '';
        const date = booking.slotDate ? dayjs(booking.slotDate) : start;
        const status = booking.status ? booking.status.replace(/^./, c => c.toUpperCase()) : undefined;
        return {
            dateLabel: date.isValid() ? date.format('ddd, MMM D') : start.format('ddd, MMM D'),
            timeLabel: `${start.format('hh:mm A')} - ${end.format('hh:mm A')}`,
            status
        };
    };

    return (
        <div id="ExecutionTaskAssignPanel" className={`theme-${theme}`}>
            <h2>Execution Task Assign Panel</h2>
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
                                    {
                                        key: '2',
                                        label: 'Pending'
                                    },
                                    {
                                        key: '3',
                                        label: 'Completed'
                                    },
                                    {
                                        key: '4',
                                        label: 'Deleted'
                                    }
                                ]}
                            />
                        </div>
                    </Col>
                    <Col lg={6} md={6} sm={24} xs={24}>
                        <div className="AddNewTaskButton" style={{ display: 'flex', gap: '8px' }}>
                            <Button type="primary" icon={<BiTask />} onClick={showDrawer} className="global-action-btn">Add New Task</Button>
                            <Button
                                icon={<BsFilter />}
                                onClick={toggleFilters}
                                className={`global-secondary-btn ${showFilters ? 'filter-active' : ''}`}
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
                                <Input
                                    prefix={<BsSearch style={{ color: 'var(--secondary-text)' }} />}
                                    placeholder="Search by task name or client name..."
                                    value={searchTerm}
                                    onChange={handleSearchChange}
                                    style={{ width: '100%' }}
                                    allowClear
                                />
                            </Col>
                            <Col xs={24} sm={24} md={12} lg={12}>
                                <DatePicker.RangePicker
                                    placeholder={['Start Date', 'End Date']}
                                    value={selectedDateRange}
                                    onChange={handleDateRangeChange}
                                    style={{ width: '100%' }}
                                />
                            </Col>
                            <Col xs={24} sm={24} md={12} lg={6}>
                                <Select
                                    value={taskFilterUser}
                                    onChange={setTaskFilterUser}
                                    placeholder="Filter by user"
                                    style={{ width: '100%' }}
                                >
                                    <Select.Option value="all">All users</Select.Option>
                                    {(allUsersData?.data || []).map((usr) => (
                                        <Select.Option key={usr.userId} value={usr.userId}>
                                            {usr.firstName} {usr.lastName}
                                        </Select.Option>
                                    ))}
                                </Select>
                            </Col>
                            <Col xs={24} sm={24} md={12} lg={6}>
                                <Select
                                    value={taskFilterCategory}
                                    onChange={setTaskFilterCategory}
                                    placeholder="Filter by category"
                                    style={{ width: '100%' }}
                                >
                                    <Select.Option value="all">All categories</Select.Option>
                                    {getAvailablePositions().map((position) => (
                                        <Select.Option key={position.value} value={position.label}>
                                            {position.label}
                                        </Select.Option>
                                    ))}
                                </Select>
                            </Col>
                            <Col xs={24} sm={24} md={12} lg={6}>
                                <Select
                                    value={taskFilterStatus}
                                    onChange={setTaskFilterStatus}
                                    placeholder="Filter by status"
                                    style={{ width: '100%' }}
                                >
                                    <Select.Option value="all">All type</Select.Option>
                                    <Select.Option value="pending">Pending</Select.Option>
                                    <Select.Option value="completed">Completed</Select.Option>
                                    <Select.Option value="deleted">Deleted</Select.Option>
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
                    <div className="AntdTabsContent">
                        {renderTabContent()}
                    </div>
                </div>
            </div>

            <Drawer
                title={
                    <div className="custom-drawer-header">
                        <div className="drawer-title">
                            <h2>{isEditing ? 'Edit Task' : 'Add New Task'}</h2>
                        </div>
                        <div className="drawer-close-btn">
                            <Button
                                type="text"
                                icon={<IoClose />}
                                onClick={onClose}
                                className="close-button"
                            />
                        </div>
                    </div>
                }
                placement="right"
                width={920}
                onClose={onClose}
                open={drawerVisible}
                closable={false}
                className="custom-drawer"
            >
                <div className={`drawer-content theme-${theme}`}>
                    <Form
                        form={form}
                        layout="vertical"
                        className="task-form"
                        onFinish={handleAddTask}
                        onValuesChange={handleFormValuesChange}
                    >
                        <div className="task-section-grid">
                            <section className="task-form-section task-section-details">
                                <div className="task-section-header">
                                    <div className="task-section-icon">
                                        <BsCardChecklist />
                                    </div>
                                    <div>
                                        <h3>Task Details</h3>
                                        <p>Give a clear name and client context.</p>
                                    </div>
                                </div>
                                <Row gutter={[16, 16]}>
                                    <Col xs={24} sm={24} md={12} lg={12}>
                                        <Form.Item
                                            label="Task Name"
                                            name="taskName"
                                            rules={[{ required: true, message: 'Please enter task name' }]}
                                        >
                                            <Input placeholder="Enter task name" />
                                        </Form.Item>
                                    </Col>
                                    <Col xs={24} sm={24} md={12} lg={12}>
                                        <Form.Item
                                            label="Client Name"
                                            name="clientName"
                                            rules={[{ required: true, message: 'Please enter client name' }]}
                                        >
                                            <Input placeholder="Enter client name" />
                                        </Form.Item>
                                    </Col>
                                </Row>
                            </section>

                            <section className="task-form-section task-section-assignment">
                                <div className="task-section-header">
                                    <div className="task-section-icon">
                                        <BsPersonPlus />
                                    </div>
                                    <div>
                                        <h3>Assign To</h3>
                                        <p>Select the target position and teammate.</p>
                                    </div>
                                </div>
                                <Row gutter={[16, 16]}>
                                    <Col xs={24} sm={24} md={12} lg={12}>
                                        <Form.Item
                                            label="Assign Task Category"
                                            name="category"
                                            rules={[{ required: true, message: 'Please select a category' }]}
                                        >
                                            <Select
                                                placeholder="Select position"
                                                onChange={handlePositionChange}
                                            >
                                                {getAvailablePositions().map((position) => (
                                                    <Select.Option key={position.value} value={position.value}>
                                                        {position.label}
                                                    </Select.Option>
                                                ))}
                                            </Select>
                                        </Form.Item>
                                    </Col>
                                    <Col xs={24} sm={24} md={12} lg={12}>
                                        <Form.Item
                                            label="Select User"
                                            name="selectedUser"
                                            rules={[{ required: true, message: 'Please select a user' }]}
                                        >
                                            <Select
                                                placeholder={selectedPosition ? "Select user" : "First select a position"}
                                                disabled={!selectedPosition || availableUsers.length === 0}
                                                onChange={handleUserSelection}
                                            >
                                                {getUsersForPosition().map((user) => (
                                                    <Select.Option key={user.value} value={user.value}>
                                                        {user.label}
                                                    </Select.Option>
                                                ))}
                                            </Select>
                                        </Form.Item>
                                    </Col>
                                </Row>
                            </section>
                        </div>

                        <div className="task-form-section task-section-schedule">
                            <div className="task-section-header">
                                <div className="task-section-icon">
                                    <BsClockHistory />
                                </div>
                                <div>
                                    <h3>Schedule Slot</h3>
                                    <p>Reserve a focused window for this task.</p>
                                </div>
                            </div>

                            <div className={`slot-selector ${selectedReceiverUserId ? 'slot-selector-active' : 'slot-selector-disabled'}`}>
                                {!selectedReceiverUserId && (
                                    <div className="slot-selector-empty">
                                        Choose a teammate to unlock scheduling.
                                    </div>
                                )}

                                {selectedReceiverUserId && (
                                    <>
                                        <div className="slot-date-picker">
                                            <span className="slot-date-picker-label">Select Date (next 20 days)</span>
                                            <div className="slot-date-grid">
                                                {dateOptions.map(date => {
                                                    const isSelected = selectedSlotDate && date.isSame(selectedSlotDate, 'day');
                                                    return (
                                                        <button
                                                            key={date.toISOString()}
                                                            type="button"
                                                            className={`slot-date-card ${isSelected ? 'selected' : ''}`}
                                                            onClick={() => handleDateSelect(date)}
                                                        >
                                                            <span className="slot-date-day">{date.format('ddd')}</span>
                                                            <span className="slot-date-number">{date.format('D')}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Booked Slots Display */}
                                        {selectedSlotDate && (
                                            <div className="slot-bookings">
                                                <div className="slot-bookings-header">
                                                    <div>
                                                        <span className="slot-bookings-label">Bookings overview</span>
                                                        <span className="slot-bookings-date">{selectedSlotDate.format('ddd, MMM D')}</span>
                                                    </div>
                                                    <Tag
                                                        className="slot-bookings-count"
                                                        color={bookedSlots.length ? 'green' : 'gold'}
                                                    >
                                                        {bookedSlots.length
                                                            ? `${bookedSlots.length} ${bookedSlots.length === 1 ? 'slot' : 'slots'}`
                                                            : 'No slots'}
                                                    </Tag>
                                                </div>
                                                {isLoadingBookings ? (
                                                    <InlineLoader
                                                        text="Checking existing bookings…"
                                                        color="var(--brand-color)"
                                                        size={18}
                                                        className="slot-bookings-loading"
                                                    />
                                                ) : bookedSlots.length === 0 ? (
                                                    <div className="slot-bookings-empty-card">
                                                        <p>No slots booked for this date.</p>
                                                        <span>Select a start time below to reserve one.</span>
                                                    </div>
                                                ) : (
                                                    <div className="slot-bookings-grid">
                                                        {bookedSlots.map((booking, index) => {
                                                            const start = dayjs(booking.start);
                                                            const end = dayjs(booking.end);
                                                            const statusLabel = (booking.status || 'scheduled').replace(/^./, (char) => char.toUpperCase());
                                                            return (
                                                                <div key={`booking-${booking.slotId || index}`} className="slot-booking-card">
                                                                    <div className="slot-booking-time-range">
                                                                        <span>{start.format('hh:mm A')} - {end.format('hh:mm A')}</span>
                                                                        <span className="slot-booking-duration-chip">
                                                                            {(booking.durationMinutes ?? 0) + ' mins'}
                                                                        </span>
                                                                    </div>
                                                                    <div className="slot-booking-task-name">
                                                                        {booking.taskName || 'Untitled task'}
                                                                    </div>
                                                                    <div className="slot-booking-meta">
                                                                        <span className="slot-booking-task-ref">
                                                                            {dayjs(booking.slotDate || booking.start).format('MMM D')}
                                                                        </span>
                                                                        <Tag
                                                                            className="slot-booking-status-tag"
                                                                            color={getBookingStatusColor(booking.status)}
                                                                        >
                                                                            {statusLabel}
                                                                        </Tag>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Task Start Time and Duration - Only show after date is selected */}
                                        {selectedSlotDate && (
                                            <Row gutter={[16, 16]} style={{ marginTop: '18px' }}>
                                                <Col xs={24} sm={12} md={12} lg={12}>
                                                    <div className="slot-input-card">
                                                        <span className="slot-input-label">Task Start Time</span>
                                                        <Form.Item
                                                            name="slotStart"
                                                            rules={[
                                                                // { required: true, message: 'Please select a start time' },
                                                                { validator: validateSlotStart }
                                                            ]}
                                                        >
                                                            <TimePicker
                                                                value={slotStart}
                                                                onChange={handleSlotStartChange}
                                                                use12Hours
                                                                format="hh:mm A"
                                                                minuteStep={5}
                                                                style={{ width: '100%' }}
                                                                disabledTime={getDisabledStartTimes}
                                                                showSecond={false}
                                                                placeholder="Pick a start time"
                                                            />
                                                        </Form.Item>
                                                        <p className="slot-helper-text">
                                                            Available in 5-minute intervals until 7:30 PM.
                                                        </p>
                                                    </div>
                                                </Col>
                                                <Col xs={24} sm={12} md={12} lg={12}>
                                                    <div className="slot-input-card">
                                                        <span className="slot-input-label">Duration</span>
                                                        <Form.Item
                                                            name="slotDuration"
                                                            rules={[
                                                                { required: true, message: 'Please choose a duration' },
                                                                { validator: validateSlotDuration }
                                                            ]}
                                                        >
                                                            <Radio.Group
                                                                className="slot-duration-group"
                                                                value={slotDuration}
                                                                onChange={handleSlotDurationChange}
                                                                disabled={!slotStart}
                                                            >
                                                                {SLOT_DURATION_OPTIONS.map(option => (
                                                                    <Radio.Button
                                                                        key={option.value}
                                                                        value={option.value}
                                                                        disabled={isDurationDisabled(option.value)}
                                                                        style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                                                                    >
                                                                        {option.label}
                                                                    </Radio.Button>
                                                                ))}
                                                            </Radio.Group>
                                                        </Form.Item>
                                                        <p className="slot-helper-text">
                                                            Pick a preset block that fits within the day.
                                                        </p>
                                                    </div>
                                                </Col>
                                            </Row>
                                        )}

                                        {slotEnd && (
                                            <div style={{ color: 'var(--success-color)', fontSize: '12px', marginTop: -4 }}>
                                                Ends at {slotEnd.format('hh:mm A')}
                                            </div>
                                        )}

                                        {slotSuggestions.length > 0 && (
                                            <div className="slot-suggestions">
                                                <span className="slot-suggestions-label">Suggested windows</span>
                                                <div className="slot-suggestions-list">
                                                    {slotSuggestions.map((suggestion, index) => (
                                                        <Button
                                                            key={`suggestion-${index}`}
                                                            size="small"
                                                            className="slot-suggestion-chip"
                                                            onClick={() => applySlotSuggestion(suggestion)}
                                                        >
                                                            {formatSuggestionWindow(suggestion) || 'Suggestion'}
                                                        </Button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {conflictMessage && (
                                            <Alert
                                                message={conflictMessage}
                                                type="error"
                                                showIcon
                                                className="slot-conflict-alert"
                                            />
                                        )}
                                        {conflictSuggestions.length > 0 && (
                                            <div className="slot-suggestions conflict">
                                                <span className="slot-suggestions-label">Alternate windows</span>
                                                <div className="slot-suggestions-list">
                                                    {conflictSuggestions.map((suggestion, index) => (
                                                        <Button
                                                            key={`conflict-suggestion-${index}`}
                                                            size="small"
                                                            className="slot-suggestion-chip"
                                                            danger
                                                            onClick={() => applySlotSuggestion(suggestion)}
                                                        >
                                                            {formatSuggestionWindow(suggestion) || 'Alternate'}
                                                        </Button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <div className="slot-summary-bar">
                                            <div className="slot-summary-time">
                                                <span>Start</span>
                                                <strong>{slotStart ? slotStart.format('hh:mm A') : '--'}</strong>
                                            </div>
                                            <div className="slot-summary-duration">
                                                <span>Duration</span>
                                                <strong>{slotDuration ? `${slotDuration} mins` : '--'}</strong>
                                            </div>
                                            <div className="slot-summary-end">
                                                <span>Ends</span>
                                                <strong>{slotEnd ? slotEnd.format('hh:mm A') : '--'}</strong>
                                            </div>
                                        </div>

                                        {slotWarning && (
                                            <Alert
                                                message={slotWarning}
                                                type="warning"
                                                showIcon
                                                className="slot-warning-alert"
                                            />
                                        )}
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="task-form-section task-section-files">
                            <div className="task-section-header">
                                <div className="task-section-icon">
                                    <BsPaperclip />
                                </div>
                                <div>
                                    <h3>Attachments & Effort</h3>
                                    <p>Share references and expected time investment.</p>
                                </div>
                            </div>
                            <Row gutter={[16, 16]}>
                                <Col xs={24} sm={24} md={12} lg={12}>
                                    <Form.Item
                                        label="Priority Set"
                                        name="priority"
                                        rules={[{ required: true, message: 'Please select priority' }]}
                                    >
                                        <Select placeholder="Select priority">
                                            <Select.Option value="high">High Priority</Select.Option>
                                            <Select.Option value="medium">Medium Priority</Select.Option>
                                            <Select.Option value="low">Low Priority</Select.Option>
                                        </Select>
                                    </Form.Item>
                                </Col>
                                {/* <Col xs={24} sm={24} md={12} lg={12}>
                                    <Form.Item
                                        label="Time Spend on This Project"
                                        name="timeSpend"
                                    >
                                        <Input
                                            prefix={<BsClock />}
                                            placeholder="e.g., 02:30 hrs"
                                        />
                                    </Form.Item>
                                </Col> */}
                                <Col xs={24} sm={24} md={12} lg={12}>
                                    <Form.Item
                                        label="Task References"
                                        name="taskImages"
                                    >
                                        <Upload {...uploadProps}>
                                            <Button icon={<BsUpload />} loading={uploadingImages} className="global-secondary-btn" style={{ width: '100%' }}>
                                                {uploadingImages ? 'Uploading...' : 'Upload Files'}
                                            </Button>
                                        </Upload>
                                    </Form.Item>
                                </Col>
                            </Row>
                            <br />
                            {/* <Row gutter={[16, 16]}>

                            </Row> */}
                        </div>

                        <div className="task-form-section task-section-description">
                            <div className="task-section-header">
                                <div className="task-section-icon">
                                    <BsCardChecklist />
                                </div>
                                <div>
                                    <h3>Detailed Brief</h3>
                                    <p>Outline deliverables, milestones, or notes.</p>
                                </div>
                            </div>
                            <Form.Item
                                name="description"
                            >
                                <TextArea
                                    rows={5}
                                    placeholder="Provide a clear description or checklist for the assignee..."
                                />
                            </Form.Item>
                        </div>

                        <div className="drawer-footer-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                            <Button
                                className="global-secondary-btn"
                                onClick={resetDrawerState}
                                style={{ width: '120px' }}
                            >
                                Reset Form
                            </Button>
                            <Button
                                className="global-action-btn"
                                htmlType="submit"
                                loading={isLoading}
                                style={{ width: '140px' }}
                            >
                                {isLoading ? (isEditing ? 'Updating...' : 'Adding...') : (isEditing ? 'Update Task' : 'Add Task')}
                            </Button>
                        </div>
                    </Form>
                </div>
            </Drawer>
        </div>
    );
};

export default ExecutionTaskAssignPanel;
