"use client";
import React, { useState, useRef, useEffect } from "react";
import PageNavbar from "../../components/PageNavbar";
import { useAuth } from "../../context/AuthContext";
import { usePosts } from "../../context/PostsContext";
import { useRouter } from "next/navigation";
import Link from "next/link";

const modelsData: Record<string, string[]> = {
  BMW: ["X1", "X3", "X4", "X5", "X6", "340i", "M3", "M4", "M5", "730Li"],
  Mercedes: ["C-Class", "E-Class", "S-Class", "GLE", "GLC", "AMG GT", "CLA", "A-Class"],
  Toyota: ["Camry", "Corolla", "Land Cruiser", "Yaris", "RAV4", "Prado", "Hilux"],
  Nissan: ["GTR", "Patrol", "Sunny", "Qashqai", "Sentra", "X-Trail", "Altima", "Juke"],
  Hyundai: ["Tucson", "Elantra", "Santa Fe", "i10", "i20", "Accent", "Sonata"],
  Kia: ["Sportage", "Cerato", "Rio", "Sorento", "Picanto", "Stinger", "Telluride"],
  Volkswagen: ["Golf", "Passat", "Tiguan", "Polo", "Arteon", "T-Roc", "Touareg"],
  Porsche: ["911", "Cayenne", "Macan", "Panamera", "Taycan", "718 Cayman"],
  Renault: ["Duster", "Logan", "Captur", "Symbol", "Megane", "Kadjar"],
  Mitsubishi: ["Lancer", "Outlander", "Eclipse Cross", "ASX", "Pajero", "Galant"],
  Skoda: ["Octavia", "Superb", "Kodiaq", "Karoq", "Fabia", "Scala"],
  Chery: ["Tiggo 4", "Tiggo 7", "Tiggo 8", "Arrizo 5", "Arrizo 6"],
};

const colorMap: Record<string, string> = {
  White: "#ffffff", Black: "#111111", Silver: "#c0c0c0", Gray: "#808080",
  Red: "#dd0000", Blue: "#1a5fd4", Green: "#2a7a2a", Yellow: "#ffe000",
  Orange: "#ff7700", Brown: "#7b4f2e", Beige: "#f5deb3", Other: "#dddddd",
};

