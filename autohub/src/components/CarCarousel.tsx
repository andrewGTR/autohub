"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import CarCard from "./CarCard";
import { Listing } from "../context/PostsContext";

interface CarCarouselProps {
  title: string;
  cars: Listing[];
  showDivider?: boolean;
  badge?: string;
}

export default function CarCarousel({ title, cars, showDivider, badge }: CarCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);

  const checkScroll = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    setTimeout(checkScroll, 200);
    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [checkScroll, cars]);

  const scroll = (dir: "prev" | "next") => {
    const el = trackRef.current;
    if (!el) return;
    const cardWidth = 280 + 16; // card width + gap
    el.scrollBy({ left: dir === "next" ? cardWidth * 2 : -cardWidth * 2, behavior: "smooth" });
  };

  return (
    <>
      <div className="carousel-section">

        {/* Header */}
        <div className="carousel-header">
          <div className="carousel-title-group">
            <h2 className="carousel-title">{title}</h2>
            {badge && <span className="carousel-badge">{badge}</span>}
          </div>
          <div className="carousel-arrows">
            <button
              className={`carousel-arrow${canPrev ? "" : " disabled"}`}
              onClick={() => scroll("prev")}
              aria-label="Previous"
              disabled={!canPrev}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <button
              className={`carousel-arrow${canNext ? "" : " disabled"}`}
              onClick={() => scroll("next")}
              aria-label="Next"
              disabled={!canNext}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </div>

        {/* Cards */}
        {cars.length === 0 ? (
          <div className="carousel-empty">
            <div className="carousel-empty-icon"></div>
            <p>No listings yet. Check back soon!</p>
          </div>
        ) : (
          <div className="carousel-track" ref={trackRef}>
            {cars.map((car) => (
              <div className="carousel-card" key={car.id}>
                <CarCard car={car} />
              </div>
            ))}
          </div>
        )}

      </div>
      {showDivider && <hr className="section-divider" />}
    </>
  );
}
