// Navigation Configuration with Role-Based Access Control
import { DashboardOutlined, UserOutlined, MessageOutlined } from '@ant-design/icons';
import { BiTask } from "react-icons/bi";
import { SlCalender } from "react-icons/sl";
import { FileTextOutlined } from '@ant-design/icons';
import { FaCalendarAlt } from "react-icons/fa";
import { CalendarOutlined } from '@ant-design/icons';
import { SiGoogleanalytics } from "react-icons/si";
import { SiDatabricks } from "react-icons/si";
import { TfiLayoutAccordionSeparated } from "react-icons/tfi";
import { AiFillDatabase } from "react-icons/ai";

// Import components
import AdminDashboard from '../RoutesComponents/AdminDashboard/AdminDashboard';
import ProfileUpdate from '../PortalCommonComponents/ProfileUpdate/ProfileUpdate';
import ExecutionTaskAssignPanel from '../RoutesComponents/ExecutionTaskAssignPanel/ExecutionTaskAssignPanel';
import UserTaskAssignmentPanel from '../RoutesComponents/UserTaskAssignmentPanel/TaskManagePanelUser/UserTaskAssignmentPanel';
import UserAttendanceData from '../RoutesComponents/HRWorkComponent/UserAttendanceData/UserAttendanceData';
import FestiveCalender from '../RoutesComponents/HRWorkComponent/FestiveCalender/FestiveCalender';
import DocumentGenerator from '../RoutesComponents/HRWorkComponent/DocumentGenerator/DocumentGenerator';
import TaskAndLeaveCalender from '../RoutesComponents/UserTaskAssignmentPanel/TaskAndLeaveCalender/TaskAndLeaveCalender';
import GlobalChatPage from '../RoutesComponents/GlobalChatPage/GlobalChatPage';

// Navigation Configuration
import UserDocumentVerification from '../RoutesComponents/HRWorkComponent/UserDocumentVerification/UserDocumentVerification';
import ContentProviderPanel from '../RoutesComponents/ContentProviderPanel/ContentProviderPanel';
import ContentProviderTaskEntriesPage from '../RoutesComponents/ContentProviderPanel/TaskEntries/ContentProviderTaskEntriesPage';
import ClientsSegregation from '../RoutesComponents/AdminDashboard/ClientsSegregation/ClientsSegregation';
import ClientAssignManament from '../RoutesComponents/AdminDashboard/ClientAssignManament/ClientAssignManament';
import ClientAndData from '../RoutesComponents/UserTaskAssignmentPanel/clientAndData/ClientAndData';
import SalaryInformation from "../RoutesComponents/UserTaskAssignmentPanel/SalaryInfo/SalaryInfo"
import SalaryManagement from "../RoutesComponents/HRWorkComponent/SalaryManagement/SalaryManagement"
export const navigationConfig = [
    // Admin Only Route
    {
        componentLabelName: "Analytics",
        icon: SiGoogleanalytics,
        routeName: "/admin-dashboard",
        roles: ["admin"],
        component: AdminDashboard,
        showInSidebar: true
    },
    // Profile Settings - Available to all roles (hidden from sidebar, accessed via profile dropdown)
    {
        componentLabelName: "Profile Settings",
        icon: UserOutlined,
        routeName: "/profile-settings",
        roles: ["Execution", "admin", "moderator", "user"],
        component: ProfileUpdate,
        showInSidebar: false
    },
    {
        componentLabelName: "Task Assign Panel",
        icon: BiTask,
        routeName: "/execution-task-assign-panel",
        roles: ["Execution"],
        component: ExecutionTaskAssignPanel,
        showInSidebar: true
    },
    {
        componentLabelName: "My Tasks Management",
        icon: BiTask,
        routeName: "/user-task-assignment-panel",
        roles: ["user"],
        component: UserTaskAssignmentPanel,
        showInSidebar: true
    },
    {
        componentLabelName: "User Attendance Data",
        icon: SlCalender,
        routeName: "/user-attendance-data",
        roles: ["HR"],
        component: UserAttendanceData,
        showInSidebar: true
    },
    {
        componentLabelName: "Festive Calender",
        icon: FaCalendarAlt,
        routeName: "/festive-calender",
        roles: ["HR"],
        component: FestiveCalender,
        showInSidebar: true
    },
    {
        componentLabelName: "Document Generator",
        icon: FileTextOutlined,
        routeName: "/document-generator",
        roles: ["HR"],
        component: DocumentGenerator,
        showInSidebar: true
    },
    {
        componentLabelName: "Clients & Data",
        icon: AiFillDatabase,
        routeName: "/clients-and-data",
        roles: ["user", "Execution"],
        component: ClientAndData,
        showInSidebar: true
    },
    {
        componentLabelName: "Task and Leave Calender",
        icon: CalendarOutlined,
        routeName: "/task-and-leave-calender",
        roles: ["user", "Execution"],
        component: TaskAndLeaveCalender,
        showInSidebar: true
    },
    {
        componentLabelName: "User Verification Details",
        icon: UserOutlined,
        routeName: "/user-verification-details",
        roles: ["HR"],
        component: UserDocumentVerification,
        showInSidebar: true
    },
    {
        componentLabelName: "Content Provider Panel",
        icon: UserOutlined,
        routeName: "/content-provider-panel",
        roles: ["ContentProvider"],
        component: ContentProviderPanel,
        showInSidebar: true
    },
    {
        componentLabelName: "My Tasks",
        icon: BiTask,
        routeName: "/content-provider-tasks",
        roles: ["ContentProvider"],
        component: ContentProviderTaskEntriesPage,
        showInSidebar: true
    },
    {
        componentLabelName: "Clients Segregation",
        icon: TfiLayoutAccordionSeparated,
        routeName: "/clients-segregation",
        roles: ["Execution"],
        component: ClientsSegregation,
        showInSidebar: true
    },
    {
        componentLabelName: "Team Management",
        icon: SiDatabricks,
        routeName: "/client-assign-manament",
        roles: ["Execution"],
        component: ClientAssignManament,
        showInSidebar: true
    },

    // {
    //     componentLabelName: "Salary Information",
    //     icon: FileTextOutlined,
    //     routeName: "/salary-information",
    //     roles: ["user"],
    //     component: SalaryInformation,
    //     showInSidebar: true
    // },
    {
        componentLabelName: "Salary Management",
        icon: FileTextOutlined,
        routeName: "/salary-management",
        roles: ["admin", "HR"],
        component: SalaryManagement,
        showInSidebar: true
    },
    {
        componentLabelName: "Global Chat",
        icon: MessageOutlined,
        routeName: "/global-chat",
        roles: ["Execution", "user", "admin", "HR", "ContentProvider"],
        component: GlobalChatPage,
        showInSidebar: true
    }

];

// Helper function to filter navigation items based on user role (for sidebar)
export const getNavigationForRole = (userRole) => {
    return navigationConfig.filter(item =>
        item.roles.includes(userRole) && item.showInSidebar === true
    );
};

// Helper function to get all routes for role (including hidden routes)
export const getAllRoutesForRole = (userRole) => {
    return navigationConfig
        .filter(item => item.roles.includes(userRole))
        .map(item => ({
            path: item.routeName,
            element: item.component
        }));
};

// Helper function to check if user has access to specific route
export const hasAccessToRoute = (routeName, userRole) => {
    const route = navigationConfig.find(item => item.routeName === routeName);
    return route ? route.roles.includes(userRole) : false;
};

// Helper function to get component by route name
export const getComponentByRoute = (routeName) => {
    const route = navigationConfig.find(item => item.routeName === routeName);
    return route ? route.component : null;
};