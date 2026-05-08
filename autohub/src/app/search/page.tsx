"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import PageNavbar from "../../components/PageNavbar";
import PageHeader from "../../components/PageHeader";
import CarCard from "../../components/CarCard";
import { unifiedSearch, LearningCar } from "../../lib/api";
import { Listing } from "../../context/PostsContext";
import Link from "next/link";
import "./page.css";

function SearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams?.get("q") || "";
  
  const [activeTab, setActiveTab] = useState<"all" | "learning" | "ads">("all");
  const [learningResults, setLearningResults] = useState<LearningCar[]>([]);
  const [adsResults, setAdsResults] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function performSearch() {
      setIsLoading(true);
      try {
        const results = await unifiedSearch(query);
        setLearningResults(results.learning);
        setAdsResults(results.ads);
      } catch (error) {
        console.error("Search failed", error);
      } finally {
        setIsLoading(false);
      }
    }
    
    performSearch();
  }, [query]);

  const showLearning = activeTab === "all" || activeTab === "learning";
  const showAds = activeTab === "all" || activeTab === "ads";

  return (
    <>
      <PageNavbar />
      <PageHeader 
        title={`Search Results for "${query}"`} 
        description="Find cars to learn about and marketplace listings" 
      />
      
      <div className="search-container">
        <div className="search-tabs">
          <button 
            className={`search-tab ${activeTab === "all" ? "active" : ""}`}
            onClick={() => setActiveTab("all")}
          >
            All Results
          </button>
          <button 
            className={`search-tab ${activeTab === "learning" ? "active" : ""}`}
            onClick={() => setActiveTab("learning")}
          >
            Learning ({learningResults.length})
          </button>
          <button 
            className={`search-tab ${activeTab === "ads" ? "active" : ""}`}
            onClick={() => setActiveTab("ads")}
          >
            Marketplace ({adsResults.length})
          </button>
        </div>

        {isLoading ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>Loading results...</div>
        ) : (
          <>
            {/* LEARNING SECTION */}
            {showLearning && (
              <div className="results-section">
                <h2 className="section-title">Educational Resources</h2>
                {learningResults.length === 0 ? (
                  <div className="no-results">
                    <p>No learning resources found for this query.</p>
                  </div>
                ) : (
                  <div className="car-grid">
                    {learningResults.map(car => (
                      <Link href={`/learn/${car.id}`} key={car.id} className="learning-card">
                        <div className="learning-card-img-wrapper">
                          {car.image ? (
                            <img
                              src={car.image}
                              alt={car.name}
                              className="learning-card-img"
                              onError={(e) => {
                                const target = e.currentTarget;
                                target.style.display = "none";
                                const placeholder = target.nextElementSibling as HTMLElement;
                                if (placeholder) placeholder.style.display = "flex";
                              }}
                            />
                          ) : null}
                          <div
                            className="learning-card-placeholder"
                            style={{ display: car.image ? "none" : "flex" }}
                          >
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#c8c8d8" strokeWidth="1.2">
                              <rect x="2" y="7" width="20" height="11" rx="2"/>
                              <path d="M4 7l2-3h12l2 3"/>
                              <circle cx="7" cy="18" r="2"/>
                              <circle cx="17" cy="18" r="2"/>
                            </svg>
                          </div>
                        </div>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                            <span className="learning-badge">Learn</span>
                            <span style={{ fontSize: "0.75rem", color: "#888", fontWeight: 600 }}>{car.brand}</span>
                            {car.year && <span style={{ fontSize: "0.75rem", color: "#aaa" }}>· {car.year}</span>}
                          </div>
                          <h3>{car.name}</h3>
                          <div className="learning-specs">
                            {car.engine && <div className="spec-item">⚙️ {car.engine}</div>}
                            {car.hp && <div className="spec-item">🐎 {car.hp}</div>}
                          </div>
                          <div className="view-btn">View Specifications →</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ADS SECTION */}
            {showAds && (
              <div className="results-section" style={{ marginTop: showLearning ? "40px" : "0" }}>
                <h2 className="section-title">Marketplace Listings</h2>
                {adsResults.length === 0 ? (
                  <div className="no-results">
                    <p>No marketplace listings found for this query.</p>
                  </div>
                ) : (
                  <div className="car-grid">
                    {adsResults.map(car => (
                      <CarCard key={car.id} car={car} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SearchContent />
    </Suspense>
  );
}
