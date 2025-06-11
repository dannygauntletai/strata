import { useEffect, useRef, useState, useCallback } from 'react';

interface WebSocketMessage {
  type: string;
  data: any;
  timestamp?: string;
}

export const useWebSocket = (url: string | null) => {
  const [data, setData] = useState<WebSocketMessage | null>(null);
  const [error, setError] = useState<Event | null>(null);
  const [readyState, setReadyState] = useState<WebSocket['readyState']>();
  const ws = useRef<WebSocket>();

  const send = useCallback((data: string | object) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      const message = typeof data === 'string' ? data : JSON.stringify(data);
      ws.current.send(message);
    }
  }, []);

  useEffect(() => {
    if (!url) return;

    ws.current = new WebSocket(url);

    ws.current.onopen = (event) => {
      console.log('WebSocket connected:', event);
      setReadyState(ws.current?.readyState);
      setError(null);
    };

    ws.current.onmessage = (event) => {
      try {
        const messageData = JSON.parse(event.data);
        setData({
          type: messageData.type || 'message',
          data: messageData,
          timestamp: new Date().toISOString()
        });
      } catch (e) {
        // Handle plain text messages
        setData({
          type: 'text',
          data: event.data,
          timestamp: new Date().toISOString()
        });
      }
    };

    ws.current.onerror = (event) => {
      console.error('WebSocket error:', event);
      setError(event);
    };

    ws.current.onclose = (event) => {
      console.log('WebSocket closed:', event);
      setReadyState(ws.current?.readyState);
    };

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [url]);

  return {
    data,
    error,
    readyState,
    send,
    isConnected: readyState === WebSocket.OPEN,
    isConnecting: readyState === WebSocket.CONNECTING,
    isClosed: readyState === WebSocket.CLOSED
  };
}; 