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

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <StrictMode>
      <Provider store={store}>
        <ConfigProvider>
          <AntdApp>
            <SocketProvider>
              <TaskChatProvider>
                <App />
              </TaskChatProvider>
            </SocketProvider>
          </AntdApp>
        </ConfigProvider>
      </Provider>
    </StrictMode>
  </BrowserRouter>,
)
