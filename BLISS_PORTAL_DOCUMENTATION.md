================================================================================
                    BLISS PORTAL - COMPLETE FLOW DOCUMENTATION
================================================================================

📁 PROJECT STRUCTURE:
================================================================================

src/
├── components/
│   ├── PortalCommonComponents/
│   │   ├── PortalHeader/
│   │   │   ├── PortalHeader.jsx (Header with greeting, date, theme toggle, notifications, profile)
│   │   │   └── PortalHeader.css (Header styling)
│   │   ├── PortalSideBar/
│   │   │   ├── PortalSideBar.jsx (Sidebar with logo and navigation)
│   │   │   └── PortalSideBar.css (Sidebar styling)
│   │   └── TaskChat/
│   │       ├── TaskChat.jsx (Reusable chat component with emoji picker, media uploads)
│   │       └── TaskChat.css (Chat styling with emoji support, media previews)
│   │   ├── CalenderModule/
│   │   │   ├── CalenderModule.jsx (Reusable calendar component for tasks and leaves)
│   │   │   └── CalenderModule.css (Calendar styling)
│   │   └── TaskAndLeaveCalender/
│   │       ├── TaskAndLeaveCalender.jsx (User-side task and leave management calendar)
│   │       └── TaskAndLeaveCalender.css (Calendar styling)
│   │   ├── HRWorkComponent/
│   │   │   └── FestiveCalender/
│   │   │       ├── FestiveCalender.jsx (HR-side festive calendar with leave management)
│   │   │       └── FestiveCalender.css (Calendar styling)
│   ├── RoutesComponents/
│   │   ├── ExecutionTaskAssignPanel/
│   │   │   ├── ExecutionTaskAssignPanel.jsx (Task assignment panel with filters)
│   │   │   ├── ExecutionTaskAssignPanel.css (Panel styling)
│   │   │   └── AllTaskEntries/
│   │   │       ├── AllTaskEntries.jsx (Task list with archive functionality)
│   │   │       └── AllTaskEntries.css (Task entries styling)
│   │   ├── UserTaskAssignmentPanel/
│   │   │   ├── UserTaskAssignmentPanel.jsx (User task panel)
│   │   │   ├── UserTaskAssignmentPanel.css (User panel styling)
│   │   │   └── AllUserTaskEntries/
│   │   │       ├── AllUserTaskEntries.jsx (User task list with chat)
│   │   │       └── AllUserTaskEntries.css (User task entries styling)
│   │   └── UserRolePanel/
│   │       ├── UserRolePanel.jsx (Chat testing panel)
│   │       └── UserRolePanel.css (Chat panel styling)
│   ├── Navigation/
│   │   ├── navigationConfig.js (Route configuration with roles)
│   │   └── Navigation.jsx (Dynamic navigation component)
│   ├── Dashboard/
│   │   ├── Dashboard.jsx (Main dashboard layout)
│   │   └── Dashboard.css (Dashboard layout styling)
│   ├── LoginPortal/
│   │   ├── LoginPortal.jsx (Login form with API integration)
│   │   └── LoginPortal.css (Login styling)
│   ├── UserVerificationForm/
│   │   ├── UserVerificationForm.jsx (User registration form with dynamic positions)
│   │   └── UserVerificationForm.css (Registration styling)
│   └── ProtectedRoute.jsx (Route protection logic)
├── store/
│   ├── api.js (RTK Query API endpoints - tasks, chat, users)
│   ├── index.js (Redux store configuration)
│   └── slices/
│       ├── authSlice.js (Authentication state)
│       ├── themeSlice.js (Theme state)
│       └── roleSlice.js (Role-based state management)
├── routes/
│   └── PortalRoutes.jsx (Route definitions)
├── contexts/
│   ├── SocketContext.jsx (Socket.IO context provider)
│   └── NotificationContext.jsx (Notification system context)
├── utils/
│   ├── socket.js (Socket.IO utilities)
│   └── cloudinary.js (Cloudinary upload utilities for media files)
├── styles/
│   └── theme.css (Global theme variables)
└── App.jsx (Main app component)

================================================================================
🔄 COMPLETE FLOW:
================================================================================

1. APP ENTRY POINT:
   - App.jsx → Initializes theme from localStorage → Renders PortalRoutes

2. ROUTE PROTECTION:
   - PortalRoutes.jsx → Defines all routes with ProtectedRoute wrapper
   - ProtectedRoute.jsx → Checks authentication state → Redirects to login if not authenticated

