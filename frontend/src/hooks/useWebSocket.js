import { useEffect, useRef, useCallback } from 'react';
import { useStore } from '../stores/useStore';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';

export function useWebSocket() {
  const ws = useRef(null);
  const reconnectTimeout = useRef(null);

  const {
    setWsConnected,
    addPaymentEvent,
    updateActiveTask,
    addNotification
  } = useStore();

  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) return;

    try {
      ws.current = new WebSocket(WS_URL);

      ws.current.onopen = () => {
        console.log('🔌 WebSocket connected');
        setWsConnected(true);
      };

      ws.current.onclose = () => {
        console.log('🔌 WebSocket disconnected');
        setWsConnected(false);
        // Reconnect after 3s
        reconnectTimeout.current = setTimeout(connect, 3000);
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleMessage(data);
        } catch (e) {
          console.error('Failed to parse WS message:', e);
        }
      };
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
    }
  }, [setWsConnected]);

  const handleMessage = useCallback((data) => {
    switch (data.type) {
      case 'PAYMENT_INITIATED':
        addPaymentEvent({
          type: 'initiated',
          taskId: data.taskId,
          amount: data.amount,
          timestamp: Date.now()
        });
        break;

      case 'PAYMENT_CONFIRMED':
        addPaymentEvent({
          type: 'confirmed',
          taskId: data.taskId,
          txHash: data.txHash,
          timestamp: Date.now()
        });
        addNotification({
          type: 'success',
          title: 'Payment Confirmed',
          message: `Task #${data.taskId} payment confirmed`
        });
        break;

      case 'TASK_STARTED':
        updateActiveTask(data.taskId, { status: 'in_progress' });
        addPaymentEvent({
          type: 'task_started',
          taskId: data.taskId,
          agentId: data.agentId,
          timestamp: Date.now()
        });
        break;

      case 'AGENT_WORKING':
        addPaymentEvent({
          type: 'agent_working',
          taskId: data.taskId,
          agentId: data.agentId,
          agentName: data.agentName,
          progress: data.progress,
          timestamp: Date.now()
        });
        break;

      case 'TASK_COMPLETED':
        updateActiveTask(data.taskId, { status: 'completed', result: data.result });
        addPaymentEvent({
          type: 'completed',
          taskId: data.taskId,
          earnings: data.earnings,
          timestamp: Date.now()
        });
        addNotification({
          type: 'success',
          title: 'Task Completed',
          message: `Task #${data.taskId} finished successfully`
        });
        break;

      case 'PAYMENT_DISTRIBUTED':
        addPaymentEvent({
          type: 'distributed',
          taskId: data.taskId,
          agents: data.agents,
          amounts: data.amounts,
          timestamp: Date.now()
        });
        break;

      default:
        console.log('Unknown WS message type:', data.type);
    }
  }, [addPaymentEvent, updateActiveTask, addNotification]);

  const disconnect = useCallback(() => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }
    if (ws.current) {
      ws.current.close();
    }
  }, []);

  const send = useCallback((data) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(data));
    }
  }, []);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return { send, connected: useStore((s) => s.wsConnected) };
}
