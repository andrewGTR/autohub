"use client";

export default function Hero() {
  return (
    <div className="hero">
      <img
        src="/imgs/wallpaperflare.com_wallpaper.jpg"
        alt="Hero Car"
        onError={(e) => {
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
