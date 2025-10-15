import { Routes, Route } from 'react-router-dom'
import UserVerificationForm from '../components/UserVerificationForm/UserVerificationForm'
import LoginPortal from '../components/LoginPortal/LoginPortal'
import Dashboard from '../components/Dashboard/Dashboard'
import { ProtectedRoute, RedirectIfAuthenticated } from '../components/ProtectedRoute'

// Import AdminDashboard component
import AdminDashboard from '../components/RoutesComponents/AdminDashboard/AdminDashboard'
export default function PortalRoutes() {

    return (
        <div>
            <Routes>
                <Route path="/" element={
                    <RedirectIfAuthenticated>
                        <LoginPortal />
                    </RedirectIfAuthenticated>
                } />

                {/* Dashboard Route - Main Portal */}
                <Route path="/Dashboard" element={
                    <ProtectedRoute>
                        <Dashboard />
                    </ProtectedRoute>
                } />

                {/* Admin Dashboard Route */}
                <Route path="/admin-dashboard" element={
                    <ProtectedRoute>
                        <Dashboard />
                    </ProtectedRoute>
                } />

                {/* Create New User Route */}
                <Route path="/CreateNewUser" element={<UserVerificationForm />} />
            </Routes>
        </div>
    )
}