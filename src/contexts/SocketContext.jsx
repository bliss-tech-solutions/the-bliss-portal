import React, { createContext, useContext, useEffect } from 'react';
import { getSocket, connectSocket, disconnectSocket } from '../utils/socket';

const SocketContext = createContext({ socket: null });

export const SocketProvider = ({ children }) => {
  const socket = getSocket();

  // Initialize socket connection when provider mounts
  useEffect(() => {
    if (socket && !socket.connected) {
      connectSocket(); // Connect without userId for now, can be enhanced later
    }
  }, [socket]);

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