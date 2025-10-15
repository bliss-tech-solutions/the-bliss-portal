import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import 'antd/dist/reset.css'
import './index.css'
import App from './App.jsx'
import store from './store'
import { BrowserRouter } from 'react-router-dom'
import { App as AntdApp, ConfigProvider } from 'antd'

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <StrictMode>
      <Provider store={store}>
        <ConfigProvider>
          <AntdApp>
            <App />
          </AntdApp>
        </ConfigProvider>
      </Provider>
    </StrictMode>
  </BrowserRouter>,
)
