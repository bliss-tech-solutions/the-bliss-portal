import { Routes, Route } from 'react-router-dom'
import UserVerificationForm from '../components/UserVerificationForm/UserVerificationForm'
import LoginPortal from '../components/LoginPortal/LoginPortal'
import Dashboard from '../components/Dashboard/Dashboard'
import { ProtectedRoute, RedirectIfAuthenticated } from '../components/ProtectedRoute'

export default function PortalRoutes() {
    return (
        <div>
            <Routes>
                {/* Login Route */}
                <Route path="/" element={
                    <RedirectIfAuthenticated>
                        <LoginPortal />
                    </RedirectIfAuthenticated>
                } />

                {/* Create New User Route */}
                <Route path="/CreateNewUser" element={<UserVerificationForm />} />

                {/* All Dashboard Routes - Single Dynamic Handler */}
                {/* All authenticated routes are handled by Dashboard component */}
                <Route path="/Dashboard" element={
                    <ProtectedRoute>
                        <Dashboard />
                    </ProtectedRoute>
                } />

                {/* Dynamic Routes - All handled by Dashboard component using Navigation config */}
                <Route path="/*" element={
                    <ProtectedRoute>
                        <Dashboard />
                    </ProtectedRoute>
                } />
            </Routes>
        </div>
    )
}