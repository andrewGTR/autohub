"use client";

import Link from 'next/link';
import { Listing } from '../context/PostsContext';

export default function CarCard({ car }: { car: Listing }) {
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

  const discountPercent = car.isOffer && car.offerPrice ? getDiscountPercent(car.price, car.offerPrice) : 0;

  return (
    <div className="car-card">
      <Link href={car.link} className="car-card-a">
        <div className="car-img" style={{ position: 'relative' }}>
          {discountPercent > 0 && (
            <div style={{ position: 'absolute', top: '10px', left: '10px', background: '#dd0000', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold', zIndex: 10 }}>
              {discountPercent}% OFF
            </div>
          )}
          {car.image ? (
            <img
              src={car.image}
              alt={car.name}
              onError={(e) => {
                const target = e.currentTarget;
                target.style.display = "none";
                const placeholder = target.nextElementSibling as HTMLElement;
                if (placeholder) placeholder.style.display = "flex";
              }}
            />
          ) : null}
          <div
            className="car-img-placeholder"
            style={{ display: car.image ? "none" : "flex" }}
          >
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#c8c8d8" strokeWidth="1.2">
              <rect x="2" y="7" width="20" height="11" rx="2"/>
              <path d="M4 7l2-3h12l2 3"/>
              <circle cx="7" cy="18" r="2"/>
              <circle cx="17" cy="18" r="2"/>
            </svg>
          </div>
        </div>
        <h3>
          {car.name} <span>{car.year}</span>
        </h3>
        <small className="category">{car.category}</small>
        <div className="car-info">🔄 {car.mileage}</div>
        <div className="car-info">⚙️ {car.transmission}</div>
        <div className="car-info">📍 {car.location}</div>
        <div className="car-info" style={{ color: '#3a3aff', fontWeight: 'bold' }}>👤 {car.dealerName || `${car.manufacturer} Dealer`}</div>
        <div className="price-btn" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {car.isOffer && car.offerPrice ? (
            <>
              <span style={{ textDecoration: 'line-through', fontSize: '0.8em', opacity: 0.7, color: 'white' }}>
                {car.price}
              </span>
              <span style={{ color: '#dd0000' }}>{car.offerPrice}</span>
            </>
          ) : (
            <span>{car.price}</span>
          )}
        </div>
      </Link>
    </div>
  );
}