3. LOGIN FLOW:
   - LoginPortal.jsx → User enters credentials → Calls signInUser API from api.js
   - api.js → Makes API call → Returns user data with role and position
   - authSlice.js → Stores user data, userId, token in Redux state → Saves to localStorage
   - LoginPortal.jsx → Shows success notification → Redirects to /Dashboard

4. USER REGISTRATION FLOW:
   - UserVerificationForm.jsx → Dynamic role-based position dropdown
   - Role "Execution" → Shows "SME" position
   - Role "user" → Shows "Graphics Designer", "Developer", "Content Writer", "Video Editor"
   - Form submission → Creates user → Redirects to login page

5. DASHBOARD LAYOUT:
   - Dashboard.jsx → Main portal layout with sidebar and content area
   - PortalSideBar.jsx → Shows logo and navigation menu
   - PortalHeader.jsx → Shows greeting, date, theme toggle, notifications, profile with role and position

6. NAVIGATION SYSTEM:
   - navigationConfig.js → Defines routes with role-based access
   - Navigation.jsx → Filters routes based on user role → Creates menu items
   - PortalSideBar.jsx → Renders Navigation component

7. DYNAMIC CONTENT:
   - Dashboard.jsx → Detects current route → Renders appropriate component
   - ExecutionTaskAssignPanel.jsx → Task management for Execution role users
   - UserTaskAssignmentPanel.jsx → Task viewing for regular users

8. THEME SYSTEM:
   - themeSlice.js → Manages light/dark theme state
   - theme.css → CSS variables for theme colors
   - PortalHeader.jsx → Theme toggle button → Updates global theme

9. TASK MANAGEMENT FLOW:
   - ExecutionTaskAssignPanel.jsx → "Add New Task" drawer with dynamic user selection
   - Position selection → Shows users from OTHER roles only
   - User selection → Stores receiverId for task assignment
   - Task creation → API call with assignerId (creator) and receiverId
   - Real-time updates → Socket.IO integration for instant task updates

10. TASK VIEWING FLOW:
    - Execution Panel (AllTaskEntries.jsx):
      * Uses GET /api/getTaskAssign/assigner/:assignerId → Shows tasks assigned BY the user
      * Filter system → Search by task name/client name, date range picker
      * Archive functionality → Modal confirmation with task details
      * View task drawer → Shows full task details with integrated chat
    - User Panel (AllUserTaskEntries.jsx):
      * Uses GET /api/getTaskAssign/receiver/:receiverId → Shows tasks assigned TO the user
      * Task status management → Update task status (pending/completed)
      * View task drawer → Shows full task details with integrated chat

11. CHAT SYSTEM:
    - TaskChat.jsx → Reusable chat component with emoji picker
    - Real-time messaging → Socket.IO for instant message delivery
    - Bidirectional chat → Both sender and receiver can send messages
    - Emoji support → 18px emoji picker with multiple selection
    - Media uploads → Image, video, and document uploads via Cloudinary
    - Media previews → Inline previews for images, videos, and PDFs
    - Fullscreen preview → Click media to view in fullscreen modal
    - Batch uploads → Select and preview multiple files before sending
    - Message persistence → API integration for message storage

12. USER DATA FLOW:
    - authSlice.js → Stores user data from login API response
    - PortalHeader.jsx → Shows user's firstName/lastName, role, position, and current date/time
    - Task components → Access user data via Redux selectors

13. CALENDAR & LEAVE MANAGEMENT FLOW:
    - CalenderModule.jsx → Reusable calendar component for dynamic use cases
    - TaskAndLeaveCalender.jsx → User-side calendar for task and leave management
    - Multi-date selection → Users can select individual dates (not just ranges)
    - Leave request submission → POST /api/leave/request with selected dates and reason
    - Leave history → Display approved/rejected/pending leaves with color coding
    - FestiveCalender.jsx → HR-side calendar for task management and leave approval
    - Leave approval workflow → HR can approve/reject specific dates with instructions
    - Real-time updates → Socket.IO integration for instant leave status updates
    - Local storage persistence → Selected dates and reasons saved locally

================================================================================
🎯 KEY FEATURES:
================================================================================

AUTHENTICATION & USER MANAGEMENT:
- Login with email/password → API validation → Redux state management → Route protection
- User registration with dynamic role-based position selection
- Role-based access control (Execution vs User roles)

