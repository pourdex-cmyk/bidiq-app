import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/cn';

interface AccordionItem {
  id: string;
  title: React.ReactNode;
  content: React.ReactNode;
  badge?: React.ReactNode;
}

interface AccordionProps {
  items: AccordionItem[];
  defaultOpen?: string[];
  allowMultiple?: boolean;
  className?: string;
}

export default function Accordion({ items, defaultOpen = [], allowMultiple = false, className }: AccordionProps) {
  const [openIds, setOpenIds] = useState<Set<string>>(new Set(defaultOpen));

  const toggle = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (!allowMultiple) next.clear();
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className={cn('space-y-1', className)}>
      {items.map((item) => {
        const isOpen = openIds.has(item.id);
        return (
          <div
            key={item.id}
            className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] overflow-hidden"
          >
            <button
              onClick={() => toggle(item.id)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-[var(--bg-elevated)] transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-medium text-[var(--text-primary)] truncate">{item.title}</span>
                {item.badge}
              </div>
              <ChevronDown
                className={cn('w-4 h-4 text-[var(--text-tertiary)] flex-shrink-0 transition-transform duration-200', isOpen && 'rotate-180')}
              />
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 pt-0 border-t border-[var(--border-subtle)]">
                    {item.content}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
