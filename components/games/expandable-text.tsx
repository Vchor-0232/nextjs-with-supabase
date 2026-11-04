"use client";

import { useEffect, useRef, useState } from "react";

// Shows the first few lines of long text (like Roblox descriptions) with a
// "Show more" button, so reviews aren't pushed far down the page.
export function ExpandableText({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (el) setOverflows(el.scrollHeight > el.clientHeight + 1);
  }, [text]);

  return (
    <>
      <p ref={ref} className={`${className ?? ""} ${expanded ? "" : "line-clamp-6"}`}>
        {text}
      </p>
      {(overflows || expanded) && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="mt-1 text-[13px] font-bold text-[#f5c518] hover:underline"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </>
  );
}
