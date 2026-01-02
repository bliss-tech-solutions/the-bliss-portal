import React from 'react';
import { useSelector } from 'react-redux';
import { selectTheme } from '../../../store/slices/themeSlice';
import UserWiseChat from '../../PortalCommonComponents/UserWiseChat/UserWiseChat';
import './GlobalChatPage.css';
import BookingInvoice from './BookingInvoice/BookingInvoice';
const GlobalChatPage = () => {
    const theme = useSelector(selectTheme);

    return (
        <div className={`global-chat-page theme-${theme}`}>
            {/* <div className="global-chat-page-header">
                <h2>Global Chat</h2>
                <p className="global-chat-page-subtitle">
                    Communicate with all team members in real-time
                </p>
            </div> */}
            <div className="global-chat-page-content">
                {/* <GlobalChat
                    title=<><h2>Global Chat</h2></>
                    placeholder="Type a message to everyone..."
                    showTitle={true}
                    height="calc(100vh - 250px)"
                /> */}
                <UserWiseChat height="calc(100vh - 200px)" />
            </div>
            {/* <BookingInvoice /> */}
        </div>
    );
};


export default GlobalChatPage;


