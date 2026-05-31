import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';

export default function useSSE(endpoint, token) {
  const [liveEvent, setLiveEvent] = useState(null);

  useEffect(() => {
    if (!token) return;

    const url = `${import.meta.env.VITE_API_BASE_URL}${endpoint}?token=${token}`;
    const eventSource = new EventSource(url);

    eventSource.onmessage = (event) => {
      const parsedData = JSON.parse(event.data);
      
      if (parsedData.type === 'connected') {
        console.log("SSE Connection Established");
        return; 
      }

      setLiveEvent(parsedData);
      
      toast(parsedData.title || "New System Update", { icon: '🔔' });
    };

    eventSource.onerror = (error) => {
      console.error("SSE Connection lost. Browser will auto-reconnect...");
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [endpoint, token]);

  return liveEvent;
}