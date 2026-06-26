import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface Props extends React.HTMLAttributes<HTMLSpanElement> {
  /** Lower bound in px so labels stay legible. */
  min?: number;
  /** Upper bound in px. Defaults to the computed font-size on mount. */
  max?: number;
  children: React.ReactNode;
}

/**
 * Inline text that auto-shrinks to fit its parent's width on one line.
 * Re-measures on container resize and on i18n language change.
 */
export function AutoFitText({ min = 11, max, className, children, ...rest }: Props) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const { i18n } = useTranslation();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const parent = el.parentElement;
    if (!parent) return;

    let raf = 0;
    const fit = () => {
      raf = 0;
      // Start from max (or computed initial size)
      const computed = parseFloat(getComputedStyle(el).fontSize);
      const upper = max ?? (computed || 14);
      let size = upper;
      el.style.fontSize = `${size}px`;
      el.style.whiteSpace = "nowrap";
      const available = parent.clientWidth;
      // Shrink until it fits or we hit min
      let guard = 40;
      while (el.scrollWidth > available && size > min && guard-- > 0) {
        size -= 0.5;
        el.style.fontSize = `${size}px`;
      }
    };
    const schedule = () => {
      if (raf) return;
      raf = requestAnimationFrame(fit);
    };
    schedule();

    const ro = new ResizeObserver(schedule);
    ro.observe(parent);
    i18n.on("languageChanged", schedule);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      i18n.off("languageChanged", schedule);
    };
  }, [children, i18n, min, max]);

  const text = typeof children === "string" ? children : undefined;
  return (
    <span
      ref={ref}
      className={cn("inline-block max-w-full align-middle", className)}
      title={text}
      {...rest}
    >
      {children}
    </span>
  );
}
