import { Sun, Moon } from 'lucide-react';
import GlobalSearch from '@/components/ui/GlobalSearch';
import NotificationBell from '@/components/ui/NotificationBell';
import { useThemeStore } from '@/store/themeStore';
import { useAuthStore } from '@/store/authStore';
import { useNotifications } from '@/hooks/useNotifications';

export default function TopNav() {
  const { theme, toggle } = useThemeStore();
  const { user } = useAuthStore();
  const { notifications, markRead } = useNotifications();

  return (
    <header className="h-14 flex items-center gap-4 px-4 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] flex-shrink-0">
      <div className="flex-1">
        <GlobalSearch />
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={toggle}
          className="rounded-lg p-2 hover:bg-[var(--bg-elevated)] transition-colors text-[var(--text-secondary)]"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
        <NotificationBell notifications={notifications} onMarkRead={markRead} />
        <div className="flex items-center gap-2 ml-1 px-2 py-1 rounded-lg hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer">
          <div className="w-6 h-6 rounded-full bg-brand-500 flex items-center justify-center text-xs font-semibold text-white">
            {user?.email?.[0]?.toUpperCase() ?? '?'}
          </div>
        </div>
      </div>
    </header>
  );
}
