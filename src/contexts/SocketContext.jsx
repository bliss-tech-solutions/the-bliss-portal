import React, { createContext, useContext, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { selectUserId } from '../store/slices/authSlice';
import { getSocket, connectSocket, disconnectSocket } from '../utils/socket';

const SocketContext = createContext({ socket: null });

export const SocketProvider = ({ children }) => {
  const socket = getSocket();
  const userId = useSelector(selectUserId);

  // Initialize socket connection when provider mounts or user changes
  useEffect(() => {
    if (!userId) return;
    if (socket && !socket.connected) {
      connectSocket(userId);
    } else if (socket && socket.connected) {
      // ensure we join the right room for current user
      socket.emit('join', { userId });
    }
    return () => {
      // optional: keep connection for app; do not disconnect on userId change
    };
  }, [socket, userId]);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export default SocketContext;