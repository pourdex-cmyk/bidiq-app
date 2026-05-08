import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/utils/cn';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  side?: 'right' | 'left';
  width?: string;
  className?: string;
}

export default function Drawer({ open, onClose, title, children, side = 'right', width = '480px', className }: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: side === 'right' ? '100%' : '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: side === 'right' ? '100%' : '-100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            style={{ width, [side === 'right' ? 'marginLeft' : 'marginRight']: 'auto' }}
            className={cn(
              'relative flex flex-col h-full border-[var(--border-default)] bg-[var(--bg-surface)] shadow-overlay',
              side === 'right' ? 'border-l' : 'border-r',
              className
            )}
          >
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] p-4">
              {title && <h2 className="text-base font-heading font-semibold text-[var(--text-primary)]">{title}</h2>}
              <button onClick={onClose} className="ml-auto rounded-lg p-1 hover:bg-[var(--bg-elevated)] transition-colors">
                <X className="w-4 h-4 text-[var(--text-secondary)]" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
