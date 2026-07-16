import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /** Sheet sobe de baixo no mobile; no desktop vira um diálogo centrado. */
  className?: string;
}

export function Sheet({ open, onClose, title, children, className }: SheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    // Trava o scroll do body: sem isso, arrastar dentro do sheet no iOS rola a
    // página atrás dele e o usuário perde a referência do que está fazendo.
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-ink/25 backdrop-blur-[2px]"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ y: '100%', opacity: 0.6 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0.4 }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            className={cn(
              'relative w-full sm:max-w-lg bg-surface shadow-float',
              'rounded-t-xl sm:rounded-xl',
              'max-h-[90vh] overflow-y-auto hide-scrollbar',
              'pb-[max(1.25rem,env(safe-area-inset-bottom))]',
              className,
            )}
          >
            <div className="sticky top-0 z-10 bg-surface/95 backdrop-blur-sm px-5 pt-3 pb-3">
              <div className="mx-auto mb-3 h-1 w-9 rounded-pill bg-line sm:hidden" />
              {title && (
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-20">{title}</h2>
                  <button
                    onClick={onClose}
                    aria-label="Fechar"
                    className="p-1.5 -mr-1.5 rounded-pill text-muted hover:bg-raised hover:text-ink transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              )}
            </div>

            <div className="px-5 pb-2">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
