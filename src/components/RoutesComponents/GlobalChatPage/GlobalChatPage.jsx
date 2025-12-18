import React from 'react';
import { useSelector } from 'react-redux';
import { selectTheme } from '../../../store/slices/themeSlice';
import GlobalChat from '../../PortalCommonComponents/GlobalChat/GlobalChat';
import './GlobalChatPage.css';

const GlobalChatPage = () => {
    const theme = useSelector(selectTheme);

    return (
        <div className={`global-chat-page theme-${theme}`}>
            <div className="global-chat-page-header">
                <h2>Global Chat</h2>
                <p className="global-chat-page-subtitle">
                    Communicate with all team members in real-time
                </p>
            </div>
            <div className="global-chat-page-content">
                <GlobalChat
                    title="Global Chat"
                    placeholder="Type a message to everyone..."
                    showTitle={true}
                    height="calc(100vh - 250px)"
                />
            </div>
        </div>
    );
};

export default GlobalChatPage;