export default function SellCar() {
  const { isLoggedIn, userRole } = useAuth();
  const { addListing, updateListing, listings } = usePosts();
  const router = useRouter();

  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Redirect if not a dealer
  if (!isLoggedIn || userRole !== "dealer") {
    if (typeof window !== "undefined") router.push("/dealer-signup");
  }

  const [currentSection, setCurrentSection] = useState(1);
  const [showSuccess, setShowSuccess] = useState(false);

  // Image state — previews (base64) shown in UI; files kept for API upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const imageFilesRef = useRef<File[]>([]);

  // Car details
  const [manufacturer, setManufacturer] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [color, setColor] = useState("");
  const [mileage, setMileage] = useState("");
  const [condition, setCondition] = useState("New");
  const [transmission, setTransmission] = useState("Automatic");
  const [body, setBody] = useState("");
  const [fuel, setFuel] = useState("");
  const [description, setDescription] = useState("");

  // Pricing & contact
  const [price, setPrice] = useState("");
  const [isOffer, setIsOffer] = useState(false);
  const [offerPrice, setOfferPrice] = useState("");
  const [negotiable, setNegotiable] = useState(true);
  const [payments, setPayments] = useState<string[]>([]);
  const [governorate, setGovernorate] = useState("");
  const [district, setDistrict] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const years = Array.from({ length: 36 }, (_, i) => 2025 - i);
  const currentModels = modelsData[manufacturer] || [];

  // Load edit data
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const edit = params.get("edit");
      if (edit) {
        setEditId(edit);
        setIsEditing(true);
      }
    }
  }, []);

  useEffect(() => {
    if (editId && listings.length > 0) {
      const listing = listings.find(l => l.id === editId);
      if (listing) {
        setManufacturer(listing.manufacturer);
        setModel(listing.model);
        setYear(listing.year);
        setColor(listing.color);
        setMileage(listing.mileage.replace(/[^0-9.]/g, ""));
        setCondition(listing.category);
        setTransmission(listing.transmission);
        setBody(listing.body);
        setFuel(listing.fuel);
        setDescription(listing.description);
        setPrice(listing.price.replace(/[^0-9.]/g, ""));
        setIsOffer(listing.isOffer ?? false);
        if (listing.offerPrice) setOfferPrice(listing.offerPrice.replace(/[^0-9.]/g, ""));
        setNegotiable(listing.negotiable);
        setPayments(listing.payments);
        
        const locParts = listing.location.split(",").map(p => p.trim());
        if (locParts.length >= 2) {
          setDistrict(locParts[0]);
          setGovernorate(locParts[1]);
        } else {
          setGovernorate(listing.location);
        }
        setContactPhone(listing.contactPhone);
        setImagePreviews(listing.images?.length ? listing.images : (listing.image ? [listing.image] : []));
      }
    }
  }, [editId, listings]);

  // ── Image handlers ──────────────────────────────────────────
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    const remaining = 10 - imagePreviews.length;
    files.slice(0, remaining).forEach((file) => {
      // Store actual File for upload
      imageFilesRef.current.push(file);
      // Generate base64 preview for the UI
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result)
          setImagePreviews((prev) => [...prev, ev.target!.result as string]);
      };
      reader.readAsDataURL(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = (index: number) => {
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
    imageFilesRef.current = imageFilesRef.current.filter((_, i) => i !== index);
  };

  // ── Payment toggle ───────────────────────────────────────────
  const togglePayment = (val: string) => {
    setPayments((prev) =>
      prev.includes(val) ? prev.filter((p) => p !== val) : [...prev, val]
    );
  };

  // ── Section navigation ───────────────────────────────────────
  const nextSection = (from: number) => {
    const errors: string[] = [];

    if (from === 2) {
      if (!manufacturer)     errors.push("Manufacturer");
      if (!model)            errors.push("Model");
      if (!year)             errors.push("Year");
      if (!color)            errors.push("Color");
      if (!mileage)          errors.push("Mileage");
      if (!body)             errors.push("Body Shape");
      if (!fuel)             errors.push("Fuel Type");
      if (!description.trim()) errors.push("Description");
    }

    if (from === 3) {
      if (!price) errors.push("Original Price");
      if (isOffer) {
        if (!offerPrice) errors.push("Offer Price");
        else if (parseInt(offerPrice) >= parseInt(price)) errors.push("Offer Price must be lower than Original Price");
      }
      if (payments.length === 0) errors.push("At least one Payment Option");
      if (!governorate)      errors.push("Governorate");
      if (!contactPhone.trim()) errors.push("Contact Phone");
    }

    if (errors.length > 0) {
      alert("Please fill: " + errors.join(", "));
      return;
    }

    setCurrentSection(from + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const prevSection = (from: number) => {
    setCurrentSection(from - 1);
  };

  // ── Submit ───────────────────────────────────────────────────
  const submitForm = async () => {
    if (!agreed) {
      alert("Please agree to the Terms & Conditions");
      return;
    }
    setSubmitting(true);
    try {
      const newListing = {
        name: `${manufacturer} ${model}`,
        year,
        category: condition,
        mileage: `${mileage} KM`,
        transmission,
        location: [district, governorate].filter(Boolean).join(", ") || "Egypt",
        price: `${parseInt(price || "0").toLocaleString()} EGP`,
        isOffer,
        offerPrice: isOffer && offerPrice ? `${parseInt(offerPrice || "0").toLocaleString()} EGP` : undefined,
        image: imagePreviews[0] || "",
        link: "", // The API mapApiPostToListing will generate the real dynamic link
        manufacturer,
        model,
        body,
        fuel,
        color,
        description,
        negotiable,
        payments,
        contactPhone,
      };
      if (isEditing && editId) {
        await updateListing(editId, newListing, imageFilesRef.current);
      } else {
        await addListing(newListing, imageFilesRef.current);
      }
      setShowSuccess(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e: any) {
      alert("" + (e.message || "Failed to publish listing. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setImagePreviews([]);
    imageFilesRef.current = [];
    setManufacturer(""); setModel(""); setYear(""); setColor("");
    setMileage(""); setCondition("New"); setTransmission("Automatic");
    setBody(""); setFuel(""); setDescription("");
    setPrice(""); setIsOffer(false); setOfferPrice(""); setNegotiable(true); setPayments([]);
    setGovernorate(""); setDistrict(""); setContactPhone("");
    setAgreed(false); setShowSuccess(false); setCurrentSection(1);
  };

  return (
    <>
      <PageNavbar />

      {!showSuccess && (
        <div className="page-header">
          <div className="ph-left">
            <h1>{isEditing ? "Edit Your Car" : "Sell Your Car"}</h1>
            <p>Fill in the details below and reach thousands of buyers</p>
          </div>
          <div className="ph-steps">
            <div className={`step ${currentSection === 1 ? "active" : currentSection > 1 ? "done" : ""}`}><span>1</span><small>Photos</small></div>
            <div className="step-line"></div>
            <div className={`step ${currentSection === 2 ? "active" : currentSection > 2 ? "done" : ""}`}><span>2</span><small>Details</small></div>
            <div className="step-line"></div>
            <div className={`step ${currentSection === 3 ? "active" : currentSection > 3 ? "done" : ""}`}><span>3</span><small>Pricing</small></div>
            <div className="step-line"></div>
            <div className={`step ${currentSection === 4 ? "active" : currentSection > 4 ? "done" : ""}`}><span>4</span><small>Review</small></div>
          </div>
        </div>
      )}

      <div className="form-wrapper">

        {/* SUCCESS */}
        {showSuccess && (
          <div className="success-screen">
            <div className="success-icon"></div>
            <h2>{isEditing ? "Listing Updated!" : "Listing Published!"}</h2>
            <p>Your car has been {isEditing ? "updated" : "listed"} successfully. Buyers can now find it on Auto Hub.</p>
            <div className="success-actions">
              <Link href="/" className="btn-next">Go to Home</Link>
              <button className="btn-back" onClick={resetForm}>List Another Car</button>
            </div>
          </div>
        )}

        {/* SECTION 1 — Photos */}
        {!showSuccess && currentSection === 1 && (
          <div className="form-section">
            <div className="section-head">
              <div className="sec-num">1</div>
              <div><h2>Car Photos</h2><p>Upload up to 10 photos. First photo will be the cover.</p></div>
            </div>

            <div className="upload-area" onClick={() => fileInputRef.current?.click()}>
              <input type="file" ref={fileInputRef} multiple accept="image/*" style={{ display: "none" }} onChange={handleImageUpload} />
              <div className="upload-icon"></div>
              <div className="upload-text">Click to upload photos</div>
              <div className="upload-sub">JPG, PNG, WEBP · Max 10 photos</div>
            </div>

            <div className="img-preview-grid">
              {imagePreviews.map((src, i) => (
                <div key={i} className="prev-img">
                  <img loading="lazy" src={src} alt={`car photo ${i + 1}`} />
                  {i === 0 && <div className="cover-badge">Cover</div>}
                  <button className="del-btn" onClick={() => removeImage(i)}></button>
                </div>
              ))}
            </div>

            <div className="section-nav">
              <div></div>
              <button className="btn-next" onClick={() => nextSection(1)}>Next: Car Details →</button>
            </div>
          </div>
        )}

        {/* SECTION 2 — Car Details */}
        {!showSuccess && currentSection === 2 && (
          <div className="form-section">
            <div className="section-head">
              <div className="sec-num">2</div>
              <div><h2>Car Details</h2><p>Tell buyers about your car&apos;s specifications.</p></div>
            </div>

            <div className="form-grid">
              <div className="field">
                <label>Manufacturer <span className="req">*</span></label>
                <select value={manufacturer} onChange={(e) => { setManufacturer(e.target.value); setModel(""); }}>
                  <option value="">Select Manufacturer</option>
                  {Object.keys(modelsData).map(m => <option key={m}>{m}</option>)}
                </select>
              </div>

              <div className="field">
                <label>Model <span className="req">*</span></label>
                <select value={model} onChange={(e) => setModel(e.target.value)}>
                  <option value="">{manufacturer ? "Select Model" : "Select Manufacturer first"}</option>
                  {currentModels.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>

              <div className="field">
                <label>Year <span className="req">*</span></label>
                <select value={year} onChange={(e) => setYear(e.target.value)}>
                  <option value="">Select Year</option>
                  {years.map(y => <option key={y}>{y}</option>)}
                </select>
              </div>

              <div className="field">
                <label>Color <span className="req">*</span></label>
                <div className="color-wrap">
                  <select value={color} onChange={(e) => setColor(e.target.value)}>
                    <option value="">Select Color</option>
                    {Object.keys(colorMap).map(c => <option key={c}>{c}</option>)}
                  </select>
                  <div className="color-dot" style={{ background: colorMap[color] || "transparent", border: color === "White" ? "2px solid #ccc" : "2px solid #ddd" }}></div>
                </div>
              </div>

              <div className="field">
                <label>Mileage (KM) <span className="req">*</span></label>
                <div className="input-wrap">
                  <input type="number" placeholder="e.g. 50000" min="0" value={mileage} onChange={(e) => setMileage(e.target.value)} />
                  <span className="suffix">KM</span>
                </div>
              </div>

              <div className="field">
                <label>Condition <span className="req">*</span></label>
                <div className="toggle-group">
                  <button className={`tgl ${condition === "New" ? "active" : ""}`} onClick={() => setCondition("New")}>New</button>
                  <button className={`tgl ${condition === "Used" ? "active" : ""}`} onClick={() => setCondition("Used")}>Used</button>
                </div>
              </div>

              <div className="field full">
                <label>Transmission <span className="req">*</span></label>
                <div className="radio-cards">
                  {["Automatic", "Manual", "Dual Clutch", "CVT"].map(t => (
                    <label key={t} className={`rcard ${transmission === t ? "active" : ""}`}>
                      <input type="radio" name="transmission" value={t} checked={transmission === t} onChange={() => setTransmission(t)} />
                      {t}
                    </label>
                  ))}
                </div>
              </div>

              <div className="field full">
                <label>Body Shape <span className="req">*</span></label>
                <div className="radio-cards">
                  {["Sedan", "SUV", "Coupe", "Hatchback", "Convertible", "Sport"].map(b => (
                    <label key={b} className={`rcard ${body === b ? "active" : ""}`}>
                      <input type="radio" name="body" value={b} checked={body === b} onChange={() => setBody(b)} />
                      {b}
                    </label>
                  ))}
                </div>
              </div>

              <div className="field full">
                <label>Fuel Type <span className="req">*</span></label>
                <div className="radio-cards">
                  {["Petrol", "Diesel", "Electric", "Hybrid"].map(f => (
                    <label key={f} className={`rcard ${fuel === f ? "active" : ""}`}>
                      <input type="radio" name="fuel" value={f} checked={fuel === f} onChange={() => setFuel(f)} />
                      {f}
                    </label>
                  ))}
                </div>
              </div>

              <div className="field full">
                <label>Description <span className="req">*</span></label>
                <textarea placeholder="Describe your car..." rows={5} value={description} onChange={(e) => setDescription(e.target.value.slice(0, 1000))} />
                <div className="char-count"><span>{description.length}</span> / 1000</div>
              </div>
            </div>

            <div className="section-nav">
              <button className="btn-back" onClick={() => prevSection(2)}>← Back</button>
              <button className="btn-next" onClick={() => nextSection(2)}>Next: Pricing →</button>
            </div>
          </div>
        )}

        {/* SECTION 3 — Pricing & Contact */}
        {!showSuccess && currentSection === 3 && (
          <div className="form-section">
            <div className="section-head">
              <div className="sec-num">3</div>
              <div><h2>Pricing &amp; Contact</h2><p>Set your price, payment methods, and contact info.</p></div>
            </div>

            <div className="form-grid">
              <div className="field">
                <label>Asking Price (EGP) <span className="req">*</span></label>
                <div className="input-wrap">
                  <span className="prefix">EGP</span>
                  <input type="number" placeholder="e.g. 1000000" min="0" value={price} onChange={(e) => setPrice(e.target.value)} />
                </div>
                <div className="price-display">{price ? parseInt(price).toLocaleString("en-EG") + " EGP" : ""}</div>
              </div>

              <div className="field">
                <label>Offer / Discount Price</label>
                <div className="toggle-group">
                  <button className={`tgl ${isOffer ? "active" : ""}`} onClick={() => setIsOffer(true)}>Enabled</button>
                  <button className={`tgl ${!isOffer ? "active" : ""}`} onClick={() => setIsOffer(false)}>Disabled</button>
                </div>
              </div>

              {isOffer && (
                <div className="field">
                  <label>Offer Price (EGP) <span className="req">*</span></label>
                  <div className="input-wrap">
                    <span className="prefix">EGP</span>
                    <input type="number" placeholder="e.g. 950000" min="0" value={offerPrice} onChange={(e) => setOfferPrice(e.target.value)} />
                  </div>
                  <div className="price-display" style={{ color: "#dd0000" }}>{offerPrice ? parseInt(offerPrice).toLocaleString("en-EG") + " EGP" : ""}</div>
                </div>
              )}

              <div className="field">
                <label>Is the price negotiable?</label>
                <div className="toggle-group">
                  <button className={`tgl ${negotiable ? "active" : ""}`} onClick={() => setNegotiable(true)}>Yes</button>
                  <button className={`tgl ${!negotiable ? "active" : ""}`} onClick={() => setNegotiable(false)}>No</button>
                </div>
              </div>

              <div className="field full">
                <label>Accepted Payment Options <span className="req">*</span></label>
                <div className="check-cards">
                  {["Cash", "Installment", "Bank Transfer"].map(p => (
                    <label key={p} className={`ccard ${payments.includes(p) ? "active" : ""}`}>
                      <input type="checkbox" checked={payments.includes(p)} onChange={() => togglePayment(p)} />
                      {p}
                    </label>
                  ))}
                </div>
              </div>

              <div className="field full">
                <label>Car Location <span className="req">*</span></label>
                <div className="two-col">
                  <select value={governorate} onChange={(e) => setGovernorate(e.target.value)}>
                    <option value="">Governorate</option>
                    {["Cairo", "Giza", "Alexandria", "Qalyubia", "Sharqia", "Dakahlia", "Suez", "Port Said", "Aswan", "Luxor"].map(g => <option key={g}>{g}</option>)}
                  </select>
                  <input type="text" placeholder="District / Area (e.g. 6 October)" value={district} onChange={(e) => setDistrict(e.target.value)} />
                </div>
              </div>

              <div className="field full">
                <label>Contact Phone <span className="req">*</span></label>
                <div className="input-wrap">
                  <span className="prefix"></span>
                  <input type="tel" placeholder="e.g. +20 100 123 4567" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="section-nav">
              <button className="btn-back" onClick={() => prevSection(3)}>← Back</button>
              <button className="btn-next" onClick={() => nextSection(3)}>Review Listing →</button>
            </div>
          </div>
        )}

        {/* SECTION 4 — Review */}
        {!showSuccess && currentSection === 4 && (
          <div className="form-section">
            <div className="section-head">
              <div className="sec-num">4</div>
              <div><h2>Review Your Listing</h2><p>Check everything before publishing.</p></div>
            </div>

            <div className="review-grid">
              {[
                { label: "Manufacturer", val: manufacturer },
                { label: "Model",        val: model },
                { label: "Year",         val: year },
                { label: "Color",        val: color },
                { label: "Mileage",      val: mileage + " KM" },
                { label: "Condition",    val: condition },
                { label: "Transmission", val: transmission },
                { label: "Body Shape",   val: body },
                { label: "Fuel Type",    val: fuel },
                { label: "Original Price", val: parseInt(price || "0").toLocaleString() + " EGP" },
                ...(isOffer ? [{ label: "Offer Price", val: parseInt(offerPrice || "0").toLocaleString() + " EGP", highlight: true }] : []),
                { label: "Negotiable",   val: negotiable ? "Yes" : "No" },
                { label: "Payment",      val: payments.join(", ") },
                { label: "Location",     val: [district, governorate].filter(Boolean).join(", ") || "—" },
                { label: "Contact Phone", val: contactPhone },
              ].map((it, idx) => (
                <div key={idx} className="review-card">
                  <div className="rc-label">{it.label}</div>
                  <div className="rc-val" style={it.highlight ? { color: "#dd0000", fontWeight: "bold" } : {}}>{it.val || "—"}</div>
                </div>
              ))}

              <div className="review-card full">
                <div className="rc-label">Description</div>
                <div className="rc-val" style={{ fontWeight: 400, fontSize: "0.85rem", lineHeight: 1.6 }}>{description}</div>
              </div>

              {imagePreviews.length > 0 && (
                <div className="review-card full">
                  <div className="rc-label">Photos ({imagePreviews.length})</div>
                  <div className="review-imgs">
                    {imagePreviews.map((src, idx) => <img loading="lazy" key={idx} src={src} alt="photo" />)}
                  </div>
                </div>
              )}
            </div>

            <div className="agree-row">
              <label className="agree-label">
                <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
                I confirm all information is accurate and agree to Auto Hub&apos;s <Link href="#">Terms &amp; Conditions</Link>.
              </label>
            </div>

            <div className="section-nav">
              <button className="btn-back" onClick={() => prevSection(4)}>← Edit</button>
              <button className="btn-submit" onClick={submitForm} disabled={submitting}>
                {submitting ? (isEditing ? "Updating..." : "Publishing...") : (isEditing ? "Update Listing" : "Publish Listing")}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
