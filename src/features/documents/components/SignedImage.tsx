import { useEffect, useState } from "react";
import { signedMediaUrl } from "../lib/signedMediaUrl";

interface SignedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string | null;
}

/**
 * Renders an image stored in a private storage bucket. The stored URL is the
 * public one, which 400s, so it is exchanged for a short-lived signed URL
 * before the browser fetches it.
 */
export function SignedImage({ src, ...props }: SignedImageProps) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setUrl(null);
    if (!src) return;
    void signedMediaUrl(src).then((signed) => {
      if (!cancelled) setUrl(signed || src);
    });
    return () => {
      cancelled = true;
    };
  }, [src]);

  if (!url) return <div className={props.className} aria-hidden />;
  return <img {...props} src={url} />;
}
