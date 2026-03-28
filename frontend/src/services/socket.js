import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:5050';

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
