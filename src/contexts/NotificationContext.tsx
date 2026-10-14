import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { notificacoesAPI } from '../lib/backendApi';
import { useAuth } from './AuthContext';

interface Notification {
  id: string;
  titulo: string;
  mensagem: string;
  tipo: 'info' | 'success' | 'warning' | 'error';
  categoria: 'despesa' | 'aprovacao' | 'sistema';
  acao_id?: string;
  lida: boolean;
  data_criacao: string;
  data_leitura?: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  fetchNotifications: () => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  addNotification: (notification: Omit<Notification, 'id' | 'lida' | 'data_criacao'>) => void;
}

const POLL_INTERVAL_MS = 30000;

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const { userProfile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async (silencioso = false) => {
    if (!userProfile?.id) return;

    if (!silencioso) setLoading(true);
    try {
      const [notificationsData, unreadData] = await Promise.all([
        notificacoesAPI.getByUsuario(userProfile.id),
        notificacoesAPI.getContagemNaoLidas(userProfile.id)
      ]);
      
      setNotifications(notificationsData);
      setUnreadCount(unreadData.count);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    if (!userProfile?.id) return;
    
    try {
      await notificacoesAPI.marcarComoLida(id, userProfile.id);
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, lida: true, data_leitura: new Date().toISOString() } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!userProfile?.id) return;
    
    try {
      await notificacoesAPI.marcarTodasComoLidas(userProfile.id);
      setNotifications(prev => 
        prev.map(n => ({ ...n, lida: true, data_leitura: new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const deleteNotification = async (id: string) => {
    if (!userProfile?.id) return;
    
    try {
      await notificacoesAPI.delete(id, userProfile.id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      if (notifications.find(n => n.id === id && !n.lida)) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const addNotification = async (notification: Omit<Notification, 'id' | 'lida' | 'data_criacao'>) => {
    if (!userProfile?.id) return;
    
    try {
      const newNotification = await notificacoesAPI.create({
        ...notification,
        usuario_id: userProfile.id
      });
      
      setNotifications(prev => [newNotification, ...prev]);
      setUnreadCount(prev => prev + 1);
    } catch (error) {
      console.error('Error adding notification:', error);
    }
  };

  useEffect(() => {
    if (!userProfile?.id) return;
    fetchNotifications();

    // Verificar novas notificações periodicamente e ao voltar ao separador
    const interval = setInterval(() => fetchNotifications(true), POLL_INTERVAL_MS);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') fetchNotifications(true);
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [userProfile?.id]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        addNotification
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
