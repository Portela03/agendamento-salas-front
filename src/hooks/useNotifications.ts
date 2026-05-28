import { useCallback, useEffect, useState } from 'react';
import { Notificacao, notificacaoService } from '../services/notificacaoService';

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notificacao[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await notificacaoService.listar();
      setNotifications(data);
    } catch {
      // Silently ignore — notifications are non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const markAllAsRead = useCallback(async () => {
    try {
      await notificacaoService.marcarTodasComoLidas();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      // Silently ignore
    }
  }, []);

  const deleteOne = useCallback(async (id: string) => {
    // Optimistic update — remove locally first
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      await notificacaoService.deletar(id);
    } catch {
      // Revert on failure by re-fetching
      void load();
    }
  }, [load]);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const unreadNotifications = notifications.filter((n) => !n.read);

  return { notifications, unreadNotifications, unreadCount, loading, markAllAsRead, deleteOne, reload: load };
}
