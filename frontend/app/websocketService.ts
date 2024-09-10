// websocketService.ts

import exp from "constants";
import { on } from "events";

export default class WebSocketService {
  private socket: WebSocket | null = null;

  connectWebSocket(url: string, onMessage: (data: any) => void) {
    this.socket = new WebSocket('ws://localhost:8000/ws');

    this.socket.onopen = () => {
      console.log('WebSocket connected');
    };

    this.socket.onmessage = (event) => {
      const data = event.data;
      onMessage(data);
    };

    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.socket.onclose = () => {
      console.log('WebSocket connection closed');
    };
  }
  sendWebSocketMessage = (message: any) => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify(message));
      }
    };
}