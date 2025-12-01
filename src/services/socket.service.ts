import io, { type Socket } from "socket.io-client"

let socket: Socket | null = null

export const initSocket = (userId: string) => {
  if (socket?.connected) {
    return socket
  }

  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000"

  socket = io(socketUrl, {
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
  })

  socket.on("connect", () => {
    socket?.emit("user:join", { userId })
  })

  socket.on("connect_error", (error) => {
    console.error("[v0] Error de conexión Socket.io:", error)
  })

  return socket
}

export const getSocket = (): Socket | null => {
  return socket
}

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

export const sendDirectMessage = (fromUserId: string, toUserId: string, message: string) => {
  if (!socket) {
    console.error("[v0] Socket no está inicializado")
    return
  }

  socket.emit("message:send", {
    fromUserId,
    toUserId,
    message,
    timestamp: new Date().toISOString(),
  })
}

export const onMessageReceive = (
  callback: (data: {
    fromUserId: string
    toUserId: string
    message: string
    timestamp: string
    read: boolean
    emisorNombre?: string
    conversacionId?: string
  }) => void,
) => {
  if (!socket) return
  socket.on("message:receive", callback)
}

export const onMessageSent = (
  callback: (data: {
    fromUserId: string
    toUserId: string
    message: string
    timestamp: string
  }) => void,
) => {
  if (!socket) return
  socket.on("message:sent", callback)
}

export const startTyping = (fromUserId: string, toUserId: string) => {
  if (!socket) return
  socket.emit("typing:start", { fromUserId, toUserId })
}

export const stopTyping = (fromUserId: string, toUserId: string) => {
  if (!socket) return
  socket.emit("typing:stop", { fromUserId, toUserId })
}

export const onTypingIndicator = (
  callback: (data: {
    fromUserId: string
    toUserId: string
    isTyping: boolean
  }) => void,
) => {
  if (!socket) return
  socket.on("typing:indicator", callback)
}

export const removeMessageListener = () => {
  if (!socket) return
  socket.off("message:receive")
  socket.off("message:sent")
}

export const removeTypingListener = () => {
  if (!socket) return
  socket.off("typing:indicator")
}
