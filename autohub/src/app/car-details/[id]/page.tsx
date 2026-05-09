"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import PageNavbar from "../../../components/PageNavbar";
import { useParams } from "next/navigation";
import { getListingById } from "../../../lib/api";
import { Listing } from "../../../context/PostsContext";
import { useSavedCars } from "../../../context/SavedCarsContext";
import Link from "next/link";

/* ─── Skeleton ──────────────────────────────────────────────── */
function Skeleton() {
  return (
    <>
      <PageNavbar />
      <div className="cd-skeleton">
        <div className="cd-sk-hero" />
        <div className="cd-sk-strip" />
        <div className="cd-sk-body">
          <div className="cd-sk-left">
            <div className="cd-sk-block tall" />
            <div className="cd-sk-block" />
            <div className="cd-sk-block" />
          </div>
          <div className="cd-sk-right">
            <div className="cd-sk-block" />
            <div className="cd-sk-block" />
            <div className="cd-sk-block short" />
          </div>
        </div>
      </div>
    </>
  );
}

/* ─── Main Page ─────────────────────────────────────────────── */
export default function CarDetails() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id ?? "";

  const [car, setCar] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [curImg, setCurImg] = useState(0);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const { isSaved, toggleSave } = useSavedCars();
  const bannerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const autoRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!id) return;
    getListingById(id)
      .then((data: Listing) => setCar(data))
      .catch((err: any) => setError(err.message || "Car not found"))
      .finally(() => setLoading(false));
  }, [id]);

  // Derive images array
  const images: string[] =
    car?.images && car.images.length > 0
      ? car.images
      : car?.image
      ? [car.image]
      : [];

  const goTo = useCallback(
    (i: number) => setCurImg((i + images.length) % images.length),
    [images.length]
  );
  const slide = useCallback((dir: number) => goTo(curImg + dir), [curImg, goTo]);

  // Autoplay
  useEffect(() => {
    if (images.length <= 1) return;
    autoRef.current = setInterval(() => slide(1), 4500);
    return () => { if (autoRef.current) clearInterval(autoRef.current); };
  }, [slide, images.length]);

  const pauseAuto = () => { if (autoRef.current) clearInterval(autoRef.current); };
  const resumeAuto = () => {
    if (images.length <= 1) return;
    autoRef.current = setInterval(() => slide(1), 4500);
  };

  // Keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") slide(-1);
      if (e.key === "ArrowRight") slide(1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [slide]);

  // Touch swipe
  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) slide(diff > 0 ? 1 : -1);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const shareWhatsApp = () => {
    if (!car) return;
    const phone = (car.dealerPhone || car.contactPhone)?.replace(/\D/g, "");
    const text = encodeURIComponent(`Hi, I'm interested in your listing: ${car.name} ${car.year} — ${car.price}\n${window.location.href}`);
    window.open(phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`, "_blank");
  };

  // Lightbox helpers
  const openLightbox = (idx: number) => {
    setLightboxIdx(idx);
    document.body.style.overflow = "hidden";
  };
  const closeLightbox = () => {
    setLightboxIdx(null);
    document.body.style.overflow = "";
  };
  const lbNext = () => setLightboxIdx((i) => i !== null ? (i + 1) % images.length : 0);
  const lbPrev = () => setLightboxIdx((i) => i !== null ? (i - 1 + images.length) % images.length : 0);

  // Keyboard for lightbox
  useEffect(() => {
    if (lightboxIdx === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape")      closeLightbox();
      if (e.key === "ArrowRight")  lbNext();
      if (e.key === "ArrowLeft")   lbPrev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightboxIdx, images.length]);

  // ── States ──────────────────────────────────────────────────
  if (loading) return <Skeleton />;

  if (error || !car) {
    return (
      <>
        <PageNavbar />
        <div className="cd-error">
          <div className="cd-error-icon">🚗</div>
          <h2>{error || "Car not found"}</h2>
          <Link href="/" className="cd-back-btn">← Back to Home</Link>
        </div>
      </>
    );
  }

  const paymentNote =
    [car.negotiable ? "Negotiable" : "", ...(car.payments ?? [])]
      .filter(Boolean)
      .join(" · ") || "Fixed Price";

  const sellerName = car.dealerName || `${car.manufacturer} Dealer`;
  const sellerInitial = sellerName.charAt(0).toUpperCase() || "S";
  const displayPhone = car.dealerPhone || car.contactPhone;

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
    <>
      <PageNavbar />

      {/* ── HERO BANNER ─────────────────────────────────────── */}
      <div
        className="cd-hero-banner"
        ref={bannerRef}
        onMouseEnter={pauseAuto}
        onMouseLeave={resumeAuto}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* Background image — click to open lightbox */}
        {images.length > 0 ? (
          <img
            key={curImg}
            src={images[curImg]}
            alt={car.name}
            className="cd-hero-img cd-hero-img-clickable"
            onClick={() => openLightbox(curImg)}
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <div className="cd-hero-no-img">
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1">
              <rect x="2" y="7" width="20" height="11" rx="2"/><path d="M4 7l2-3h12l2 3"/>
              <circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>
            </svg>
          </div>
        )}

        {/* Overlay */}
        <div className="cd-hero-overlay">
          <div className="cd-hero-tags">
            {car.category && <span className="cd-htag">{car.category}</span>}
            {car.year && <span className="cd-htag cd-htag-blue">{car.year}</span>}
            {car.transmission && <span className="cd-htag">{car.transmission}</span>}
          </div>
          <h1 className="cd-hero-title">
            {car.manufacturer} <span>{car.model}</span>
          </h1>
          <p className="cd-hero-sub">
            {[car.body, car.location].filter(Boolean).join("  ·  ")}
          </p>
          <div className="cd-hero-price">
            {car.isOffer && car.offerPrice ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ textDecoration: 'line-through', opacity: 0.7, fontSize: '0.7em', color: 'white' }}>{car.price}</span>
                <span>{car.offerPrice}</span>
                {discountPercent > 0 && (
                  <span style={{ background: '#dd0000', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '0.5em', fontWeight: 'bold' }}>
                    {discountPercent}% OFF
                  </span>
                )}
              </div>
            ) : (
              car.price
            )}
          </div>
        </div>

        {/* Arrows */}
        {images.length > 1 && (
          <>
            <button className="cd-harr cd-harr-left" onClick={() => slide(-1)} aria-label="Previous image">&#8592;</button>
            <button className="cd-harr cd-harr-right" onClick={() => slide(1)} aria-label="Next image">&#8594;</button>
            <div className="cd-hcounter">{curImg + 1} / {images.length}</div>
          </>
        )}
      </div>

      {/* ── THUMBNAIL STRIP ──────────────────────────────────── */}
      {images.length > 1 && (
        <div className="cd-thumb-strip">
          {images.map((src, i) => (
            <div
              key={i}
              className={`cd-tthumb${i === curImg ? " active" : ""}`}
              onClick={() => { goTo(i); openLightbox(i); }}
              title="Click to view full size"
            >
              <img src={src} alt={`View ${i + 1}`} onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "0"; }} />
            </div>
          ))}
        </div>
      )}

      {/* ── CONTENT GRID ─────────────────────────────────────── */}
      <div className="cd-content-grid">

        {/* ══ LEFT COLUMN ══════════════════════════════════════ */}
        <div className="cd-col-left">

          {/* Quick facts bar */}
          <div className="cd-facts-bar">
            {car.mileage && (
              <><div className="cd-fact"><span className="cd-fi">🔄</span><div><div className="cd-fv">{car.mileage}</div><div className="cd-fl">Mileage</div></div></div><div className="cd-fsep" /></>
            )}
            {car.transmission && (
              <><div className="cd-fact"><span className="cd-fi">⚙️</span><div><div className="cd-fv">{car.transmission}</div><div className="cd-fl">Transmission</div></div></div><div className="cd-fsep" /></>
            )}
            {car.fuel && (
              <><div className="cd-fact"><span className="cd-fi">⛽</span><div><div className="cd-fv">{car.fuel}</div><div className="cd-fl">Fuel</div></div></div><div className="cd-fsep" /></>
            )}
            {car.color && (
              <><div className="cd-fact"><span className="cd-fi">🎨</span><div><div className="cd-fv">{car.color}</div><div className="cd-fl">Color</div></div></div><div className="cd-fsep" /></>
            )}
            {car.body && (
              <div className="cd-fact"><span className="cd-fi">🚗</span><div><div className="cd-fv">{car.body}</div><div className="cd-fl">Body</div></div></div>
            )}
          </div>

          {/* About */}
          <div className="cd-scard">
            <div className="cd-stitle"><span className="cd-sline" />About this Car</div>
            <p className="cd-desc">{car.description || "No description provided for this listing."}</p>
          </div>

          {/* Specifications */}
          <div className="cd-scard">
            <div className="cd-stitle"><span className="cd-sline" />Specifications</div>
            <div className="cd-spec-table">
              {car.body       && <div className="cd-sr"><span className="cd-sk">🚗 Body Shape</span><span className="cd-sv">{car.body}</span></div>}
              {car.fuel       && <div className="cd-sr"><span className="cd-sk">⛽ Fuel Type</span><span className="cd-sv">{car.fuel}</span></div>}
              {car.transmission && <div className="cd-sr"><span className="cd-sk">⚙️ Transmission</span><span className="cd-sv">{car.transmission}</span></div>}
              {car.color      && <div className="cd-sr"><span className="cd-sk">🎨 Color</span><span className="cd-sv">{car.color}</span></div>}
              {car.year       && <div className="cd-sr"><span className="cd-sk">📅 Year</span><span className="cd-sv">{car.year}</span></div>}
              {car.manufacturer && <div className="cd-sr"><span className="cd-sk">🏭 Brand</span><span className="cd-sv">{car.manufacturer}</span></div>}
              {car.model      && <div className="cd-sr"><span className="cd-sk">🏷️ Model</span><span className="cd-sv">{car.model}</span></div>}
              {car.mileage    && <div className="cd-sr"><span className="cd-sk">🔄 Mileage</span><span className="cd-sv">{car.mileage}</span></div>}
              {car.category   && <div className="cd-sr"><span className="cd-sk">📋 Condition</span><span className="cd-sv">{car.category}</span></div>}
              {car.location   && <div className="cd-sr"><span className="cd-sk">📍 Location</span><span className="cd-sv">{car.location}</span></div>}
              {car.payments && car.payments.length > 0 && (
                <div className="cd-sr"><span className="cd-sk">💳 Payment</span><span className="cd-sv">{car.payments.join(", ")}</span></div>
              )}
              <div className="cd-sr"><span className="cd-sk">🤝 Negotiable</span><span className="cd-sv">{car.negotiable ? "Yes" : "No"}</span></div>
            </div>
          </div>

          {/* Listing Info */}
          <div className="cd-scard">
            <div className="cd-stitle"><span className="cd-sline" />Listing Info</div>
            <div className="cd-cond-list">
              <div className="cd-lr"><span>Listing ID</span><strong>#{car.id.slice(-8).toUpperCase()}</strong></div>
              <div className="cd-lr"><span>Location</span><strong>📍 {car.location || "—"}</strong></div>
              <div className="cd-lr"><span>Condition</span><strong>{car.category || "—"}</strong></div>
              <div className="cd-lr"><span>Payment Options</span><strong>{car.payments?.join(", ") || "Cash"}</strong></div>
              <div className="cd-lr"><span>Negotiable</span><strong>{car.negotiable ? "✅ Yes" : "❌ No"}</strong></div>
            </div>
          </div>

        </div>

        {/* ══ RIGHT COLUMN (sticky) ═══════════════════════════ */}
        <div className="cd-col-right">

          {/* Price card */}
          <div className="cd-price-card">
            <div>
              {car.isOffer && car.offerPrice ? (
                <>
                  <div className="cd-pc-price" style={{ textDecoration: 'line-through', color: 'white', fontSize: '1.2rem', marginBottom: '4px' }}>
                    {car.price}
                  </div>
                  <div className="cd-pc-price" style={{ color: '#dd0000' }}>
                    {car.offerPrice}
                    {discountPercent > 0 && (
                      <span style={{ background: '#dd0000', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '0.8rem', marginLeft: '8px', verticalAlign: 'middle' }}>
                        {discountPercent}% OFF
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <div className="cd-pc-price">{car.price}</div>
              )}
              <div className="cd-pc-note">{paymentNote}</div>
            </div>
            <div className="cd-pc-rating">
              <span className="cd-stars">★★★★★</span>
              <strong>Verified Listing</strong>
            </div>
            <hr className="cd-pcdiv" />
            {displayPhone && (
              <a href={`tel:${displayPhone}`} className="cd-btn-full">
                📞 Call Seller
              </a>
            )}
            <button
              className={`cd-btn-ghost${car && isSaved(car.id) ? " saved" : ""}`}
              onClick={() => car && toggleSave(car)}
            >
              {car && isSaved(car.id) ? "❤ Saved!" : "♡ Save to Wishlist"}
            </button>
            <div className="cd-pc-share">
              <span>Share:</span>
              <button onClick={copyLink}>{copied ? "✅ Copied!" : "🔗 Link"}</button>
              <button onClick={shareWhatsApp}>📤 WhatsApp</button>
            </div>
          </div>

          {/* Seller card */}
          <div className="cd-seller-card">
            <div className="cd-sc-top">
              {car.dealerAvatar ? (
                <img src={car.dealerAvatar} alt={sellerName} className="cd-sc-av" style={{ objectFit: 'cover' }} />
              ) : (
                <div className="cd-sc-av">{sellerInitial}</div>
              )}
              <div>
                <Link href={car.dealerId ? `/dealer-profile?id=${car.dealerId}` : "#"} style={{ textDecoration: 'none' }}>
                  <div className="cd-sc-name" style={{ cursor: 'pointer', color: '#1a1a1a' }}>{sellerName}</div>
                </Link>
                <div className="cd-sc-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#3a3aff"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                  Verified Dealer
                </div>
              </div>
            </div>
            {displayPhone && (
              <p className="cd-sc-meta">📞 {displayPhone}</p>
            )}
            <p className="cd-sc-meta">📍 {car.location || "Egypt"}</p>
            <div className="cd-cta-stack">
              {displayPhone && (
                <a href={`tel:${displayPhone}`} className="cd-btn-call">📞 Call Now</a>
              )}
              <button className="cd-btn-wa" onClick={shareWhatsApp}>💬 WhatsApp</button>
            </div>
          </div>

        </div>
      </div>

      {/* ── LIGHTBOX ──────────────────────────────────────────── */}
      {lightboxIdx !== null && (
        <div className="cd-lightbox" onClick={closeLightbox} role="dialog" aria-modal="true">
          {/* Close */}
          <button className="cd-lb-close" onClick={closeLightbox} aria-label="Close">✕</button>

          {/* Counter */}
          <div className="cd-lb-counter">{lightboxIdx + 1} / {images.length}</div>

          {/* Image */}
          <div className="cd-lb-img-wrap" onClick={(e) => e.stopPropagation()}>
            <img
              src={images[lightboxIdx]}
              alt={`${car.name} — image ${lightboxIdx + 1}`}
              className="cd-lb-img"
            />
          </div>

          {/* Prev / Next */}
          {images.length > 1 && (
            <>
              <button
                className="cd-lb-arr cd-lb-arr-left"
                onClick={(e) => { e.stopPropagation(); lbPrev(); }}
                aria-label="Previous"
              >&#8592;</button>
              <button
                className="cd-lb-arr cd-lb-arr-right"
                onClick={(e) => { e.stopPropagation(); lbNext(); }}
                aria-label="Next"
              >&#8594;</button>
            </>
          )}

          {/* Thumbnail strip */}
          {images.length > 1 && (
            <div className="cd-lb-thumbs" onClick={(e) => e.stopPropagation()}>
              {images.map((src, i) => (
                <div
                  key={i}
                  className={`cd-lb-thumb${i === lightboxIdx ? " active" : ""}`}
                  onClick={() => setLightboxIdx(i)}
                >
                  <img src={src} alt={`thumb ${i + 1}`} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
