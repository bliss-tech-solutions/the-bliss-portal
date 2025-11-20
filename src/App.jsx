import './App.css'
import './styles/theme.css'
import './styles/notifications.css'
import PortalRoutes from './routes/PortalRoutes'
import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useLocation } from 'react-router-dom'
import { setTheme } from './store/slices/themeSlice'
import { NotificationProvider } from './contexts/NotificationContext'
import OfficeClosingReminder from './components/PortalCommonComponents/OfficeClosingReminder/OfficeClosingReminder'
import CheckInOutReminder from './components/PortalCommonComponents/CheckInOutReminder/CheckInOutReminder'
import PostCheckoutGuard from './components/PortalCommonComponents/PostCheckoutGuard/PostCheckoutGuard'
import PageLoader from './components/CommonComponents/PageLoader/PageLoader'

function App() {
  const dispatch = useDispatch()
  const location = useLocation()
  const isAuthenticated = useSelector((state) => state.auth?.isAuthenticated)

  useEffect(() => {
    // Initialize theme from localStorage or default to light
    const savedTheme = localStorage.getItem('theme') || 'light'
    dispatch(setTheme(savedTheme))
  }, [dispatch])

  return (
    <NotificationProvider>
      <PageLoader />
      <PortalRoutes />
      <OfficeClosingReminder />
      {isAuthenticated && location.pathname !== '/' && (
        <CheckInOutReminder />
      )}
      {isAuthenticated && <PostCheckoutGuard />}
    </NotificationProvider>
  )
}

export default App
