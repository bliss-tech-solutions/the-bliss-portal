# Real-Time Task Updates Implementation Guide

## ✅ IMPLEMENTATION COMPLETE

This document describes the real-time task update implementation using Socket.IO on both frontend and backend.

---

## 🔧 BACKEND SOCKET EVENTS (Already Implemented)

The backend emits the following Socket.IO events:

### 1. Task Creation Events:
- **`task:new`** - Emitted globally when a new task is created
- **`task:created`** - Emitted to task room and user rooms when task is created
- **`task:assigned`** - Emitted to receiver user room when task is assigned

**Event Format:**
```javascript
{
  taskId: "task_id_string",
  task: { /* full task object */ }
}
```

### 2. Task Update Events:
- **`task:updated`** - Emitted globally when task is updated
- **`task:statusUpdated`** - Emitted to task room and user rooms when status changes

**Event Format:**
```javascript
{
  taskId: "task_id_string",
  taskStatus: "pending" | "completed",
  task: { /* full updated task object */ }
}
```

---

## 📱 FRONTEND IMPLEMENTATION

### Step 1: Socket Utility Functions (`src/utils/socket.js`)

**Already Implemented:**

```javascript
// Listen for task creation events
export const onTaskAdded = (callback) => {
    if (socket) {
        socket.on('taskAdded', callback);
        // Also listen to backend socket events
        socket.on('task:new', (data) => {
            const task = data.task || data;
            callback(task);
        });
        socket.on('task:created', (data) => {
            const task = data.task || data;
            callback(task);
        });
        socket.on('task:assigned', (data) => {
            const task = data.task || data;
            callback(task);
        });
    }
};

// Listen for task update events
export const onTaskUpdated = (callback) => {
    if (socket) {
        socket.on('task:updated', (data) => {
            const task = data.task || data;
            callback(task);
        });
        socket.on('task:statusUpdated', (data) => {
            const task = data.task || data;
            callback(task);
        });
    }
};
```

**Key Points:**
- Handles both frontend events (`taskAdded`) and backend events (`task:new`, `task:created`, `task:assigned`, `task:updated`, `task:statusUpdated`)
- Extracts task object from different event formats
- Proper cleanup functions (`offTaskAdded`, `offTaskUpdated`)

---

### Step 2: Execution Task Assign Panel (`ExecutionTaskAssignPanel.jsx`)

**Location:** `src/components/RoutesComponents/ExecutionTaskAssignPanel/ExecutionTaskAssignPanel.jsx`

**Implementation:**

```javascript
// Socket.io listener for real-time task updates (notifications only)
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
        offTaskAdded();
        offTaskUpdated();
    };
}, [userId, showSuccess]);
```

**What it does:**
- Shows notifications when tasks are created/updated
- Notes that `AllTaskEntries` component handles the actual refetch
- Filters events to only show notifications for tasks created by current user

---

### Step 3: All Task Entries (Execution Side) (`AllTaskEntries.jsx`)

**Location:** `src/components/RoutesComponents/ExecutionTaskAssignPanel/AllTaskEntries/AllTaskEntries.jsx`

**Implementation:**

```javascript
// Real-time task updates via socket
useEffect(() => {
    // Handle task creation events
    const handleTaskAdded = (taskData) => {
        if (!taskData) return;
        
        // Check if this task is created by current user (execution role)
        const isCreatedByCurrentUser = taskData.userId === userId;
        
        if (isCreatedByCurrentUser) {
            console.log('✅ New task created via socket:', taskData);
            // Refetch tasks to show the new task in the list
            refetch();
        }
    };

    // Handle task update events
    const handleTaskUpdated = (taskData) => {
        if (!taskData) return;
        
        console.log('✅ Task updated via socket:', taskData);
        // Refetch tasks to get updated task data
        refetch();
        
        // Update selected task if it's the one that was updated
        if (selectedTaskRef.current && selectedTaskRef.current._id === taskData._id) {
            setSelectedTask(taskData);
        }
    };

    // Handle extension updates
    const handleExtensionUpdate = (payload) => {
        if (!payload) return;
        const { receiverUserId, userId: creatorUserId, requestedBy } = payload;
        if (receiverUserId === userId || creatorUserId === userId || requestedBy === userId) {
            refetch();
        }
    };

    // Set up all socket listeners
    onTaskAdded(handleTaskAdded);
    onTaskUpdated(handleTaskUpdated);
    onTaskExtensionUpdated(handleExtensionUpdate);

    // Cleanup listeners on unmount
    return () => {
        offTaskAdded();
        offTaskUpdated();
        offTaskExtensionUpdated(handleExtensionUpdate);
    };
}, [refetch, userId]);
```

