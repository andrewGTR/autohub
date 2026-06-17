"use client";

import { useState, useRef, useEffect, ImgHTMLAttributes } from 'react';

export default function SmoothImage({ className = "", alt = "Image", src, ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    // If image is already cached and loaded before JS executes
    if (imgRef.current?.complete) {
      setLoaded(true);
    }
  }, []);

  // Don't render an <img loading="lazy"> with empty src — it causes the browser
  // to re-request the current page URL
  if (!src) return null;

  return (
    <img
      ref={imgRef}
      src={src}
      alt={alt}
      loading="lazy"
      className={`smooth-image ${loaded ? "loaded" : ""} ${className}`}
      onLoad={(e) => {
        setLoaded(true);
        if (props.onLoad) props.onLoad(e);
      }}
      {...props}
    />
  );
}

