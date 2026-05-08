import { useState } from 'react';
import { Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/cn';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
  link?: string;
}

interface NotificationBellProps {
  notifications: Notification[];
  onMarkRead: (ids: string[]) => void;
}

export default function NotificationBell({ notifications, onMarkRead }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const unread = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative rounded-lg p-2 hover:bg-[var(--bg-elevated)] transition-colors"
      >
        <Bell className="w-4 h-4 text-[var(--text-secondary)]" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-500 text-2xs font-semibold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }}
              transition={{ duration: 0.12 }}
              className="absolute right-0 top-full mt-1 w-80 z-50 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-overlay overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]">
                <span className="text-sm font-semibold text-[var(--text-primary)]">Notifications</span>
                {unread > 0 && (
                  <button onClick={() => onMarkRead(notifications.filter(n => !n.is_read).map(n => n.id))}
                    className="text-xs text-brand-400 hover:text-brand-300">
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-sm text-[var(--text-tertiary)]">All caught up</div>
                ) : (
                  notifications.slice(0, 10).map((n) => (
                    <Link
                      key={n.id}
                      to={n.link || '/notifications'}
                      onClick={() => { if (!n.is_read) onMarkRead([n.id]); setOpen(false); }}
                      className={cn(
                        'flex gap-3 px-4 py-3 hover:bg-[var(--bg-elevated)] transition-colors border-b border-[var(--border-subtle)] last:border-0',
                        !n.is_read && 'bg-brand-500/5'
                      )}
                    >
                      {!n.is_read && <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-brand-400 flex-shrink-0" />}
                      <div className={cn('space-y-0.5', n.is_read && 'ml-4')}>
                        <p className="text-xs font-medium text-[var(--text-primary)]">{n.title}</p>
                        <p className="text-xs text-[var(--text-secondary)] line-clamp-2">{n.message}</p>
                      </div>
                    </Link>
                  ))
                )}
              </div>
              <div className="border-t border-[var(--border-subtle)] p-2">
                <Link to="/notifications" onClick={() => setOpen(false)}
                  className="block w-full text-center text-xs text-brand-400 hover:text-brand-300 py-1">
                  View all
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
