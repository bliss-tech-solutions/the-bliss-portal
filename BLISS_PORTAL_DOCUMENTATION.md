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
│   │   │   ├── ExecutionTaskAssignPanel.jsx (Task assignment panel with filters, all file types upload)
│   │   │   ├── ExecutionTaskAssignPanel.css (Panel styling)
│   │   │   └── AllTaskEntries/
│   │   │       ├── AllTaskEntries.jsx (Task list with archive, extension requests, scheduled slots)
│   │   │       └── AllTaskEntries.css (Task entries styling with compact grid layout)
│   │   ├── UserTaskAssignmentPanel/
│   │   │   ├── UserTaskAssignmentPanel.jsx (User task panel with tabs: All, Upcoming, In Progress, Completed)
│   │   │   ├── UserTaskAssignmentPanel.css (User panel styling)
│   │   │   └── AllUserTaskEntries/
│   │   │       ├── AllUserTaskEntries.jsx (User task list with chat, attachment links, real-time updates)
│   │   │       └── AllUserTaskEntries.css (User task entries styling)
│   │   ├── ContentProviderPanel/
│   │   │   ├── ContentProviderPanel.jsx (Content provider dashboard with client management, document upload/history)
│   │   │   ├── ContentProviderPanel.css (Panel styling)
│   │   │   └── TaskEntries/
│   │   │       ├── ContentProviderTaskEntriesPage.jsx (Task entries page with tabs and filters)
│   │   │       └── ContentProviderTaskEntries.jsx (Task entries wrapper component)
│   │   ├── HRWorkComponent/
│   │   │   ├── UserDocumentVerification/
│   │   │   │   ├── UserDocumentVerification.jsx (Document verification form with Cloudinary uploads, grid view)
│   │   │   │   └── UserDocumentVerification.css (Document verification styling)
│   │   │   ├── UserAttendanceData/
│   │   │   │   ├── UserAttendanceData.jsx (Attendance table with User ID copy button)
│   │   │   │   └── UserAttendanceData.css (Attendance data styling)
│   │   │   ├── DocumentGenerator/
│   │   │   │   └── OffterLetterGenerator/
│   │   │   │       └── OffterLetterGenerator.jsx (Offer letter generation)
│   │   │   └── FestiveCalender/
│   │   │       └── FestiveCalender.jsx (HR-side festive calendar)
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
│   │   ├── LoginPortal.jsx (Login form with API integration, lottie animation)
│   │   └── LoginPortal.css (Login styling)
│   ├── CreateAccountLogin/
│   │   ├── CreateAccountLogin.jsx (Account creation login with quiz, drag-and-drop letters)
│   │   └── CreateAccountLogin.css (Create account login styling)
│   ├── UserVerificationForm/
│   │   ├── UserVerificationForm.jsx (User registration form with dynamic positions)
│   │   └── UserVerificationForm.css (Registration styling)
│   ├── CommonComponents/
│   │   ├── PageLoader/
│   │   │   ├── PageLoader.jsx (Global animated logo loader)
│   │   │   └── PageLoader.css (Loader styling with animations)
│   │   ├── EmptyState/
│   │   │   ├── EmptyState.jsx (Reusable empty state component)
│   │   │   └── EmptyState.css (Empty state styling)
│   │   ├── InlineLoader/
│   │   │   ├── InlineLoader.jsx (Inline loading component)
│   │   │   └── InlineLoader.css (Inline loader styling)
│   │   └── TaskEntries/
│   │       ├── TaskEntries.jsx (Reusable task entries component with drawer, chat integration)
│   │       └── TaskEntries.css (Task entries styling)
│   │   └── TaskEntries/
│   │       ├── TaskEntries.jsx (Reusable task entries component with drawer, chat integration)
│   │       └── TaskEntries.css (Task entries styling)
│   └── ProtectedRoute.jsx (Route protection logic with create account auth)
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
│   ├── NotificationContext.jsx (Notification system context with MUI Snackbar)
│   ├── LoadingContext.jsx (Global loading state and message context)
│   └── TaskChatContext.jsx (Task chat context provider)
├── utils/
│   ├── socket.js (Socket.IO utilities)
│   ├── cloudinary.js (Cloudinary upload utilities for media files)
│   └── authUtils.js (Authentication utilities with create account auth)
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
   - LoginPortal.jsx → Sets global loading state → Shows animated logo loader → Redirects to /Dashboard
   - Dashboard.jsx → Monitors API loading states → Hides loader when all APIs are idle

