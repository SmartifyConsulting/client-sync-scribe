import { useEffect, useState } from "react";
import { FileText } from "lucide-react";

/** Fired (e.g. from the sign-document flow) whenever a document should fly into the Documents nav badge. */
export const WEALTH_DOC_SIGNED_EVENT = "wealth-doc-signed";

interface FlyingDoc {
  id: number;
  dx: number;
  dy: number;
}

/** Renders a file icon that animates from the center of the screen into the
 *  Documents nav item (tagged with [data-nav-documents]) whenever a document
 *  is signed or saved. Mount once near the app root. */
export function DocFlyAnimation() {
  const [flying, setFlying] = useState<FlyingDoc[]>([]);

  useEffect(() => {
    const handler = () => {
      const target = document.querySelector("[data-nav-documents]");
      if (!target) return;
      const rect = target.getBoundingClientRect();
      const startX = window.innerWidth / 2;
      const startY = window.innerHeight / 2;
      const id = Date.now() + Math.random();
      setFlying((f) => [...f, { id, dx: rect.left + rect.width / 2 - startX, dy: rect.top + rect.height / 2 - startY }]);
      window.setTimeout(() => setFlying((f) => f.filter((d) => d.id !== id)), 900);

      // Bump the badge once the file "arrives"
      window.setTimeout(() => {
        const badge = document.querySelector("[data-nav-documents-badge]");
        if (!badge) return;
        badge.classList.remove("animate-nav-badge-bump");
        void (badge as HTMLElement).offsetWidth;
        badge.classList.add("animate-nav-badge-bump");
      }, 800);
    };
    window.addEventListener(WEALTH_DOC_SIGNED_EVENT, handler);
    return () => window.removeEventListener(WEALTH_DOC_SIGNED_EVENT, handler);
  }, []);

  if (flying.length === 0) return null;

  return (
    <>
      {flying.map((d) => (
        <FileText
          key={d.id}
          className="animate-fly-to-doc pointer-events-none fixed left-1/2 top-1/2 z-[9999] h-6 w-6 text-primary"
          style={{ ["--fly-dx" as any]: `${d.dx}px`, ["--fly-dy" as any]: `${d.dy}px` }}
        />
      ))}
    </>
  );
}

export default DocFlyAnimation;
