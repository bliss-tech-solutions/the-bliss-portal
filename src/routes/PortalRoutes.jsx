import { Routes, Route } from 'react-router-dom'
import UserVerificationForm from '../components/UserVerificationForm/UserVerificationForm'
import LoginPortal from '../components/LoginPortal/LoginPortal'
import CreateAccountLogin from '../components/CreateAccountLogin/CreateAccountLogin'
import Dashboard from '../components/Dashboard/Dashboard'
import { ProtectedRoute, RedirectIfAuthenticated, ProtectedCreateAccountRoute } from '../components/ProtectedRoute'

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

                {/* Create Account Login Route */}
                <Route path="/create-account-login" element={
                    <RedirectIfAuthenticated>
                        <CreateAccountLogin />
                    </RedirectIfAuthenticated>
                } />

                {/* Create New User Route - Protected */}
                <Route path="/CreateNewUser" element={
                    <ProtectedCreateAccountRoute>
                        <UserVerificationForm />
                    </ProtectedCreateAccountRoute>
                } />

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