4. CREATE ACCOUNT LOGIN FLOW:
   - CreateAccountLogin.jsx → Professional login page with drag-and-drop quiz
   - Quiz: Letters "BMMPK" randomly arranged → User must arrange correctly (Business Management Media Portal Kit)
   - User enters email/password → Validates quiz sequence → Calls POST /api/createaccountsignin/signin
   - On success → Sets create account auth state in sessionStorage → Redirects to /CreateNewUser
   - ProtectedCreateAccountRoute → Protects /CreateNewUser from direct access

5. USER REGISTRATION FLOW:
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
   - User selection → Stores receiverUserId for task assignment
   - Task References → Upload any file type (images, documents, etc.) via Cloudinary
   - Task creation → API call with userId (creator) and receiverUserId
   - Real-time updates → Socket.IO integration for instant task updates

10. TASK VIEWING FLOW (EXECUTION ROLE):
    - AllTaskEntries.jsx → Shows tasks with filtering and search (2-column grid layout)
    - Filter system → Search by task name/client name, date range picker
    - Archive functionality → Modal confirmation with task details
    - View task drawer → Shows full task details with integrated chat
    - Scheduled Slots → Compact grid display with timing, booking date, extension history
    - Extension Requests → Real-time pending requests with Approve/Reject buttons
    - Extension approval → Modal with reason → Updates status via POST /api/taskextension/respond
    - Real-time extension updates → Socket.IO events update status instantly

11. USER TASK VIEWING FLOW:
    - UserTaskAssignmentPanel.jsx → Tabs: All, Upcoming, In Progress, Completed
    - TaskEntries.jsx (Common component) → Displays tasks based on active tab prop with drawer and chat
    - Real-time task updates → Socket.IO listener refetches tasks when new task assigned
    - Task attachment links → Truncated to 60 characters, clickable with View/Download buttons
    - View button → Opens link in new tab
    - Download button → Fetches file as blob and triggers download
    - Completed tasks → Filtered and displayed in "Completed" tab
    - View Details → Opens drawer with full task details and integrated chat
    - Chat integration → TaskChat component integrated in drawer for real-time communication

17. CONTENT PROVIDER PANEL FLOW:
    - ContentProviderPanel.jsx → Content provider dashboard for client management
    - Client table → Displays clients with: Client Name, Team Members, Status, Onboard Date, Document History, Upload Doc
    - Team Members column → Shows assigned team members as compact avatars (first 3 visible, "+X more" for additional)
    - Upload Doc column → Button to upload documents for clients
    - Document upload modal → Form with: Link, Message, Month selection (checkboxes for all 12 months)
    - Document History column → Button to view uploaded document history
    - Document History modal → Month-wise grouped display with Collapse panels
    - Each month panel → Table showing: Date, Link, Notes, Uploaded By
    - Real-time updates → Socket.IO integration for client and document updates (no polling)
    - Socket events → Listens for client:created, client:updated, client:deleted, client:attachment:added
    - API optimization → Removed 30-second polling, uses socket events only

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

14. USER DOCUMENT VERIFICATION FLOW:
    - UserDocumentVerification.jsx → Two tabs: "Add Document" and "All Documents Data"
    - Add Document Tab → Professional form with Cloudinary uploads
    - Document uploads → Aadhar Card, Passport Photo, Offer Letter via Cloudinary
    - Loading states → Shows "Uploading..." instead of validation errors during upload
    - Form submission → POST /api/userverificationdocuments/create with all data and document URLs
    - All Documents Data Tab → Grid cards displaying all user documents
    - Document grid → GET /api/userverificationdocuments/getAll → Professional card layout
    - View buttons → Opens document URLs in new tabs

15. USER ATTENDANCE DATA FLOW:
    - UserAttendanceData.jsx → Table displaying user attendance records
    - User ID column → First column with copy button only (no text display)
    - Copy functionality → Copies User ID to clipboard → Shows success notification
    - Notification confirmation → MUI Snackbar confirms successful copy

