import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from './api';

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Function[]> = new Map();

  connect = async () => {
    if (this.socket?.connected) return;

    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) return;

      this.socket = io(API_BASE_URL, {
        auth: { token },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      this.socket.on('connect', () => {
        console.log('[Socket] Connected to server');
        // Re-attach listeners that were registered before connection
        this.listeners.forEach((callbacks, event) => {
          callbacks.forEach(cb => {
            this.socket?.on(event, cb as any);
          });
        });
      });

      this.socket.on('disconnect', () => {
        console.log('[Socket] Disconnected from server');
      });

      this.socket.on('connect_error', (error) => {
        console.error('[Socket] Connection error:', error.message);
      });

    } catch (error) {
      console.error('[Socket] Setup error:', error);
    }
  };

  disconnect = () => {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.listeners.clear();
    }
  };

  emit = (event: string, data?: any) => {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn(`[Socket] Cannot emit ${event}, not connected`);
    }
  };

  on = (event: string, callback: Function) => {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)?.push(callback);

    if (this.socket) {
      this.socket.on(event, callback as any);
    }

    return () => this.off(event, callback);
  };

  off = (event: string, callback?: Function) => {
    if (this.socket) {
      if (callback) {
        this.socket.off(event, callback as any);
      } else {
        this.socket.off(event);
      }
    }
    
    if (this.listeners.has(event)) {
      if (callback) {
        const cbs = this.listeners.get(event)?.filter(cb => cb !== callback) || [];
        this.listeners.set(event, cbs);
      } else {
        this.listeners.delete(event);
      }
    }
  };
}

export const socketService = new SocketService();
