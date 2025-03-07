
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const rooms = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', (data) => {
    const { roomId, userId, username } = data;
    console.log(`User ${userId} (${username}) joining room ${roomId}`);
    
    // Join the room
    socket.join(roomId);
    
    // Store user info
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Map());
    }
    rooms.get(roomId).set(userId, { socketId: socket.id, username });
    
    // Tell this user about all other users in the room
    const roomUsers = Array.from(rooms.get(roomId).keys()).filter(id => id !== userId);
    for (const otherUserId of roomUsers) {
      socket.emit('user-joined', { userId: otherUserId });
    }
    
    // Tell all other users about this user
    socket.to(roomId).emit('user-joined', { userId });
    
    // Store the room ID in the socket for cleanup
    socket.roomId = roomId;
    socket.userId = userId;
  });

  socket.on('offer', (data) => {
    const { userId, offer } = data;
    const roomId = socket.roomId;
    
    if (roomId && rooms.has(roomId)) {
      const userInfo = rooms.get(roomId).get(userId);
      if (userInfo) {
        console.log(`Sending offer from ${socket.userId} to ${userId}`);
        io.to(userInfo.socketId).emit('offer', {
          userId: socket.userId,
          offer
        });
      }
    }
  });

  socket.on('answer', (data) => {
    const { userId, answer } = data;
    const roomId = socket.roomId;
    
    if (roomId && rooms.has(roomId)) {
      const userInfo = rooms.get(roomId).get(userId);
      if (userInfo) {
        console.log(`Sending answer from ${socket.userId} to ${userId}`);
        io.to(userInfo.socketId).emit('answer', {
          userId: socket.userId,
          answer
        });
      }
    }
  });

  socket.on('ice-candidate', (data) => {
    const { userId, candidate } = data;
    const roomId = socket.roomId;
    
    if (roomId && rooms.has(roomId)) {
      const userInfo = rooms.get(roomId).get(userId);
      if (userInfo) {
        console.log(`Sending ICE candidate from ${socket.userId} to ${userId}`);
        io.to(userInfo.socketId).emit('ice-candidate', {
          userId: socket.userId,
          candidate
        });
      }
    }
  });

  socket.on('chat-message', (data) => {
    const { roomId, message } = data;
    console.log(`Message in room ${roomId} from ${message.sender}: ${message.text}`);
    socket.to(roomId).emit('chat-message', message);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    const roomId = socket.roomId;
    const userId = socket.userId;
    
    if (roomId && userId && rooms.has(roomId)) {
      // Remove user from the room
      rooms.get(roomId).delete(userId);
      
      // If room is empty, delete it
      if (rooms.get(roomId).size === 0) {
        rooms.delete(roomId);
      } else {
        // Notify others that user has left
        socket.to(roomId).emit('user-left', { userId });
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Signaling server running on port ${PORT}`);
});