TASK MANAGEMENT SYSTEM:
- Task creation with user assignment (Execution role only)
- Dynamic position filtering (show OTHER roles' positions)
- Two-step user selection (position → specific user)
- Task archiving with confirmation modal
- Real-time task updates via Socket.IO

FILTERING & SEARCH:
- Real-time search by task name and client name
- Date range filtering (ready for backend integration)
- Archive status filtering (isArchived = false)
- Clear filters functionality

CHAT SYSTEM:
- Real-time bidirectional chat using Socket.IO
- Emoji picker with 18px emoji support
- Media uploads (images, videos, PDFs, Word docs) via Cloudinary
- Inline media previews (images, videos, PDF thumbnails)
- Fullscreen media preview on click
- Batch file selection and preview before sending
- File size limits (images: 10MB, videos: 100MB, documents: 25MB)
- Reusable TaskChat component
- Message persistence via API
- Task-specific chat rooms
- Auto-scroll to latest messages
- Media type detection and proper rendering

CALENDAR & LEAVE MANAGEMENT:
- Reusable CalenderModule component for dynamic calendar needs
- User-side leave request system with multi-date selection
- Leave request submission with mandatory reason
- Leave history display with status color coding (green: approved, red: rejected, orange: pending)
- HR-side leave approval workflow
- Date-specific approval/rejection with instructions
- Real-time leave status updates via Socket.IO
- Local storage persistence for draft leave requests
- Task calendar integration for HR users

THEME SYSTEM:
- Light/Dark toggle → CSS variables → Global theme application
- Consistent theming across all components
- Theme-aware modal and drawer styling

DYNAMIC NAVIGATION:
- Route configuration → Role filtering → Dynamic menu generation
- Execution role → Task assignment panel access
- User role → Task viewing panel access

RESPONSIVE DESIGN:
- Mobile-friendly layouts → Theme-aware styling → Smooth transitions
- Responsive filter section with mobile-optimized layout

================================================================================
🔧 TECHNICAL STACK:
================================================================================

- React → Component-based UI
- Redux Toolkit → State management
- RTK Query → API integration
- React Router → Navigation
- Ant Design → UI components
- Socket.IO → Real-time communication
- CSS Variables → Theme system
- Emoji Picker React → Emoji functionality
- Cloudinary → Media upload and storage (unsigned upload preset)
- dayjs → Date manipulation and formatting

================================================================================
📋 API ENDPOINTS:
================================================================================

AUTHENTICATION:
- POST /api/signin → User login
- POST /api/addUserDetails → User registration
- GET /api/getUserDetails → Get user data

TASK MANAGEMENT:
- POST /api/addtaskassign → Create new task (uses assignerId and receiverId fields)
- GET /api/getTaskAssign/assigner/:assignerId → Get tasks assigned BY a user (for Execution panel)
- GET /api/getTaskAssign/receiver/:receiverId → Get tasks assigned TO a user (for User panel)
- GET /api/getTaskAssign/:userId?isArchived=false → Get user tasks (legacy endpoint, filtered)
- PUT /api/addtaskassign/:taskId/archive → Archive task

USER MANAGEMENT:
- GET /api/getUserDetails → Get all users for task assignment

CHAT SYSTEM:
- POST /api/chat/messages → Send chat message
- GET /api/chat/messages/user/:userId → Get user chat messages
- GET /api/chat/messages?taskId=:taskId → Get task-specific messages

LEAVE MANAGEMENT:
- POST /api/leave/request → Submit leave request (user-side)
- GET /api/leave/getAll/:userId → Get user's leave history
- GET /api/leave/getAllLeaves → Get all users' leaves (HR-side)
- POST /api/leave/reject/:userId/:month/:leaveId → Approve/reject leave dates (HR-side)

================================================================================
📋 API RESPONSE FORMATS:
================================================================================

SIGN IN API RESPONSE:
{
    "success": true,
    "message": "Sign in successful",
    "data": {
        "_id": "68ee25d60a69d081b2f950db",
        "firstName": "sachin",
        "lastName": "padyar",
        "email": "sachinpadyar22@gmail.com",
        "number": "+918308063687",
        "role": "Execution",
        "position": "SME",
        "maritalStatus": "Single",
        "birthDate": "2025-10-02T18:30:00.000Z",
        "address": "dhule\ndhule",
        "pincode": "424307",
        "languages": ["English", "Marathi"],
        "skills": ["react", "nodejs", "mongo"],
        "userEmail": "sachin3687@blissSolution.com",
        "createdAt": "2025-10-14T10:28:38.998Z",
        "updatedAt": "2025-10-14T10:28:43.094Z"
    }
}

TASK API RESPONSE:
{
    "success": true,
    "data": [
        {
            "_id": "68f0edf361a89951ff9710c5",
            "userId": "sachin-bliss-3687",
            "receiverId": "sachin-bliss-3636",
            "assignerId": "execution-user-id",
            "taskName": "Create a diwali poster",
            "clientName": "Bliss solution",
            "category": "developer",
            "priority": "high",
            "timeSpend": "1hr",
            "description": "This is an important task",
            "chatCount": 0,
            "isArchived": false,
            "createdAt": "2025-10-16T13:06:59.595Z",
            "updatedAt": "2025-10-17T10:08:17.572Z"
        }
    ],
    "count": 1
}

CHAT API RESPONSE:
{
    "success": true,
    "data": [
        {
            "_id": "68f0f1234567890abcdef123",
            "taskId": "68f0edf361a89951ff9710c5",
            "senderId": "sachin-bliss-3687",
            "receiverId": "sachin-bliss-3636",
            "userName": "Sachin Padyar",
            "message": "Hello! 👋",
            "time": "10:30 AM, Oct 17, 2025",
            "createdAt": "2025-10-17T05:00:00.000Z"
        }
    ]
}

LEAVE REQUEST API REQUEST BODY:
{
    "userId": "user123456789",
    "month": "NOV",
    "reason": "Common reason for all dates",
    "leaves": [
        {
            "startDate": "2025-11-01",
            "endDate": "2025-11-05"
        },
        {
            "startDate": "2025-11-10",
            "endDate": "2025-11-12"
        }
    ]
}

LEAVE HISTORY API RESPONSE:
{
    "success": true,
    "data": {
        "_id": "6905acd9a8ea4c85955290b3",
        "userId": "sachin-bliss-3636",
        "months": [
            {
                "month": "NOV",
                "leaves": [
                    {
                        "startDate": "2025-11-07T00:00:00.000Z",
                        "endDate": "2025-11-07T00:00:00.000Z",
                        "status": "pending",
                        "approvedDates": [],
                        "rejectedDates": [],
                        "history": [
                            {
                                "status": "pending",
                                "at": "2025-11-01T06:46:49.356Z",
                                "by": "sachin-bliss-3636",
                                "_id": "6905acd9a8ea4c85955290b5"
                            }
                        ],
                        "_id": "6905acd9a8ea4c85955290b4"
                    }
                ],
                "reason": "This is the new leaves"
            }
        ]
    }
}

LEAVE APPROVAL API REQUEST BODY:
{
    "approverId": "HR_456",
    "instructions": "Approved 2 days, rejected 3 days",
    "approvedDates": ["2025-10-01", "2025-10-02"],
    "rejectedDates": ["2025-10-03", "2025-10-04", "2025-10-05"]
}

================================================================================
🎨 THEME VARIABLES:
================================================================================

LIGHT THEME:
- --primary-bg: #ffffff
- --secondary-bg: #f8f9fa
- --primary-text: #212529
- --secondary-text: #6c757d
- --brand-color: #EBB236
- --border-color: #dee2e6
- --card-bg: #ffffff
- --sidebar-bg: #ededed
- --hover-bg: rgba(235, 178, 54, 0.1)
- --input-bg: #ffffff

DARK THEME:
- --primary-bg: #0e0e0e
- --secondary-bg: #0e0e0e
- --primary-text: #ffffff
- --secondary-text: #cccccc
- --brand-color: #EBB236
- --border-color: #333333
- --card-bg: #1a1a1a
- --sidebar-bg: #161616
- --hover-bg: rgba(235, 178, 54, 0.1)
- --input-bg: #2a2a2a

================================================================================
🚀 NAVIGATION CONFIGURATION:
================================================================================

navigationConfig.js:
- AdminDashboard: roles: ["admin", "Executive"] → Route: /admin-dashboard
- ExecutionTaskAssignPanel: roles: ["Executive"] → Route: /task-assignment
- UserTaskAssignmentPanel: roles: ["user"] → Route: /my-tasks
- UserRolePanel: roles: ["Executive", "user"] → Route: /chat-test

================================================================================
📱 RESPONSIVE BREAKPOINTS:
================================================================================

- xs: < 576px (Mobile)
- sm: 576px - 768px (Tablet Portrait)
- md: 768px - 992px (Tablet Landscape)
- lg: 992px - 1200px (Desktop)
- xl: > 1200px (Large Desktop)

================================================================================
🔐 ROUTE PROTECTION:
================================================================================

Protected Routes:
- /Dashboard
- /admin-dashboard (Executive role only)
- /task-assignment (Execution role only)
- /my-tasks (User role only)
- /chat-test (All authenticated users)

Public Routes:
- / (Login)
- /CreateNewUser

================================================================================
🎯 USER EXPERIENCE FLOW:
================================================================================

EXECUTION ROLE USER:
1. User visits portal → Redirected to login if not authenticated
2. User logs in → API validates credentials → Redirected to Dashboard
3. Dashboard loads → Shows sidebar with Execution-specific navigation
4. User clicks "Task Assignment" → ExecutionTaskAssignPanel loads
5. User clicks "Add New Task" → Drawer opens with dynamic position selection
6. User selects position → Users from OTHER roles populate
7. User selects specific user → Task gets assigned to that user
8. User can filter/search tasks → Real-time filtering by name/client
9. User can archive tasks → Modal confirmation with task details
10. User can view task details → Drawer opens with integrated chat

REGULAR USER ROLE:
1. User logs in → Redirected to Dashboard
2. Dashboard loads → Shows sidebar with User-specific navigation
3. User clicks "My Tasks" → UserTaskAssignmentPanel loads
4. User sees assigned tasks → Can view task details
5. User can chat on tasks → Bidirectional chat with assigner
6. User can use emoji picker → 18px emojis in chat messages

================================================================================
🔌 SOCKET.IO INTEGRATION:
================================================================================

REAL-TIME FEATURES:
- Task creation notifications
- Chat message delivery
- Task archive updates
- User presence indicators

SOCKET EVENTS:
- join-task-room → Join task-specific chat room
- leave-task-room → Leave task chat room
- send-message → Send chat message
- new-message → Receive new chat message
- task-added → Receive new task notification
- leave-updated → Receive leave status update notification
- leave-requested → Receive new leave request notification

================================================================================
📝 DEVELOPMENT SERVER:
================================================================================

- Port: 2711
- Command: npm run dev
- URL: http://localhost:2711
- Socket.IO Server: http://localhost:3000

================================================================================
🔐 ENVIRONMENT VARIABLES:
================================================================================

Required for Cloudinary media uploads (.env.local):
- VITE_CLOUDINARY_CLOUD_NAME=dpjtupftc
- VITE_CLOUDINARY_UPLOAD_PRESET=bliss-solution
- VITE_CLOUDINARY_FOLDER=chat-media

Note: After adding environment variables, restart the Vite dev server.

================================================================================
✅ COMPLETED FEATURES:
================================================================================

AUTHENTICATION & USER MANAGEMENT:
✓ Authentication system with API integration
✓ User registration with dynamic role-based positions
✓ Role-based navigation and access control
✓ User profile display with role and position

TASK MANAGEMENT:
✓ Task creation with user assignment
✓ Dynamic position filtering (other roles only)
✓ Two-step user selection process
✓ Task archiving with confirmation modal
✓ Real-time task updates via Socket.IO
✓ Task filtering and search functionality
✓ Archive status filtering
✓ Latest tasks displayed first (sorted by createdAt descending)

CHAT SYSTEM:
✓ Real-time bidirectional chat
✓ Emoji picker with 18px emoji support
✓ Media uploads (images, videos, PDFs, Word docs) via Cloudinary
✓ Inline media previews (images, videos, PDF thumbnails)
✓ Fullscreen media preview on click
✓ Batch file selection with preview grid
✓ File size validation (images: 10MB, videos: 100MB, documents: 25MB)
✓ Upload progress indicators
✓ Media type detection and proper rendering
✓ PDF preview with first-page thumbnail
✓ Reusable TaskChat component
✓ Message persistence via API
✓ Task-specific chat rooms
✓ Auto-scroll to latest messages
✓ Emoji message formatting

UI/UX FEATURES:
✓ Theme system (light/dark mode)
✓ Dynamic sidebar with hover effects
✓ Professional header with user info, role, position, and date
✓ Responsive design for all screen sizes
✓ Smooth animations and transitions
✓ Professional modal confirmations
✓ Filter section with slide-down animation

TECHNICAL FEATURES:
✓ Redux state management
✓ RTK Query API integration
✓ Socket.IO real-time communication
✓ Route protection
✓ Theme-aware styling throughout
✓ Real-time date display (IST)
✓ Notification system
✓ Profile dropdowns
✓ CSS variable theming
✓ Responsive breakpoints
✓ Mobile-optimized layouts
✓ Cloudinary integration for media uploads
✓ dayjs for date manipulation

CALENDAR & LEAVE MANAGEMENT:
✓ Reusable CalenderModule component
✓ User-side leave request system
✓ Multi-date selection (individual dates, not just ranges)
✓ Leave request submission with mandatory reason
✓ Leave history display with status color coding
✓ HR-side leave approval workflow
✓ Date-specific approval/rejection with instructions
✓ Real-time leave status updates via Socket.IO
✓ Local storage persistence for draft leave requests
✓ Task calendar integration for HR users
✓ Latest tasks sorted by createdAt (descending)

================================================================================
🚀 RECENT ADDITIONS (Latest Updates):
================================================================================

FILTER & SEARCH SYSTEM:
✓ Real-time search by task name and client name
✓ Date range picker (ready for backend integration)
✓ Filter toggle button with active state
✓ Clear filters functionality
✓ Responsive filter layout
✓ Smooth slide-down animation

ARCHIVE FUNCTIONALITY:
✓ Archive button with delete icon
✓ Professional confirmation modal
✓ Task details display in modal
✓ PUT API method for archiving
✓ Frontend filtering for archived tasks
✓ Success notifications

EMOJI CHAT SYSTEM:
✓ Emoji picker integration
✓ 18px emoji sizing
✓ Multiple emoji selection
✓ Emoji picker stays open after selection
✓ Manual close button
✓ Click-outside-to-close functionality
✓ HTML rendering with emoji spans

REUSABLE CHAT COMPONENT:
✓ TaskChat component extraction
✓ Props-based configuration
✓ Separate CSS file for chat styling
✓ Used across AllTaskEntries and AllUserTaskEntries
✓ Consistent chat theming

MEDIA UPLOAD SYSTEM:
✓ Cloudinary integration for frontend-only media uploads
✓ Image upload support (max 10MB)
✓ Video upload support (max 100MB)
✓ Document upload support (PDF, Word, Excel, PPT - max 25MB)
✓ Multi-file selection with batch preview
✓ Dynamic grid layout for previews (1 item full-width, 2 items half-half, 3+ items in 3 columns)
✓ Upload progress indicators per file
✓ Fullscreen preview modal for media
✓ Click media to open in new tab
✓ Proper media type detection (image/video/file)
✓ PDF preview with first-page thumbnail
✓ Inline PDF rendering with fallback to link

CALENDAR & LEAVE MANAGEMENT:
✓ Reusable CalenderModule component for dynamic calendar needs
✓ TaskAndLeaveCalender for user-side task and leave management
✓ Multi-date selection (individual dates, not ranges)
✓ Leave request submission with mandatory reason
✓ Leave history display with status indicators
✓ FestiveCalender for HR-side task and leave management
✓ HR leave approval workflow with date-specific actions
✓ Real-time leave updates via Socket.IO
✓ Local storage persistence for draft leave requests
✓ Latest tasks sorted by createdAt (descending) in both panels

================================================================================
📊 COMPONENT RELATIONSHIPS:
================================================================================

ExecutionTaskAssignPanel
├── AllTaskEntries (with filters and archive)
│   └── TaskChat (reusable chat component)
└── Add New Task Drawer (with dynamic user selection)

UserTaskAssignmentPanel
└── AllUserTaskEntries (with chat integration)
    └── TaskChat (same reusable component)

TaskChat Component
├── Emoji picker integration
├── Socket.IO real-time messaging
├── Media upload (Cloudinary)
├── Message persistence API
├── Auto-scroll functionality
└── Media previews (image, video, PDF)

CalenderModule Component
├── Dynamic calendar rendering
├── Date selection handlers
├── Custom cell rendering
└── Reusable across multiple components

TaskAndLeaveCalender
├── CalenderModule (reusable calendar)
├── Leave request submission
├── Leave history display
└── Local storage persistence

FestiveCalender
├── CalenderModule (reusable calendar)
├── Task management
├── HR leave approval workflow
└── Real-time updates

================================================================================
🎯 NEXT STEPS (Potential Enhancements):
================================================================================

BACKEND INTEGRATION:
- Date range filtering API implementation
- Advanced search filters (priority, category)
- Task status management (in-progress, completed)
- File attachment handling
- Task assignment notifications

FRONTEND ENHANCEMENTS:
- Drag-and-drop task management
- Task templates
- Bulk task operations
- Advanced reporting dashboard
- Task time tracking
- Calendar view integration

================================================================================
