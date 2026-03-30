import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5050'; // Adjust if your backend is on a different URL or port

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  reconnection: true
});

export const connectSocket = (token) => {
  if (token) {
    socket.auth = { token };
  }
  socket.connect();
};

export const disconnectSocket = () => {
  socket.disconnect();
};
