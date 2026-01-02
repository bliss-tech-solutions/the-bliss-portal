import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import 'antd/dist/reset.css'
import './index.css'
import App from './App.jsx'
import store from './store'
import { BrowserRouter } from 'react-router-dom'
import { App as AntdApp, ConfigProvider } from 'antd'
import { SocketProvider } from './contexts/SocketContext'
import { TaskChatProvider } from './contexts/TaskChatContext'
import { GlobalChatProvider } from './contexts/GlobalChatContext'
import { LoadingProvider } from './contexts/LoadingContext'
import { UserChatProvider } from './contexts/UserChatContext'
import { NotificationProvider } from './contexts/NotificationContext'
import { ChakraUIProvider } from './components/ui/provider'

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <StrictMode>
      <Provider store={store}>
        <ChakraUIProvider>
          <ConfigProvider>
            <AntdApp>
              <NotificationProvider>
                <LoadingProvider>
                  <SocketProvider>
                    <TaskChatProvider>
                      <GlobalChatProvider>
                        <UserChatProvider>
                          <App />
                        </UserChatProvider>
                      </GlobalChatProvider>
                    </TaskChatProvider>
                  </SocketProvider>
                </LoadingProvider>
              </NotificationProvider>
            </AntdApp>
          </ConfigProvider>
        </ChakraUIProvider>
      </Provider>
    </StrictMode>
  </BrowserRouter>,
)
