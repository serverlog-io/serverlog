import { useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";
import Cookies from "js-cookie";

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:3001";

export function useSocket(projectId, onNewEvent) {
  const socketRef = useRef(null);

  useEffect(() => {
    const token = Cookies.get("token");
    if (!token || !projectId) return;

    // Create socket connection
    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Socket connected");
      socket.emit("join:project", projectId);
    });

    socket.on("event:new", (event) => {
      console.log("New event received:", event);
      onNewEvent?.(event);
    });

    socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error.message);
    });

    socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
    });

    return () => {
      socket.emit("leave:project", projectId);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [projectId, onNewEvent]);

  return socketRef.current;
}