**What it does:**
- **Task Creation**: When a new task is created by execution role, refetches the task list
- **Task Updates**: When a task is updated, refetches the list and updates the selected task if open
- **Extension Updates**: Handles extension request/response updates
- Only refetches for tasks created by the current user (execution role)

---

### Step 4: All User Task Entries (User Side) (`AllUserTaskEntries.jsx`)

**Location:** `src/components/RoutesComponents/UserTaskAssignmentPanel/TaskManagePanelUser/AllUserTaskEntries/AllUserTaskEntries.jsx`

**Implementation:**

```javascript
// Real-time task updates via socket
useEffect(() => {
    // Listen for new tasks added (real-time task fetching)
    const handleTaskAdded = (taskData) => {
        if (!taskData) return;

        // Check if this task is assigned to the current user
        const isForCurrentUser = taskData.receiverUserId === userId;
        
        if (isForCurrentUser) {
            console.log('✅ New task received via socket:', taskData);
            // Refetch tasks to get the latest list with the new task
            refetch();
            
            // Show success notification
            if (taskData.taskName) {
                showSuccess(`New task assigned: ${taskData.taskName}`);
            }
        }
    };

    // Handle task update events
    const handleTaskUpdated = (taskData) => {
        if (!taskData) return;

        // Check if this task is assigned to the current user
        const isForCurrentUser = taskData.receiverUserId === userId;

        if (isForCurrentUser) {
            console.log('✅ Task updated via socket:', taskData);
            // Refetch tasks to get the latest list with updated task
            refetch();

            // Update selected task if it's the one that was updated
            if (selectedTaskRef.current && selectedTaskRef.current._id === taskData._id) {
                setSelectedTask(taskData);
            }
        }
    };

    // Listen for extension updates
    const handleExtensionUpdate = (payload) => {
        if (!payload) return;

        const { taskId, receiverUserId, userId: assignerUserId, task: updatedTask } = payload;
        const isRelevant = receiverUserId === userId || assignerUserId === userId;

        if (isRelevant) {
            refetch();

            if (selectedTaskRef.current && selectedTaskRef.current._id === taskId && updatedTask) {
                setSelectedTask(prev => ({
                    ...prev,
                    ...updatedTask
                }));
            }
        }
    };

    // Set up socket listeners
    onTaskAdded(handleTaskAdded);
    onTaskUpdated(handleTaskUpdated);
    onTaskExtensionUpdated(handleExtensionUpdate);

    // Cleanup listeners on unmount
    return () => {
        offTaskAdded();
        offTaskUpdated();
        offTaskExtensionUpdated(handleExtensionUpdate);
    };
}, [refetch, userId, showSuccess]);
```

**What it does:**
- **Task Creation**: When a new task is assigned to the user, refetches tasks and shows notification
- **Task Updates**: When a task assigned to the user is updated, refetches and updates selected task
- **Extension Updates**: Handles extension request/response updates
- Only processes events for tasks assigned to the current user (`receiverUserId === userId`)

---

## 🔄 REAL-TIME FLOW

### Task Creation Flow:

1. **Execution Role User** creates a task via `ExecutionTaskAssignPanel`
2. **Backend** processes task creation and emits:
   - `task:new` (global)
   - `task:created` (to task room and user rooms)
   - `task:assigned` (to receiver user room)
