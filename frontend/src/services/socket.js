import { io } from 'socket.io-client';

const SOCKET_URL = 'https://devorbit-pao9.onrender.com';

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
