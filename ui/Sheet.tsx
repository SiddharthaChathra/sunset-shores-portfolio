"use client";

import { useRef, type ReactNode } from "react";
import { AnimatePresence, motion, useDragControls, type PanInfo } from "motion/react";
import { useFocusTrap } from "@/lib/useFocusTrap";
import { useBackToClose } from "@/lib/useBackToClose";

/**
 * Sunset OS bottom sheet (mobile and tablet): frosted panel with a drag handle. Closes on swipe-down,
 * the close button, Esc, a tap on the backdrop, or the Android Back gesture.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  height = "auto",
  testId,
  labelledBy,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** CSS height of the panel, e.g. "92svh"; "auto" sizes to content (max 92svh). */
  height?: string;
  testId?: string;
  labelledBy?: string;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const drag = useDragControls();
  useFocusTrap(panel, open);
  useBackToClose(open, onClose);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 90 || info.velocity.y > 600) onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80]" onKeyDown={(e) => e.key === "Escape" && onClose()}>
          <motion.button
            type="button"
            aria-label={`Close ${title}`}
            tabIndex={-1}
            className="absolute inset-0 bg-ink/35 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelledBy}
            aria-label={labelledBy ? undefined : title}
            data-testid={testId}
            className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[92svh] w-full max-w-[640px] flex-col rounded-t-[28px] bg-paper shadow-[0_-20px_60px_rgb(35_32_58/0.25)]"
            style={{ height, paddingBottom: "var(--safe-b)" }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            drag="y"
            dragListener={false}
            dragControls={drag}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={onDragEnd}
          >
            {/* the handle row is the drag zone, so scrolling inside the sheet never fights the swipe */}
            <div className="flex shrink-0 touch-none flex-col items-center pt-2.5 pb-1" onPointerDown={(e) => drag.start(e)}>
              <span aria-hidden className="h-[5px] w-10 rounded-full bg-ink/20" />
            </div>
            <div className="flex shrink-0 touch-none items-center justify-between px-5 pb-2" onPointerDown={(e) => drag.start(e)}>
              <h2 id={labelledBy} className="text-[19px] font-extrabold text-ink">
                {title}
              </h2>
              <button type="button" onClick={onClose} className="pill !h-11 !w-11 !justify-center !px-0 text-[18px]" aria-label={`Close ${title}`}>
                ✕
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5" data-lenis-prevent>
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