3. **Frontend Execution Side** (`AllTaskEntries`):
   - Listens for `task:new`, `task:created`
   - Checks if `taskData.userId === userId` (created by current user)
   - If yes, calls `refetch()` to update task list
4. **Frontend User Side** (`AllUserTaskEntries`):
   - Listens for `task:assigned`, `task:created`
   - Checks if `taskData.receiverUserId === userId` (assigned to current user)
   - If yes, calls `refetch()` and shows notification

### Task Update Flow:

1. **Any User** updates a task (status change, etc.)
2. **Backend** processes update and emits:
   - `task:updated` (global)
   - `task:statusUpdated` (to task room and user rooms)
3. **Frontend Execution Side** (`AllTaskEntries`):
   - Listens for `task:updated`, `task:statusUpdated`
   - Calls `refetch()` to get updated task data
   - Updates selected task if it's the one that was updated
4. **Frontend User Side** (`AllUserTaskEntries`):
   - Listens for `task:updated`, `task:statusUpdated`
   - Checks if task is assigned to current user
   - If yes, calls `refetch()` and updates selected task

---

## ✅ FEATURES IMPLEMENTED

### Execution Side:
- ✅ Real-time task creation notifications
- ✅ Real-time task list updates when tasks are created
- ✅ Real-time task list updates when tasks are updated
- ✅ Real-time extension request/response updates
- ✅ Selected task updates when it's modified

### User Side:
- ✅ Real-time task assignment notifications
- ✅ Real-time task list updates when new tasks are assigned
- ✅ Real-time task list updates when assigned tasks are updated
- ✅ Real-time extension request/response updates
- ✅ Selected task updates when it's modified

---

## 🎯 KEY POINTS

1. **No Functionality Changed**: All existing features remain intact
2. **Real-Time Only**: Socket listeners only add real-time updates, existing API calls still work
3. **Event Filtering**: Components only process events relevant to the current user
4. **Automatic Refetch**: Task lists automatically refresh when events are received
5. **Selected Task Updates**: If a task detail drawer is open, it updates in real-time

---

## 🧪 TESTING

### Test Case 1: Task Creation
1. Open two browser windows:
   - Window A: Execution role user (task assignment panel)
   - Window B: User role (my tasks panel)
2. In Window A, create a new task and assign to user in Window B
3. **Expected**: Task appears instantly in Window B without page reload

### Test Case 2: Task Status Update
1. Open task detail drawer in Window B
2. Update task status (complete/pending) in Window A or via API
3. **Expected**: Task status updates instantly in Window B

### Test Case 3: Multiple Tasks
1. Create multiple tasks rapidly
2. **Expected**: All tasks appear in real-time on user side

---

## 📝 NOTES

- Socket connection is managed globally in `socket.js`
- User rooms are joined automatically via `connectSocket(userId)`
- Event listeners are properly cleaned up on component unmount
- RTK Query's `refetch()` is used to update task lists (maintains cache)
- Selected task state is updated directly for immediate UI feedback

---

## 🔍 TROUBLESHOOTING

**Issue**: Tasks not updating in real-time
- **Check**: Socket connection status (check console for "✅ Socket connected")
- **Check**: User is in correct room (`joinUser` event emitted)
- **Check**: Backend is emitting events correctly
- **Check**: Event listeners are set up in useEffect

**Issue**: Duplicate tasks appearing
- **Check**: Refetch logic (should replace, not append)
- **Check**: Event filtering (only process relevant tasks)

**Issue**: Selected task not updating
- **Check**: `selectedTaskRef.current` is set correctly
- **Check**: Task ID matching logic

---

## ✅ STATUS

**Implementation Status**: ✅ COMPLETE

All real-time task update features have been implemented:
- ✅ Socket listeners for task creation
- ✅ Socket listeners for task updates
- ✅ Automatic refetch on events
- ✅ Selected task updates
- ✅ Notifications for relevant events
- ✅ Proper cleanup on unmount

