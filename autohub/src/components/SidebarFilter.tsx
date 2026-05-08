"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function SidebarFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [openBrands, setOpenBrands] = useState<{ [key: string]: boolean }>({
    nissan: true,
  });

  const [selectedBody, setSelectedBody] = useState("all");
  const [selectedCondition, setSelectedCondition] = useState("all");
  const [selectedBrands, setSelectedBrands] = useState<{ [key: string]: boolean }>({});
  const [selectedModels, setSelectedModels] = useState<{ [key: string]: boolean }>({});

  const toggleBrand = (brand: string) => {
    setOpenBrands((prev) => ({
      ...prev,
      [brand]: !prev[brand],
    }));
  };

  const handleBodyChange = (bodyType: string) => {
    setSelectedBody(bodyType);
    updateUrl({ body: bodyType });
  };

  const handleConditionChange = (condition: string) => {
    setSelectedCondition(condition);
    updateUrl({ category: condition });
  };

  const handleBrandChange = (brand: string, checked: boolean) => {
    setSelectedBrands((prev) => ({
      ...prev,
      [brand]: checked,
    }));
    updateUrl({ brand: checked ? brand : undefined });
  };

  const handleModelChange = (model: string, checked: boolean) => {
    setSelectedModels((prev) => ({
      ...prev,
      [model]: checked,
    }));
  };

  const updateUrl = (params: { body?: string; brand?: string; category?: string }) => {
    const currentParams = new URLSearchParams(searchParams.toString());
    
    if (params.body) {
      if (params.body === "all") {
        currentParams.delete("body");
      } else {
        currentParams.set("body", params.body);
      }
    }
    
    if (params.category) {
      if (params.category === "all") {
        currentParams.delete("category");
      } else {
        currentParams.set("category", params.category);
      }
    }
    
    if (params.brand) {
      currentParams.set("brand", params.brand);
    } else if (params.brand === undefined) {
      currentParams.delete("brand");
    }
    
    router.push(`/marketplace?${currentParams.toString()}`, { scroll: false });
  };

  // Initialize state from URL params
  useEffect(() => {
    const bodyParam = searchParams.get("body");
    const brandParam = searchParams.get("brand");
    const categoryParam = searchParams.get("category");
    
    if (bodyParam) {
      setSelectedBody(bodyParam);
    }
    
    if (categoryParam) {
      setSelectedCondition(categoryParam);
    }
    
    if (brandParam) {
      setSelectedBrands((prev) => ({
        ...prev,
        [brandParam.toLowerCase()]: true,
      }));
      setOpenBrands((prev) => ({
        ...prev,
        [brandParam.toLowerCase()]: true,
      }));
    }
  }, [searchParams]);

  return (
    <aside className="sidebar" id="sidebar">
      {/* Condition */}
      <div className="filter-section">
        <h4>Condition</h4>
        <label className={`radio-label ${selectedCondition === "all" ? "selected-radio" : ""}`}>
          <input type="radio" name="condition" value="all" checked={selectedCondition === "all"} onChange={() => handleConditionChange("all")} /> All
        </label>
        <label className={`radio-label ${selectedCondition === "New" ? "selected-radio" : ""}`}>
          <input type="radio" name="condition" value="New" checked={selectedCondition === "New"} onChange={() => handleConditionChange("New")} /> New
        </label>
        <label className={`radio-label ${selectedCondition === "Used" ? "selected-radio" : ""}`}>
          <input type="radio" name="condition" value="Used" checked={selectedCondition === "Used"} onChange={() => handleConditionChange("Used")} /> Used
        </label>
      </div>

      {/* Body Style */}
      <div className="filter-section">
        <h4>Body Style</h4>
        <label className={`radio-label ${selectedBody === "all" ? "selected-radio" : ""}`}>
          <input type="radio" name="body" value="all" checked={selectedBody === "all"} onChange={() => handleBodyChange("all")} /> All Cars
        </label>
        <label className={`radio-label ${selectedBody === "suv" ? "selected-radio" : ""}`}>
          <input type="radio" name="body" value="suv" checked={selectedBody === "suv"} onChange={() => handleBodyChange("suv")} /> SUVs
        </label>
        <label className={`radio-label ${selectedBody === "sedan" ? "selected-radio" : ""}`}>
          <input type="radio" name="body" value="sedan" checked={selectedBody === "sedan"} onChange={() => handleBodyChange("sedan")} /> Sedan
        </label>
        <label className={`radio-label ${selectedBody === "hatchback" ? "selected-radio" : ""}`}>
          <input type="radio" name="body" value="hatchback" checked={selectedBody === "hatchback"} onChange={() => handleBodyChange("hatchback")} /> Hatchback
        </label>
        <label className={`radio-label ${selectedBody === "sport" ? "selected-radio" : ""}`}>
          <input type="radio" name="body" value="sport" checked={selectedBody === "sport"} onChange={() => handleBodyChange("sport")} /> Sport
        </label>
        <label className={`radio-label ${selectedBody === "convertible" ? "selected-radio" : ""}`}>
          <input type="radio" name="body" value="convertible" checked={selectedBody === "convertible"} onChange={() => handleBodyChange("convertible")} /> convertible
        </label>
        <label className={`radio-label ${selectedBody === "coupe" ? "selected-radio" : ""}`}>
          <input type="radio" name="body" value="coupe" checked={selectedBody === "coupe"} onChange={() => handleBodyChange("coupe")} /> Coupe
        </label>
      </div>

      {/* Models */}
      <div className="filter-section">
        <h4>Models</h4>
        <div className="brand-list">
          {/* Nissan */}
          <div className={`brand-item ${openBrands.nissan ? "open" : ""}`} id="brand-nissan">
            <div className="brand-header" onClick={() => toggleBrand("nissan")}>
              <input type="checkbox" checked={selectedBrands.nissan || false} onChange={(e) => handleBrandChange("nissan", e.target.checked)} onClick={(e) => e.stopPropagation()} />
              <span className="brand-icon">
                <svg viewBox="0 0 40 20" width="22" height="11">
                  <ellipse cx="20" cy="10" rx="19" ry="9" fill="none" stroke="#333" strokeWidth="2" />
                  <rect x="1" y="8.5" width="38" height="3" fill="#333" rx="1" />
                </svg>
              </span>
              <span className="brand-name">Nissan</span>
              <span className="arrow">{openBrands.nissan ? "∧" : "∨"}</span>
            </div>
            {openBrands.nissan && (
              <div className="brand-sub" style={{ display: "flex", flexDirection: "column" }}>
                <label><input type="checkbox" checked={selectedModels["nissan-gtr"] || false} onChange={(e) => handleModelChange("nissan-gtr", e.target.checked)} /> GTR</label>
                <label><input type="checkbox" checked={selectedModels["nissan-patrol"] || false} onChange={(e) => handleModelChange("nissan-patrol", e.target.checked)} /> Patrol</label>
                <label><input type="checkbox" checked={selectedModels["nissan-sunny"] || false} onChange={(e) => handleModelChange("nissan-sunny", e.target.checked)} /> Sunny</label>
                <label><input type="checkbox" checked={selectedModels["nissan-qashqai"] || false} onChange={(e) => handleModelChange("nissan-qashqai", e.target.checked)} /> Qashqai</label>
                <label><input type="checkbox" checked={selectedModels["nissan-sentra"] || false} onChange={(e) => handleModelChange("nissan-sentra", e.target.checked)} /> Sentra</label>
              </div>
            )}
          </div>

          {/* BMW */}
          <div className={`brand-item ${openBrands.bmw ? "open" : ""}`} id="brand-bmw">
            <div className="brand-header" onClick={() => toggleBrand("bmw")}>
              <input type="checkbox" checked={selectedBrands.bmw || false} onChange={(e) => handleBrandChange("bmw", e.target.checked)} onClick={(e) => e.stopPropagation()} />
              <span className="brand-icon">⊛</span>
              <span className="brand-name">BMW</span>
              <span className="arrow">{openBrands.bmw ? "∧" : "∨"}</span>
            </div>
            {openBrands.bmw && (
              <div className="brand-sub" style={{ display: "flex", flexDirection: "column" }}>
                <label><input type="checkbox" checked={selectedModels["bmw-x1"] || false} onChange={(e) => handleModelChange("bmw-x1", e.target.checked)} /> X1</label>
                <label><input type="checkbox" checked={selectedModels["bmw-x4"] || false} onChange={(e) => handleModelChange("bmw-x4", e.target.checked)} /> X4</label>
                <label><input type="checkbox" checked={selectedModels["bmw-x6"] || false} onChange={(e) => handleModelChange("bmw-x6", e.target.checked)} /> X6</label>
                <label><input type="checkbox" checked={selectedModels["bmw-340i"] || false} onChange={(e) => handleModelChange("bmw-340i", e.target.checked)} /> 340i</label>
                <label><input type="checkbox" checked={selectedModels["bmw-m4"] || false} onChange={(e) => handleModelChange("bmw-m4", e.target.checked)} /> M4</label>
              </div>
            )}
          </div>

          {/* Toyota */}
          <div className={`brand-item ${openBrands.toyota ? "open" : ""}`} id="brand-toyota">
            <div className="brand-header" onClick={() => toggleBrand("toyota")}>
              <input type="checkbox" checked={selectedBrands.toyota || false} onChange={(e) => handleBrandChange("toyota", e.target.checked)} onClick={(e) => e.stopPropagation()} />
              <span className="brand-icon">⊛</span>
              <span className="brand-name">Toyota</span>
              <span className="arrow">{openBrands.toyota ? "∧" : "∨"}</span>
            </div>
            {openBrands.toyota && (
              <div className="brand-sub" style={{ display: "flex", flexDirection: "column" }}>
                <label><input type="checkbox" checked={selectedModels["toyota-camry"] || false} onChange={(e) => handleModelChange("toyota-camry", e.target.checked)} /> Camry</label>
                <label><input type="checkbox" checked={selectedModels["toyota-corolla"] || false} onChange={(e) => handleModelChange("toyota-corolla", e.target.checked)} /> Corolla</label>
                <label><input type="checkbox" checked={selectedModels["toyota-landcruiser"] || false} onChange={(e) => handleModelChange("toyota-landcruiser", e.target.checked)} /> Land Cruiser</label>
                <label><input type="checkbox" checked={selectedModels["toyota-yaris"] || false} onChange={(e) => handleModelChange("toyota-yaris", e.target.checked)} /> Yaris</label>
              </div>
            )}
          </div>

          {/* Mercedes */}
          <div className={`brand-item ${openBrands.mercedes ? "open" : ""}`} id="brand-mercedes">
            <div className="brand-header" onClick={() => toggleBrand("mercedes")}>
              <input type="checkbox" checked={selectedBrands.mercedes || false} onChange={(e) => handleBrandChange("mercedes", e.target.checked)} onClick={(e) => e.stopPropagation()} />
              <span className="brand-icon">⊛</span>
              <span className="brand-name">Mercedes</span>
              <span className="arrow">{openBrands.mercedes ? "∧" : "∨"}</span>
            </div>
            {openBrands.mercedes && (
              <div className="brand-sub" style={{ display: "flex", flexDirection: "column" }}>
                <label><input type="checkbox" checked={selectedModels["mercedes-cclass"] || false} onChange={(e) => handleModelChange("mercedes-cclass", e.target.checked)} /> C-Class</label>
                <label><input type="checkbox" checked={selectedModels["mercedes-eclass"] || false} onChange={(e) => handleModelChange("mercedes-eclass", e.target.checked)} /> E-Class</label>
                <label><input type="checkbox" checked={selectedModels["mercedes-gle"] || false} onChange={(e) => handleModelChange("mercedes-gle", e.target.checked)} /> GLE</label>
                <label><input type="checkbox" checked={selectedModels["mercedes-amggt"] || false} onChange={(e) => handleModelChange("mercedes-amggt", e.target.checked)} /> AMG GT</label>
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
