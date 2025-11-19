import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { selectUserId } from '../store/slices/authSlice';
import { getSocket, connectSocket, initializeSocket } from '../utils/socket';

const SocketContext = createContext({ socket: null });

export const SocketProvider = ({ children }) => {
  const socket = useMemo(() => getSocket() || initializeSocket(), []);
  const userId = useSelector(selectUserId);

  // Initialize socket connection when provider mounts or user changes
  useEffect(() => {
    if (!socket || !userId) return;

    const joinUserRoom = () => {
      socket.emit('joinUser', userId);
    };

    if (!socket.connected) {
      connectSocket(userId);
    } else {
      joinUserRoom();
    }

    socket.on('connect', joinUserRoom);

    return () => {
      socket.off('connect', joinUserRoom);
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