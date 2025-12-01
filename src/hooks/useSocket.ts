"use client"

import { useEffect, useRef, useCallback, useState } from "react"
import type { Socket } from "socket.io-client"
import {
  initSocket,
  onMessageReceive,
  onTypingIndicator,
  startTyping,
  stopTyping,
  sendDirectMessage,
  removeMessageListener,
  removeTypingListener,
  disconnectSocket,
} from "@/services/socket.service"
import type { Mensaje } from "@/types/Chats"

interface UseSocketOptions {
  userId?: string
  onMessageReceive?: (data: Mensaje) => void
  onUserTyping?: (data: { emisorId: string; receptorId: string; escribiendo: boolean }) => void
}

export const useSocket = ({
  userId,
  onMessageReceive: onMessageReceiveCallback,
  onUserTyping: onUserTypingCallback,
}: UseSocketOptions = {}) => {
  const socketRef = useRef<Socket | null>(null)
  const [isReady, setIsReady] = useState(false)
  const onMessageReceiveRef = useRef(onMessageReceiveCallback)
  const onUserTypingRef = useRef(onUserTypingCallback)

  useEffect(() => {
    onMessageReceiveRef.current = onMessageReceiveCallback
    onUserTypingRef.current = onUserTypingCallback
  }, [onMessageReceiveCallback, onUserTypingCallback])

  useEffect(() => {
    if (!userId) return

    socketRef.current = initSocket(userId)

    if (socketRef.current) {
      if (socketRef.current.connected) {
        setIsReady(true)
      } else {
        socketRef.current.on("connect", () => {
          setIsReady(true)
        })
      }
    }

    if (onMessageReceiveRef.current) {
      onMessageReceive((data) => {
        onMessageReceiveRef.current?.({
          id: Math.random().toString(36).substr(2, 9),
          conversacionId: data.conversacionId || "",
          emisorId: data.fromUserId,
          emisorNombre: data.emisorNombre || "",
          receptorId: data.toUserId,
          contenido: data.message,
          timestamp: data.timestamp,
          leido: data.read || false,
        })
      })
    }

    if (onUserTypingRef.current) {
      onTypingIndicator((data) => {
        onUserTypingRef.current?.({
          emisorId: data.fromUserId,
          receptorId: data.toUserId,
          escribiendo: data.isTyping,
        })
      })
    }

    return () => {
      removeMessageListener()
      removeTypingListener()
      disconnectSocket()
      setIsReady(false)
    }
  }, [userId])

  const enviarMensajeDirecto = useCallback(
    (receptorId: string, contenido: string, conversacionId: string) => {
      if (!socketRef.current) return
      sendDirectMessage(userId || "", receptorId, contenido)
    },
    [userId],
  )

  const indicarEscrituraEnCurso = useCallback(
    (receptorId: string, escribiendo: boolean) => {
      if (!socketRef.current) return
      if (escribiendo) {
        startTyping(userId || "", receptorId)
      } else {
        stopTyping(userId || "", receptorId)
      }
    },
    [userId],
  )

  return {
    socket: socketRef.current,
    enviarMensajeDirecto,
    indicarEscrituraEnCurso,
    isReady,
  }
}