16. CONTENT PROVIDER PANEL FLOW:
    - ContentProviderPanel.jsx → Content provider dashboard for client management
    - Client table → Displays clients with: Client Name, Team Members, Status, Onboard Date, Document History, Upload Doc
    - Team Members column → Shows assigned team members as compact avatars (first 3 visible, "+X more" for additional)
    - Upload Document column → Button to upload documents for clients
    - Document upload modal → Form with: Link, Message, Month selection (checkboxes for all 12 months)
    - Document History column → Button to view uploaded document history
    - Document History modal → Month-wise grouped display with Collapse panels
    - Each month panel → Table showing: Date, Link, Notes, Uploaded By
    - Real-time updates → Socket.IO integration for client and document updates (no polling)
    - Socket events → Listens for client:created, client:updated, client:deleted, client:attachment:added
    - API optimization → Removed 30-second polling, uses socket events only
    - Task management → ContentProviderTaskEntriesPage with tabs (All, Upcoming, In Progress, Completed) and filters
    - Task viewing → Uses reusable TaskEntries component with drawer and integrated chat

17. MOBILE NAVIGATION FLOW:
    - PortalHeader.jsx → Detects mobile screen size (< 768px)
    - Mobile header bar → Shows left navigation button with short greeting/date
    - Navigation drawer → Ant Design Drawer slides from left on button click
    - Drawer content → All header functionality (logo, greeting, date, checkout, theme, notifications, profile, navigation)
    - Desktop view → Full header functionality as before

19. GLOBAL LOADING SYSTEM:
    - LoadingContext.jsx → Provides global loading state and message
    - PageLoader.jsx → Animated logo loader with pulse animation
    - Login to Dashboard → Shows loader during API calls → Hides when all APIs are idle
    - Minimum display time → 1.2 seconds to prevent merging with dashboard content
    - API monitoring → Uses RTK Query's useIsFetching and useIsLoading hooks

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
- Mobile navigation drawer → Consolidated header functionality
- Tablet and mobile breakpoints → Optimized layouts for all screen sizes
- 2-column grid layout for tasks on desktop → Responsive grid adjustments

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
- Material UI (MUI) → Snackbar notifications
- DotLottie React → Lottie animations
- HTML5 Drag and Drop API → Interactive quiz elements

================================================================================
📋 API ENDPOINTS:
================================================================================

AUTHENTICATION:
- POST /api/signin → User login
- POST /api/createaccountsignin/signin → Create account login (CodeNo, Email, Password)
- POST /api/addUserDetails → User registration
- GET /api/getUserDetails → Get user data

TASK MANAGEMENT:
- POST /api/addtaskassign → Create new task (with taskReferences - all file types)
- GET /api/getTaskAssign/:userId?isArchived=false → Get user tasks (filtered)
- PUT /api/addtaskassign/:taskId/archive → Archive task
- POST /api/taskextension/request → Request task extension
- POST /api/taskextension/respond → Respond to extension request (approve/reject)

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

DOCUMENT VERIFICATION:
- POST /api/userverificationdocuments/create → Create user document verification
- GET /api/userverificationdocuments/getAll → Get all user documents

ATTENDANCE:
- GET /api/userattendance/getAll → Get user attendance data

CLIENT MANAGEMENT:
- POST /api/clientmanagement/create → Create new client
- GET /api/clientmanagement/getAllClientsData → Get all clients
- GET /api/clientmanagement/getClientsByUserId/:userId → Get clients by user ID (for Content Provider)
- PUT /api/clientmanagement/update/:clientId → Update client
- POST /api/clientmanagement/:clientId/attachments → Add client attachment/document
- GET /api/clientmanagement/:clientId/attachments/byUserId/:userId → Get client attachments by user ID

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
            "receiverUserId": "sachin-bliss-3636",
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

CLIENT ATTACHMENT API REQUEST BODY:
{
    "link": "https://docs.google.com/document/d/example123",
    "notes": "Content writing work for January month",
    "month": "Jan",
    "uploadedBy": {
        "userId": "user123",
        "name": "Content Writer Name"
    }
}

