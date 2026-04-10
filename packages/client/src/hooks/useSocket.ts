import { useEffect } from "react";
import { getSocket, connectSocket, disconnectSocket } from "../api/socket.js";

export function useSocket(
  event: string,
  handler: (...args: any[]) => void
) {
  useEffect(() => {
    const socket = getSocket();
    connectSocket();
    socket.on(event, handler);
    return () => {
      socket.off(event, handler);
    };
  }, [event, handler]);
}

export function useSocketConnect() {
  useEffect(() => {
    connectSocket();
    return () => {
      disconnectSocket();
    };
  }, []);
}
