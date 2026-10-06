"use client";

import { useEffect, useRef } from "react";

/**
 * While `open`, the browser/Android Back gesture closes the overlay instead of leaving the site:
 * a history entry is pushed on open and popped on close. Closing from the UI rewinds that entry.
 */
export function useBackToClose(open: boolean, onClose: () => void) {
  const pushed = useRef(false);
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    history.pushState({ ...(history.state ?? {}), sunsetOverlay: true }, "");
    pushed.current = true;
    const onPop = () => {
      pushed.current = false;
      close.current();
    };
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      // closed from the UI: drop the entry we pushed so Back still leaves normally afterwards
      if (pushed.current) {
        pushed.current = false;
        history.back();
      }
    };
  }, [open]);
}
