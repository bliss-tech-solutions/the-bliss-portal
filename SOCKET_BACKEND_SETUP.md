# Socket.io Backend Setup Guide

## ✅ Frontend is Ready! Now Setup Backend:

### 1. Install Socket.io on Backend

```bash
npm install socket.io
```

### 2. Backend Socket Setup (server.js or app.js)

```javascript
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Socket.io setup with CORS
const io = new Server(server, {
    cors: {
        origin: "http://localhost:2711", // Your frontend URL
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('✅ User connected:', socket.id);

    // User joins their own room
    socket.on('join', ({ userId }) => {
        socket.join(userId);
        console.log(`User ${userId} joined room`);
    });

    // Handle task added event
    socket.on('taskAdded', (taskData) => {
        console.log('📝 Task added:', taskData);
        
        // Broadcast to all connected users (or specific room)
        io.emit('taskAdded', taskData);
        
        // OR send only to specific user
        // io.to(taskData.userId).emit('taskAdded', taskData);
    });

    socket.on('disconnect', () => {
        console.log('❌ User disconnected:', socket.id);
    });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`✅ Socket.io ready`);
});
```

### 3. Integration with Existing API Route

```javascript
// In your addtaskassign route
app.post('/api/addtaskassign', async (req, res) => {
    try {
        const taskData = req.body;
        
        // Save to database
        const newTask = await TaskModel.create(taskData);
        
        // Emit socket event
        io.emit('taskAdded', newTask);
        
        res.json({
            success: true,
            message: 'Task added successfully',
            data: newTask
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});
```

## 🎯 How It Works:

### Frontend Flow:
1. User logs in → Socket connects with `userId`
2. User adds task → API called + Socket emits `taskAdded`
3. All connected users receive `taskAdded` event
4. Notification shown automatically

### Backend Flow:
1. Socket server started on same port as API
2. User connects → joins room with `userId`
3. Task added → emits to all users or specific room
4. Users receive update in real-time

## 🔧 Environment Variables:

Add to your `.env` file:

```env
VITE_API_BASE_URL=http://localhost:5000
```

## ✅ Test Socket Connection:

1. Start backend server
2. Open frontend
3. Login with user
4. Check console: "✅ Socket connected"
5. Add task from one browser
6. See notification in another browser instantly!

## 🎯 Simple & Clean:

- ✅ Only `addTask` uses Socket.io
- ✅ No complex structure
- ✅ Easy to understand
- ✅ Works with existing REST API
- ✅ Real-time updates without page refresh

That's it! Backend setup is simple and straightforward! 🚀

