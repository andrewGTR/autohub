import CarCard from "./CarCard";
import { Listing } from "../context/PostsContext";

interface CarSectionProps {
  title: string;
  cars: Listing[];
  showDivider?: boolean;
}

export default function CarSection({ title, cars, showDivider }: CarSectionProps) {
  return (
    <>
      <div className="section">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h1 className="section-title">{title}</h1>
        </div>
        {cars.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#aaa", fontSize: "0.95rem" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "10px" }}>🚗</div>
            <p>No listings yet. Check back soon!</p>
          </div>
        ) : (
          <div className="car-row">
            {cars.map((car) => (
              <CarCard key={car.id} car={car} />
            ))}
          </div>
        )}
      </div>
      {showDivider && <hr className="section-divider" />}
    </>
  );
}
