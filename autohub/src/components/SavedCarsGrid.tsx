"use client";

import { useSavedCars } from "../context/SavedCarsContext";
import Link from "next/link";

export default function SavedCarsGrid() {
  const { savedCars, removeSaved, loadingSaved } = useSavedCars();

  if (loadingSaved) {
    return (
      <div className="saved-grid">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="saved-card-skeleton">
            <div className="sk-img" />
            <div className="sk-line wide" />
            <div className="sk-line narrow" />
            <div className="sk-line medium" />
          </div>
        ))}
      </div>
    );
  }

  if (savedCars.length === 0) {
    return (
      <div className="saved-empty">
        <div className="saved-empty-icon">🚗</div>
        <h3>No saved cars yet</h3>
        <p>Browse the marketplace and click "Save to Wishlist" on any listing.</p>
        <Link href="/marketplace" className="saved-browse-btn">Browse Cars</Link>
      </div>
    );
  }

  return (
    <div className="saved-grid">
      {savedCars.map((car) => (
        <div key={car.id} className="saved-card">
          <Link href={car.link} className="saved-card-link">
            <div className="saved-card-img">
              {car.image ? (
                <img
                  src={car.image}
                  alt={car.name}
                  onError={(e) => {
                    const t = e.currentTarget;
                    t.style.display = "none";
                    const next = t.nextElementSibling as HTMLElement;
                    if (next) next.style.display = "flex";
                  }}
                />
              ) : null}
              <div className="saved-card-placeholder" style={{ display: car.image ? "none" : "flex" }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#c8c8d8" strokeWidth="1.2">
                  <rect x="2" y="7" width="20" height="11" rx="2"/><path d="M4 7l2-3h12l2 3"/>
                  <circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>
                </svg>
              </div>
              <div className="saved-card-badge">{car.category}</div>
            </div>
            <div className="saved-card-body">
              <h3 className="saved-card-name">{car.name} <span>{car.year}</span></h3>
              <div className="saved-card-meta">
                {car.mileage && <span>🔄 {car.mileage}</span>}
                {car.transmission && <span>⚙️ {car.transmission}</span>}
                {car.location && <span>📍 {car.location}</span>}
              </div>
              <div className="saved-card-price">{car.price}</div>
            </div>
          </Link>
          <button
            className="saved-remove-btn"
            onClick={() => removeSaved(car.id)}
            aria-label="Remove from wishlist"
            title="Remove from wishlist"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