CLIENT ATTACHMENT API RESPONSE (byUserId):
{
    "success": true,
    "message": "Attachments retrieved successfully",
    "data": {
        "clientId": "6938046bc7eaecd566f546f0",
        "userId": "test-bliss-3645",
        "userName": null,
        "attachments": [
            {
                "uploadedBy": {
                    "userId": "content-bliss-5535",
                    "name": "Content Provider"
                },
                "link": "https://docs.google.com/document/d/1WIeJ4CZdZcr4LlG6pFCYzHGD_opj_2LLkdV6gLXkC20/edit",
                "notes": "This is the bliss client document",
                "month": "Dec",
                "_id": "6939755d928833db8d06e966",
                "createdAt": "2025-12-10T13:27:57.202Z",
                "updatedAt": "2025-12-10T13:27:57.202Z"
            }
        ],
        "count": 1
    }
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
- ContentProviderPanel: roles: ["ContentProvider"] → Route: /content-provider-panel
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
- /content-provider-panel (ContentProvider role only)
- /chat-test (All authenticated users)
- /CreateNewUser (Protected by create account authentication - requires sign-in via /create-account-login)

Public Routes:
- / (Login)
- /create-account-login (Create account login with quiz)

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
3. User clicks "My Tasks" → UserTaskAssignmentPanel loads with tabs (All, Upcoming, In Progress, Completed)
4. User sees assigned tasks → Can view task details (real-time updates when new task assigned)
5. User can chat on tasks → Bidirectional chat with assigner
6. User can use emoji picker → 18px emojis in chat messages
7. User can request task extension → Submits extension request with reason
8. User can view task attachments → Truncated links with View/Download buttons
9. Completed tasks → Displayed in "Completed" tab

CREATE ACCOUNT FLOW:
1. User visits main login → Clicks "Don't have an account? Create new account"
2. Redirects to /create-account-login → Professional login page with quiz
3. User arranges letters "BMMPK" in correct order (drag-and-drop)
4. User enters email and password → Submits credentials
5. API validates → Sets create account auth → Redirects to /CreateNewUser
6. User completes registration form → Creates account → Redirects to login

HR WORK FLOW:
1. HR logs in → Accesses HR Work Component
2. User Document Verification → Can add/view user documents
3. User Attendance Data → Views attendance records, copies User IDs
4. Document Generator → Generates offer letters
5. Festive Calendar → Manages leaves and tasks

CONTENT PROVIDER FLOW:
1. Content Provider logs in → Accesses ContentProviderPanel
2. Views client table → Sees all assigned clients with team members
3. Team Members column → Hover to see full names, click avatars for details
4. Upload Document → Clicks "Upload Doc" button → Modal opens
5. Fills form → Enters link, message, selects month(s) → Submits
6. Document uploaded → Success notification → Socket event triggers real-time update
7. Document History → Clicks "History" button → Modal opens
8. Views documents → Month-wise grouped display with Collapse panels
9. Expands months → Sees all documents in table format (Date, Link, Notes, Uploaded By)
10. Real-time updates → New documents appear automatically via socket events
11. Task management → Accesses TaskEntriesPage with tabs and filters
12. View task details → Opens drawer with full task info and integrated chat

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
- task-added → Receive new task notification (real-time task assignment)
- task:new → Backend socket event for task creation
- task:created → Backend socket event for task creation
- task:assigned → Backend socket event for task assignment
- task:updated → Backend socket event for task updates
- task:statusUpdated → Backend socket event for task status changes
- task-extension-requested → Receive task extension request notification
- task-extension-updated → Receive task extension status update (approved/rejected)
- leave-updated → Receive leave status update notification
- leave-requested → Receive new leave request notification
- client:created → Receive client creation notification
- client:updated → Receive client update notification
- client:deleted → Receive client deletion notification
- client:attachment:added → Receive client attachment creation notification
- client:attachment:updated → Receive client attachment update notification
- client:attachment:deleted → Receive client attachment deletion notification
- client:change → Generic client update event

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

CONTENT PROVIDER PANEL & CLIENT MANAGEMENT:
✓ ContentProviderPanel component for content provider role
✓ Client management table with multiple columns
✓ Team Members column → Shows assigned users as avatars with tooltips
✓ Upload Document column → Modal to upload client documents
✓ Document upload form → Link, Message, Month selection (all 12 months)
✓ Document History column → View month-wise document history
✓ Document History modal → Collapse panels grouped by month
✓ Month-wise document tables → Date, Link, Notes, Uploaded By columns
✓ Real-time updates → Socket.IO integration for clients and documents
✓ API optimization → Removed polling, uses socket events only
✓ Socket listeners for client and attachment events
✓ Client attachment API integration
✓ Document history API with user filtering
✓ Responsive modal designs
✓ Theme-aware styling

TASK ENTRIES IMPROVEMENTS:
✓ Fixed chat module scope error (isCompleted variable)
✓ Reusable TaskEntries component for all roles
✓ ContentProviderTaskEntries wrapper component
✓ TaskEntriesPage with tabs and filters
✓ Integrated chat in task drawer
✓ Real-time task updates
✓ Extension request and management

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

TASK EXTENSION SYSTEM:
✓ Extension request functionality for users
✓ Scheduled slots display with timing and booking dates
✓ Extension history tracking
✓ Real-time extension status updates via Socket.IO
✓ Approve/Reject buttons for assigners
✓ Extension request modal with reason
✓ Indian 12-hour time format (h:mm A)
✓ Compact grid layout for scheduled slots and extension requests

USER DOCUMENT VERIFICATION:
✓ Professional document verification form
✓ Cloudinary integration for document uploads (Aadhar, Passport, Offer Letter)
✓ Two-tab interface (Add Document, All Documents Data)
✓ Loading states during document upload
✓ Grid card display for all documents
✓ Document view functionality

USER ATTENDANCE DATA:
✓ Attendance data table
✓ User ID copy functionality with confirmation notification
✓ First column User ID with copy button only

CONTENT PROVIDER PANEL:
✓ Client management dashboard for content providers
✓ Client table with comprehensive columns
✓ Team Members display → Compact avatar display showing assigned users
✓ Upload Document functionality → Modal with link, message, and month selection
✓ Document History → Month-wise grouped document history with tables
✓ Real-time client updates → Socket.IO integration (no polling)
✓ Socket-based real-time document updates
✓ API optimization → Removed 30-second polling, uses socket events only
✓ Document upload API integration
✓ Document history API integration with user filtering
✓ Month-wise document grouping and display
✓ Responsive design for all screen sizes

TASK ENTRIES COMPONENT:
✓ Reusable TaskEntries component for all user roles
✓ Task drawer with full details view
✓ Integrated TaskChat component in drawer
✓ Real-time task updates via Socket.IO
✓ Extension request functionality
✓ Scheduled slots display
✓ Task status management

MOBILE RESPONSIVENESS:
✓ Mobile navigation drawer for header
✓ Consolidated header functionality in drawer
✓ Short greeting and date on mobile header bar
✓ Theme toggle and all features accessible in drawer

GLOBAL LOADING SYSTEM:
✓ LoadingContext for global loading state
✓ PageLoader component with animated logo
✓ API-aware loading (shows only when APIs are active)
✓ Minimum display time to prevent UI merging
✓ Smooth fade-in/fade-out animations

CREATE ACCOUNT LOGIN:
✓ Professional login page with quiz
✓ Drag-and-drop letter arrangement quiz (BMMPK)
✓ Protected route for /CreateNewUser
✓ Session-based authentication for account creation
✓ Real-time quiz validation

TASK ATTACHMENT SYSTEM:
✓ All file types upload support (images, documents, etc.)
✓ Attachment link truncation (60 characters)
✓ View and Download buttons for attachments
✓ Clickable truncated links
✓ File download as blob

SEO OPTIMIZATION:
✓ Comprehensive meta tags in index.html
✓ Open Graph tags for social media sharing
✓ Twitter Card tags
✓ JSON-LD structured data
✓ Company information integration

CONTENT PROVIDER PANEL & CLIENT MANAGEMENT:
✓ ContentProviderPanel component for content provider role
✓ Client management table with multiple columns
✓ Team Members column → Shows assigned users as avatars with tooltips
✓ Upload Document column → Modal to upload client documents
✓ Document upload form → Link, Message, Month selection (all 12 months)
✓ Document History column → View month-wise document history
✓ Document History modal → Collapse panels grouped by month
✓ Month-wise document tables → Date, Link, Notes, Uploaded By columns
✓ Real-time updates → Socket.IO integration for clients and documents
✓ API optimization → Removed polling, uses socket events only
✓ Socket listeners for client and attachment events
✓ Client attachment API integration
✓ Document history API with user filtering
✓ Responsive modal designs
✓ Theme-aware styling

TASK ENTRIES IMPROVEMENTS:
✓ Fixed chat module scope error (isCompleted variable)
✓ Reusable TaskEntries component for all roles
✓ ContentProviderTaskEntries wrapper component
✓ TaskEntriesPage with tabs and filters
✓ Integrated chat in task drawer
✓ Real-time task updates
✓ Extension request and management

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

TaskEntries Component (Common)
├── Task list display with filtering
├── Task drawer with full details
├── TaskChat integration
├── Extension request functionality
├── Scheduled slots display
├── Real-time updates via Socket.IO
└── Used by UserTaskAssignmentPanel and ContentProviderPanel

ContentProviderPanel
├── Client management table
├── Team Members display (avatars)
├── Upload Document modal
├── Document History modal (month-wise)
├── Real-time socket updates
└── TaskEntries integration

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
