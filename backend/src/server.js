import app from "./app.js"
import dotenv from "dotenv"
import http from "http"
import { Server } from "socket.io"

dotenv.config()

const PORT = process.env.PORT || 4000

const server = http.createServer(app)

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
})

const activeUsers = new Map()

io.on("connection", (socket) => {
  socket.on("user:join", (userId) => {
    activeUsers.set(userId, socket.id)
  })

  // Handle sending direct messages
  socket.on("message:send", (data) => {
    const { fromUserId, toUserId, message, timestamp } = data
    const recipientSocketId = activeUsers.get(toUserId)

    if (recipientSocketId) {
      // Send to recipient if online
      io.to(recipientSocketId).emit("message:receive", {
        fromUserId,
        toUserId,
        message,
        timestamp,
        read: false,
      })
    }

    // Send back confirmation to sender
    socket.emit("message:sent", {
      fromUserId,
      toUserId,
      message,
      timestamp,
    })
  })

  // Handle typing indicator
  socket.on("typing:start", (data) => {
    const { fromUserId, toUserId } = data
    const recipientSocketId = activeUsers.get(toUserId)

    if (recipientSocketId) {
      io.to(recipientSocketId).emit("typing:indicator", {
        userId: fromUserId,
        isTyping: true,
      })
    }
  })

  socket.on("typing:stop", (data) => {
    const { fromUserId, toUserId } = data
    const recipientSocketId = activeUsers.get(toUserId)

    if (recipientSocketId) {
      io.to(recipientSocketId).emit("typing:indicator", {
        userId: fromUserId,
        isTyping: false,
      })
    }
  })

  // Handle user going offline
  socket.on("disconnect", () => {
    for (const [userId, socketId] of activeUsers.entries()) {
      if (socketId === socket.id) {
        activeUsers.delete(userId)
        break
      }
    }
  })
})

// Export io instance for use in routes if needed
app.set("io", io)

server.listen(PORT, () => {
})
