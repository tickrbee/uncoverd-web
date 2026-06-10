"use client";

import { useEffect, useState } from "react";

// Thin reading-progress bar pinned to the top of article pages.
export function ReadingProgress() {
  const [p, setP] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      setP(max > 0 ? (h.scrollTop / max) * 100 : 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div className="dv-readbar" aria-hidden="true">
      <div className="dv-readbar__fill" style={{ width: `${p}%` }} />
    </div>
  );
}
