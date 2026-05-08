"use client";

import Link from 'next/link';
import { Listing } from '../context/PostsContext';

export default function CarCard({ car }: { car: Listing }) {
  return (
    <div className="car-card">
      <Link href={car.link} className="car-card-a">
        <div className="car-img">
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
        <div className="price-btn">{car.price}</div>
      </Link>
    </div>
  );
}
