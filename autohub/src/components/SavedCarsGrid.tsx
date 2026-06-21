"use client";

import { useSavedCars } from "../context/SavedCarsContext";
import Link from "next/link";

export default function SavedCarsGrid() {
  const { savedCars, removeSaved, loadingSaved } = useSavedCars();

  const parsePrice = (priceStr?: string) => {
    if (!priceStr) return 0;
    const num = parseInt(priceStr.replace(/[^0-9]/g, ""), 10);
    return isNaN(num) ? 0 : num;
  };

  const getDiscountPercent = (orig: string, offer: string) => {
    const o = parsePrice(orig);
    const f = parsePrice(offer);
    if (o > 0 && f > 0 && f < o) {
      return Math.round(((o - f) / o) * 100);
    }
    return 0;
  };

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
        <div className="saved-empty-icon"></div>
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
            <div className="saved-card-img" style={{ position: 'relative' }}>
              {car.isOffer && car.offerPrice && getDiscountPercent(car.price, car.offerPrice) > 0 && (
                <div style={{ position: 'absolute', top: '8px', left: '8px', background: '#dd0000', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold', zIndex: 10 }}>
                  {getDiscountPercent(car.price, car.offerPrice)}% OFF
                </div>
              )}
              {car.image ? (
                <img loading="lazy"
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
                {car.mileage && <span>{car.mileage}</span>}
                {car.transmission && <span>{car.transmission}</span>}
                {car.location && <span>{car.location}</span>}
                <span>{car.dealerName || `${car.manufacturer} Dealer`}</span>
              </div>
              <div className="saved-card-price" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: '1.2' }}>
                {car.isOffer && car.offerPrice ? (
                  <>
                    <span style={{ textDecoration: 'line-through', fontSize: '0.8em', opacity: 0.7, color: 'white' }}>{car.price}</span>
                    <span style={{ color: '#dd0000' }}>{car.offerPrice}</span>
                  </>
                ) : (
                  <span>{car.price}</span>
                )}
              </div>
            </div>
          </Link>
          <button
            className="saved-remove-btn"
            onClick={() => removeSaved(car.id)}
            aria-label="Remove from wishlist"
            title="Remove from wishlist"
          >
            X
          </button>
        </div>
      ))}
    </div>
  );
}
