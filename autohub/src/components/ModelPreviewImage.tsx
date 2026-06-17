"use client";
import { useState, useEffect } from "react";
import SmoothImage from "./SmoothImage";

interface ModelPreviewImageProps {
  brand: string;
  model: string;
  year: string;
  alt: string;
  className?: string;
}

export default function ModelPreviewImage({ brand, model, year, alt, className }: ModelPreviewImageProps) {
  const [imgUrl, setImgUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const fetchImage = async () => {
      try {
        const res = await fetch(`/api/images/gallery?brand=${encodeURIComponent(brand)}&model=${encodeURIComponent(model)}&year=${encodeURIComponent(year)}`);
        const data = await res.json();
        
        if (isMounted && data.images && data.images.length > 0) {
          setImgUrl(data.images[0]);
        }
      } catch (e) {
        console.error("Failed to load preview image:", e);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchImage();

    return () => {
      isMounted = false;
    };
  }, [brand, model, year]);

  if (loading) {
    return (
      <div className={className} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f0f5' }}>
        <div style={{ width: '24px', height: '24px', border: '3px solid #ccc', borderTopColor: '#3a3aff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!imgUrl) {
    return (
      <div className={className} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f8f8', color: '#ccc' }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
          <rect x="2" y="7" width="20" height="11" rx="2"/><path d="M4 7l2-3h12l2 3"/>
          <circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>
        </svg>
      </div>
    );
  }

  return (
    <img loading="lazy"
      src={imgUrl}
      alt={alt}
      className={className}
      onError={(e) => { (e.target as HTMLImageElement).src = "https://placehold.co/400x200/f3f3f3/aaa?text=No+Image"; }}
    />
  );
}
