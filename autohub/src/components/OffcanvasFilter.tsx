"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

export default function OffcanvasFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  
  const [isOpen, setIsOpen] = useState(false);
  
  // Existing state
  const [openBrands, setOpenBrands] = useState<{ [key: string]: boolean }>({ nissan: true });
  const [selectedBody, setSelectedBody] = useState("all");
  const [selectedCondition, setSelectedCondition] = useState("all");
  const [selectedBrands, setSelectedBrands] = useState<{ [key: string]: boolean }>({});
  const [selectedModels, setSelectedModels] = useState<{ [key: string]: boolean }>({});

  // New state
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [yearMin, setYearMin] = useState("");
  const [yearMax, setYearMax] = useState("");
  const [selectedTransmission, setSelectedTransmission] = useState("all");
  const [selectedFuel, setSelectedFuel] = useState("all");
  const [kmMin, setKmMin] = useState("");
  const [kmMax, setKmMax] = useState("");
  const [offersOnly, setOffersOnly] = useState(false);

  // Initialize from URL
  useEffect(() => {
    const bodyParam = searchParams.get("body");
    const brandParam = searchParams.get("brand");
    const categoryParam = searchParams.get("category");
    const transParam = searchParams.get("transmission");
    const fuelParam = searchParams.get("fuel");
    const offersParam = searchParams.get("isOffer");
    
    if (bodyParam) setSelectedBody(bodyParam);
    if (categoryParam) setSelectedCondition(categoryParam);
    if (transParam) setSelectedTransmission(transParam);
    if (fuelParam) setSelectedFuel(fuelParam);
    if (offersParam === "true") setOffersOnly(true);
    
    if (brandParam) {
      setSelectedBrands(prev => ({ ...prev, [brandParam.toLowerCase()]: true }));
      setOpenBrands(prev => ({ ...prev, [brandParam.toLowerCase()]: true }));
    }
  }, [searchParams]);

  // Event listener for opening offcanvas
  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener("open-offcanvas-filters", handleOpen);
    return () => window.removeEventListener("open-offcanvas-filters", handleOpen);
  }, []);

  // Escape key and body scroll lock
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) setIsOpen(false);
    };
    
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = '';
      window.removeEventListener("keydown", handleKeyDown);
    }
    
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const toggleBrand = (brand: string) => {
    setOpenBrands(prev => ({ ...prev, [brand]: !prev[brand] }));
  };

  const handleApply = () => {
    const currentParams = new URLSearchParams(searchParams.toString());
    
    // Condition
    if (selectedCondition && selectedCondition !== "all") currentParams.set("category", selectedCondition);
    else currentParams.delete("category");
    
    // Body
    if (selectedBody && selectedBody !== "all") currentParams.set("body", selectedBody);
    else currentParams.delete("body");

    // Transmission
    if (selectedTransmission && selectedTransmission !== "all") currentParams.set("transmission", selectedTransmission);
    else currentParams.delete("transmission");

    // Fuel
    if (selectedFuel && selectedFuel !== "all") currentParams.set("fuel", selectedFuel);
    else currentParams.delete("fuel");
    
    // Offers Only
    if (offersOnly) currentParams.set("isOffer", "true");
    else currentParams.delete("isOffer");

    // Brand (single select for now to match old logic)
    const activeBrand = Object.keys(selectedBrands).find(k => selectedBrands[k]);
    if (activeBrand) currentParams.set("brand", activeBrand);
    else currentParams.delete("brand");

    // Other ranges (price, year, km) can be added here if the backend supports them
    if (priceMin) currentParams.set("priceMin", priceMin); else currentParams.delete("priceMin");
    if (priceMax) currentParams.set("priceMax", priceMax); else currentParams.delete("priceMax");
    if (yearMin) currentParams.set("yearMin", yearMin); else currentParams.delete("yearMin");
    if (yearMax) currentParams.set("yearMax", yearMax); else currentParams.delete("yearMax");
    if (kmMin) currentParams.set("kmMin", kmMin); else currentParams.delete("kmMin");
    if (kmMax) currentParams.set("kmMax", kmMax); else currentParams.delete("kmMax");

    // Preserve search query if it exists
    const q = searchParams.get("q");
    if (q) currentParams.set("q", q);

    router.push(`${pathname}?${currentParams.toString()}`, { scroll: false });
    setIsOpen(false);
  };

  const handleClearAll = () => {
    setSelectedCondition("all");
    setSelectedBody("all");
    setSelectedTransmission("all");
    setSelectedFuel("all");
    setSelectedBrands({});
    setSelectedModels({});
    setPriceMin("");
    setPriceMax("");
    setYearMin("");
    setYearMax("");
    setKmMin("");
    setKmMax("");
    setOffersOnly(false);
    
    // Preserve only the search query
    const q = searchParams.get("q");
    const queryStr = q ? `?q=${encodeURIComponent(q)}` : "";
    
    router.push(`${pathname}${queryStr}`, { scroll: false });
    setIsOpen(false);
  };

  return (
    <>
      <div className={`offcanvas-backdrop ${isOpen ? 'open' : ''}`} onClick={() => setIsOpen(false)}></div>
      
      <aside className={`offcanvas-filter ${isOpen ? 'open' : ''}`}>
        <div className="offcanvas-header">
          <h3>Filters</h3>
          <button className="offcanvas-close-btn" onClick={() => setIsOpen(false)}>✕</button>
        </div>
        
        <div className="offcanvas-body">
          {/* Offers Only */}
          <div className="filter-section filter-toggle">
            <label className="toggle-label">
              <span style={{ fontWeight: 600, color: "#dd0000" }}>% Offers Only</span>
              <input type="checkbox" checked={offersOnly} onChange={(e) => setOffersOnly(e.target.checked)} />
              <span className="slider round"></span>
            </label>
          </div>

          {/* Condition */}
          <div className="filter-section">
            <h4>Condition</h4>
            <label className={`radio-label ${selectedCondition === "all" ? "selected-radio" : ""}`}>
              <input type="radio" value="all" checked={selectedCondition === "all"} onChange={() => setSelectedCondition("all")} /> All
            </label>
            <label className={`radio-label ${selectedCondition === "New" ? "selected-radio" : ""}`}>
              <input type="radio" value="New" checked={selectedCondition === "New"} onChange={() => setSelectedCondition("New")} /> New
            </label>
            <label className={`radio-label ${selectedCondition === "Used" ? "selected-radio" : ""}`}>
              <input type="radio" value="Used" checked={selectedCondition === "Used"} onChange={() => setSelectedCondition("Used")} /> Used
            </label>
          </div>

          {/* Price Range */}
          <div className="filter-section">
            <h4>Price Range (EGP)</h4>
            <div className="range-inputs">
              <input type="number" placeholder="Min" value={priceMin} onChange={e => setPriceMin(e.target.value)} />
              <span>-</span>
              <input type="number" placeholder="Max" value={priceMax} onChange={e => setPriceMax(e.target.value)} />
            </div>
          </div>

          {/* Year Range */}
          <div className="filter-section">
            <h4>Year</h4>
            <div className="range-inputs">
              <input type="number" placeholder="From" value={yearMin} onChange={e => setYearMin(e.target.value)} />
              <span>-</span>
              <input type="number" placeholder="To" value={yearMax} onChange={e => setYearMax(e.target.value)} />
            </div>
          </div>

          {/* Kilometer Range */}
          <div className="filter-section">
            <h4>Mileage (KM)</h4>
            <div className="range-inputs">
              <input type="number" placeholder="Min" value={kmMin} onChange={e => setKmMin(e.target.value)} />
              <span>-</span>
              <input type="number" placeholder="Max" value={kmMax} onChange={e => setKmMax(e.target.value)} />
            </div>
          </div>

          {/* Body Style */}
          <div className="filter-section">
            <h4>Body Style</h4>
            {["all", "suv", "sedan", "hatchback", "sport", "convertible", "coupe"].map(body => (
              <label key={body} className={`radio-label ${selectedBody === body ? "selected-radio" : ""}`}>
                <input type="radio" value={body} checked={selectedBody === body} onChange={() => setSelectedBody(body)} /> {body === "all" ? "All Cars" : body.charAt(0).toUpperCase() + body.slice(1)}
              </label>
            ))}
          </div>

          {/* Transmission */}
          <div className="filter-section">
            <h4>Transmission</h4>
            {["all", "Automatic", "Manual"].map(trans => (
              <label key={trans} className={`radio-label ${selectedTransmission === trans ? "selected-radio" : ""}`}>
                <input type="radio" value={trans} checked={selectedTransmission === trans} onChange={() => setSelectedTransmission(trans)} /> {trans === "all" ? "All" : trans}
              </label>
            ))}
          </div>

          {/* Fuel Type */}
          <div className="filter-section">
            <h4>Fuel Type</h4>
            {["all", "Petrol", "Diesel", "Electric", "Hybrid"].map(fuel => (
              <label key={fuel} className={`radio-label ${selectedFuel === fuel ? "selected-radio" : ""}`}>
                <input type="radio" value={fuel} checked={selectedFuel === fuel} onChange={() => setSelectedFuel(fuel)} /> {fuel === "all" ? "All" : fuel}
              </label>
            ))}
          </div>

          {/* Models */}
          <div className="filter-section">
            <h4>Brands & Models</h4>
            <div className="brand-list">
              {/* Nissan */}
              <div className={`brand-item ${openBrands.nissan ? "open" : ""}`}>
                <div className="brand-header" onClick={() => toggleBrand("nissan")}>
                  <input type="checkbox" checked={selectedBrands.nissan || false} onChange={(e) => setSelectedBrands(prev => ({...prev, nissan: e.target.checked}))} onClick={(e) => e.stopPropagation()} />
                  <span className="brand-name">Nissan</span>
                  <span className="arrow">{openBrands.nissan ? "∧" : "∨"}</span>
                </div>
                {openBrands.nissan && (
                  <div className="brand-sub" style={{ display: "flex", flexDirection: "column" }}>
                    {["gtr", "patrol", "sunny", "qashqai", "sentra"].map(m => (
                      <label key={m}><input type="checkbox" checked={selectedModels[`nissan-${m}`] || false} onChange={(e) => setSelectedModels(p => ({...p, [`nissan-${m}`]: e.target.checked}))} /> {m.toUpperCase()}</label>
                    ))}
                  </div>
                )}
              </div>

              {/* BMW */}
              <div className={`brand-item ${openBrands.bmw ? "open" : ""}`}>
                <div className="brand-header" onClick={() => toggleBrand("bmw")}>
                  <input type="checkbox" checked={selectedBrands.bmw || false} onChange={(e) => setSelectedBrands(prev => ({...prev, bmw: e.target.checked}))} onClick={(e) => e.stopPropagation()} />
                  <span className="brand-name">BMW</span>
                  <span className="arrow">{openBrands.bmw ? "∧" : "∨"}</span>
                </div>
                {openBrands.bmw && (
                  <div className="brand-sub" style={{ display: "flex", flexDirection: "column" }}>
                    {["x1", "x4", "x6", "340i", "m4"].map(m => (
                      <label key={m}><input type="checkbox" checked={selectedModels[`bmw-${m}`] || false} onChange={(e) => setSelectedModels(p => ({...p, [`bmw-${m}`]: e.target.checked}))} /> {m.toUpperCase()}</label>
                    ))}
                  </div>
                )}
              </div>

              {/* Toyota */}
              <div className={`brand-item ${openBrands.toyota ? "open" : ""}`}>
                <div className="brand-header" onClick={() => toggleBrand("toyota")}>
                  <input type="checkbox" checked={selectedBrands.toyota || false} onChange={(e) => setSelectedBrands(prev => ({...prev, toyota: e.target.checked}))} onClick={(e) => e.stopPropagation()} />
                  <span className="brand-name">Toyota</span>
                  <span className="arrow">{openBrands.toyota ? "∧" : "∨"}</span>
                </div>
                {openBrands.toyota && (
                  <div className="brand-sub" style={{ display: "flex", flexDirection: "column" }}>
                    {["camry", "corolla", "landcruiser", "yaris"].map(m => (
                      <label key={m}><input type="checkbox" checked={selectedModels[`toyota-${m}`] || false} onChange={(e) => setSelectedModels(p => ({...p, [`toyota-${m}`]: e.target.checked}))} /> {m.charAt(0).toUpperCase() + m.slice(1)}</label>
                    ))}
                  </div>
                )}
              </div>

              {/* Mercedes */}
              <div className={`brand-item ${openBrands.mercedes ? "open" : ""}`}>
                <div className="brand-header" onClick={() => toggleBrand("mercedes")}>
                  <input type="checkbox" checked={selectedBrands.mercedes || false} onChange={(e) => setSelectedBrands(prev => ({...prev, mercedes: e.target.checked}))} onClick={(e) => e.stopPropagation()} />
                  <span className="brand-name">Mercedes</span>
                  <span className="arrow">{openBrands.mercedes ? "∧" : "∨"}</span>
                </div>
                {openBrands.mercedes && (
                  <div className="brand-sub" style={{ display: "flex", flexDirection: "column" }}>
                    {["cclass", "eclass", "gle", "amggt"].map(m => (
                      <label key={m}><input type="checkbox" checked={selectedModels[`mercedes-${m}`] || false} onChange={(e) => setSelectedModels(p => ({...p, [`mercedes-${m}`]: e.target.checked}))} /> {m.toUpperCase()}</label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="offcanvas-footer">
          <button className="clear-btn" onClick={handleClearAll}>Clear All</button>
          <button className="apply-btn" onClick={handleApply}>Apply Filters</button>
        </div>
      </aside>
    </>
  );
}
