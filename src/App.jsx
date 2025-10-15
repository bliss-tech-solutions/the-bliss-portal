import './App.css'
import './styles/theme.css'
import './styles/notifications.css'
import PortalRoutes from './routes/PortalRoutes'
import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { setTheme } from './store/slices/themeSlice'
import { NotificationProvider } from './contexts/NotificationContext'

function App() {
  const dispatch = useDispatch()

  useEffect(() => {
    // Initialize theme from localStorage or default to light
    const savedTheme = localStorage.getItem('theme') || 'light'
    dispatch(setTheme(savedTheme))
  }, [dispatch])

  return (
    <NotificationProvider>
      <PortalRoutes />
    </NotificationProvider>
  )
}

export default App
