"use client";

import SmoothImage from "./SmoothImage";

export default function Hero() {
  return (
    <div className="hero">
      <SmoothImage
        src="/imgs/wallpaperflare.com_wallpaper.jpg"
        alt="Hero Car"
        onError={(e: any) => {
          (e.currentTarget as HTMLImageElement).style.display = "none";
        }}
      />
      <div className="hero-text">
        <h1>
          Discover
          <br />
          Your Car
          <br />
          <span className="hero-word">Intelligently</span>
        </h1>
      </div>
    </div>
  );
}
