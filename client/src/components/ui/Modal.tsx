import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/utils/cn';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

export default function Modal({ open, onClose, title, children, size = 'md', className }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
            className={cn(
              'relative w-full rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-overlay',
              sizes[size],
              className
            )}
          >
            {title && (
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] p-4">
                <h2 className="text-base font-heading font-semibold text-[var(--text-primary)]">{title}</h2>
                <button onClick={onClose} className="rounded-lg p-1 hover:bg-[var(--bg-elevated)] transition-colors">
                  <X className="w-4 h-4 text-[var(--text-secondary)]" />
                </button>
              </div>
            )}
            {!title && (
              <button onClick={onClose} className="absolute right-4 top-4 z-10 rounded-lg p-1 hover:bg-[var(--bg-elevated)] transition-colors">
                <X className="w-4 h-4 text-[var(--text-secondary)]" />
              </button>
            )}
            <div className="p-4">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
