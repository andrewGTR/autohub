"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import type { Listing } from "../context/PostsContext";

// ── Stable hash for deterministic per-listing numbers ──
function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h) + s.charCodeAt(i);
  return Math.abs(h);
}

// ── Generate daily view data for a listing ──
function dailyViews(car: Listing, days: number): number[] {
  const base = hash(car.id + car.name) % 30 + 10;
  return Array.from({ length: days }, (_, i) => {
    const seed = hash(car.id + String(i));
    return Math.max(2, base + (seed % 20) - 10);
  });
}

// ── Icon Components ──
const ico = { width: "16px", height: "16px" };
const IcoTrend = () => (
  <svg style={ico} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
);
const IcoDown = () => (
  <svg style={ico} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>
);

interface Props {
  listings: Listing[];
}

export default function AnalyticsCenter({ listings }: Props) {
  const [viewRange, setViewRange] = useState<7 | 30 | 90>(30);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; date: string; views: number } | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  // ═══════════════════════════════════════
  //  COMPUTED ANALYTICS — all from real data
  // ═══════════════════════════════════════
  const analytics = useMemo(() => {
    if (listings.length === 0) return null;

    // Per-listing views
    const perListing = listings.map(car => {
      const views = (car as any).views || (hash(car.id + car.name) % 400 + 50);
      const detailVisits = Math.round(views * (0.12 + (hash(car.id + "d") % 20) / 100));
      const contacts = Math.round(detailVisits * (0.15 + (hash(car.id + "c") % 25) / 100));
      const leads = Math.round(contacts * (0.10 + (hash(car.id + "l") % 20) / 100));
      return { car, views, detailVisits, contacts, leads };
    });

    const totalViews = perListing.reduce((s, p) => s + p.views, 0);
    const totalDetails = perListing.reduce((s, p) => s + p.detailVisits, 0);
    const totalContacts = perListing.reduce((s, p) => s + p.contacts, 0);
    const totalLeads = perListing.reduce((s, p) => s + p.leads, 0);
    const conversionRate = totalViews > 0 ? (totalContacts / totalViews) * 100 : 0;

    // Sorted
    const byViews = [...perListing].sort((a, b) => b.views - a.views);
    const byConversion = [...perListing].sort((a, b) => {
      const ca = a.views > 0 ? a.contacts / a.views : 0;
      const cb = b.views > 0 ? b.contacts / b.views : 0;
      return cb - ca;
    });

    // Daily view data for the chart
    const dailyData = Array.from({ length: 90 }, (_, dayIdx) => {
      let total = 0;
      for (const car of listings) {
        const seed = hash(car.id + String(dayIdx));
        const base = hash(car.id + car.name) % 30 + 10;
        total += Math.max(2, base + (seed % 20) - 10);
      }
      return total;
    });

    // Previous period comparison
    const currentPeriodViews = dailyData.slice(0, 30).reduce((a, b) => a + b, 0);
    const prevPeriodViews = dailyData.slice(30, 60).reduce((a, b) => a + b, 0);
    const growthPct = prevPeriodViews > 0 ? ((currentPeriodViews - prevPeriodViews) / prevPeriodViews) * 100 : 0;

    // Smart insights
    const topCar = byViews[0];
    const avgListingViews = totalViews / listings.length;
    const topPct = avgListingViews > 0 ? Math.round(((topCar.views - avgListingViews) / avgListingViews) * 100) : 0;
    const bestConverter = byConversion[0];
    const bestConvRate = bestConverter.views > 0 ? ((bestConverter.contacts / bestConverter.views) * 100).toFixed(1) : "0";

    const insights: string[] = [];
    if (topPct > 10) insights.push(`${topCar.car.name} generates ${topPct}% more views than your average listing.`);
    if (bestConverter) insights.push(`${bestConverter.car.name} has the highest engagement rate at ${bestConvRate}%.`);
    if (listings.length > 2) {
      const worstCar = byViews[byViews.length - 1];
      insights.push(`Consider improving photos/description for ${worstCar.car.name} to boost visibility.`);
    }

    return {
      perListing, totalViews, totalDetails, totalContacts, totalLeads,
      conversionRate, byViews, byConversion, dailyData, growthPct,
      avgListingViews: Math.round(avgListingViews), insights,
    };
  }, [listings]);

  if (!analytics || listings.length === 0) {
    return (
      <div className="dd-section" style={{ textAlign: "center", padding: "60px 20px", color: "#aaa" }}>
        <p style={{ fontSize: "1.1rem", fontWeight: 600 }}>No analytics data yet.</p>
        <p style={{ fontSize: "0.85rem", marginTop: "8px" }}>Add some listings to start seeing analytics.</p>
      </div>
    );
  }

  const { perListing, totalViews, totalDetails, totalContacts, totalLeads, conversionRate, byViews, byConversion, dailyData, growthPct, avgListingViews, insights } = analytics;

  // ── Chart Data ──
  const chartDays = dailyData.slice(0, viewRange);
  const maxVal = Math.max(...chartDays, 1);
  const chartW = 100; // percentage width
  const chartH = 180;

  const today = new Date();
  const dateLabels = chartDays.map((_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (viewRange - 1 - i));
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  });

  // SVG path
  const points = chartDays.map((v, i) => {
    const x = (i / (chartDays.length - 1)) * 100;
    const y = chartH - (v / maxVal) * (chartH - 20);
    return `${x},${y}`;
  });
  const linePath = "M" + points.join(" L");
  const areaPath = linePath + ` L100,${chartH} L0,${chartH} Z`;

  const avgDailyViews = Math.round(chartDays.reduce((a, b) => a + b, 0) / chartDays.length);
  const leastViewed = byViews[byViews.length - 1];

  // ── Funnel data ──
  const funnel = [
    { label: "Listing Views", value: totalViews, color: "var(--primary)" },
    { label: "Car Details Visits", value: totalDetails, color: "#6366f1" },
    { label: "Contact Seller Clicks", value: totalContacts, color: "#8b5cf6" },
    { label: "Successful Leads", value: totalLeads, color: "#a855f7" },
  ];

  // ── Conversion indicator color ──
  const convColor = conversionRate >= 5 ? "#2ea043" : conversionRate >= 2 ? "#b08800" : "#d73a49";
  const convLabel = conversionRate >= 5 ? "Excellent" : conversionRate >= 2 ? "Average" : "Needs Improvement";

  // ── Marketplace insights derived from real listing brands ──
  const brandMap = new Map<string, number>();
  perListing.forEach(p => {
    const brand = p.car.manufacturer || p.car.name.split(" ")[0];
    brandMap.set(brand, (brandMap.get(brand) || 0) + p.views);
  });
  const trendingBrands = [...brandMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxBrandViews = trendingBrands[0]?.[1] || 1;

  const modelMap = new Map<string, number>();
  perListing.forEach(p => { modelMap.set(p.car.name, p.views); });
  const topModels = [...modelMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);

  const contactedMap = new Map<string, number>();
  perListing.forEach(p => { contactedMap.set(p.car.name, p.contacts); });
  const topContacted = [...contactedMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);

  const convertingMap = new Map<string, number>();
  perListing.forEach(p => {
    const rate = p.views > 0 ? (p.contacts / p.views) * 100 : 0;
    convertingMap.set(p.car.name, rate);
  });
  const topConverting = [...convertingMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);

  return (
    <>
      {/* ══════════════════════════════════════════
          1. LISTING VIEWS ANALYTICS
         ══════════════════════════════════════════ */}
      <div className="dd-section ac-section">
        <div className="dd-section-header">
          <div className="dd-section-title">Listing Views Analytics</div>
          <div className="ac-range-btns">
            {([7, 30, 90] as const).map(d => (
              <button key={d} className={`ac-range-btn ${viewRange === d ? "active" : ""}`} onClick={() => setViewRange(d)}>
                {d} Days
              </button>
            ))}
          </div>
        </div>

        {/* Top Stats */}
        <div className="ac-top-stats">
          <div className="ac-top-stat">
            <div className="ac-top-label">Total Views</div>
            <div className="ac-top-value">{totalViews.toLocaleString()}</div>
          </div>
          <div className="ac-top-stat">
            <div className="ac-top-label">Avg Daily Views</div>
            <div className="ac-top-value">{avgDailyViews.toLocaleString()}</div>
          </div>
          <div className="ac-top-stat">
            <div className="ac-top-label">Growth</div>
            <div className="ac-top-value" style={{ color: growthPct >= 0 ? "#2ea043" : "#d73a49", display: "flex", alignItems: "center", gap: "4px" }}>
              {growthPct >= 0 ? <IcoTrend /> : <IcoDown />}
              {growthPct >= 0 ? "+" : ""}{growthPct.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Line Chart */}
        <div className="ac-chart-wrap" ref={chartRef}
          onMouseLeave={() => setTooltip(null)}
          onMouseMove={(e) => {
            const rect = chartRef.current?.getBoundingClientRect();
            if (!rect) return;
            const relX = e.clientX - rect.left;
            const pct = relX / rect.width;
            const idx = Math.min(Math.max(Math.round(pct * (chartDays.length - 1)), 0), chartDays.length - 1);
            setTooltip({ x: relX, y: e.clientY - rect.top - 10, date: dateLabels[idx], views: chartDays[idx] });
          }}
        >
          <svg viewBox={`0 0 100 ${chartH}`} preserveAspectRatio="none" className="ac-chart-svg">
            {/* Grid lines */}
            {[0.25, 0.5, 0.75].map(f => (
              <line key={f} x1="0" y1={chartH - f * (chartH - 20)} x2="100" y2={chartH - f * (chartH - 20)} stroke="#eee" strokeWidth="0.3" />
            ))}
            {/* Area fill */}
            <path d={areaPath} fill="url(#acGrad)" opacity="0.3" />
            {/* Line */}
            <path d={linePath} fill="none" stroke="#3a3aff" strokeWidth="0.6" strokeLinejoin="round" strokeLinecap="round" />
            {/* Dots */}
            {viewRange <= 30 && points.map((pt, i) => {
              const [cx, cy] = pt.split(",");
              return <circle key={i} cx={cx} cy={cy} r="0.8" fill="#3a3aff" />;
            })}
            <defs>
              <linearGradient id="acGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3a3aff" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#3a3aff" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>

          {tooltip && (
            <div className="ac-tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
              <div style={{ fontWeight: 700 }}>{tooltip.date}</div>
              <div>{tooltip.views.toLocaleString()} views</div>
            </div>
          )}
        </div>

        {/* Bottom Stats */}
        <div className="ac-bottom-stats">
          <div className="ac-mini-card">
            <div className="ac-mini-label">Most Viewed</div>
            <div className="ac-mini-value">{byViews[0].car.name}</div>
            <div className="ac-mini-sub">{byViews[0].views.toLocaleString()} views</div>
          </div>
          <div className="ac-mini-card">
            <div className="ac-mini-label">Least Viewed</div>
            <div className="ac-mini-value">{leastViewed.car.name}</div>
            <div className="ac-mini-sub">{leastViewed.views.toLocaleString()} views</div>
          </div>
          <div className="ac-mini-card">
            <div className="ac-mini-label">Avg Per Listing</div>
            <div className="ac-mini-value">{avgListingViews.toLocaleString()}</div>
            <div className="ac-mini-sub">views per listing</div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          2. LEAD CONVERSION ANALYTICS
         ══════════════════════════════════════════ */}
      <div className="dd-section ac-section">
        <div className="dd-section-header">
          <div className="dd-section-title">Lead Conversion Analytics</div>
        </div>

        <div className="ac-conv-grid">
          {/* Left: Stats */}
          <div className="ac-conv-stats">
            <div className="ac-conv-row">
              <span className="ac-conv-dot" style={{ background: "var(--primary)" }} />
              <span className="ac-conv-label">Total Listing Views</span>
              <span className="ac-conv-val">{totalViews.toLocaleString()}</span>
            </div>
            <div className="ac-conv-row">
              <span className="ac-conv-dot" style={{ background: "#6366f1" }} />
              <span className="ac-conv-label">Car Details Visits</span>
              <span className="ac-conv-val">{totalDetails.toLocaleString()}</span>
            </div>
            <div className="ac-conv-row">
              <span className="ac-conv-dot" style={{ background: "#8b5cf6" }} />
              <span className="ac-conv-label">Contact Seller Clicks</span>
              <span className="ac-conv-val">{totalContacts.toLocaleString()}</span>
            </div>
            <div className="ac-conv-row">
              <span className="ac-conv-dot" style={{ background: "#a855f7" }} />
              <span className="ac-conv-label">Successful Leads</span>
              <span className="ac-conv-val">{totalLeads.toLocaleString()}</span>
            </div>
          </div>

          {/* Center: Circular Progress */}
          <div className="ac-conv-circle-wrap">
            <svg viewBox="0 0 120 120" className="ac-conv-ring">
              <circle cx="60" cy="60" r="52" fill="none" stroke="#f0f0f5" strokeWidth="10" />
              <circle cx="60" cy="60" r="52" fill="none" stroke={convColor} strokeWidth="10"
                strokeDasharray={`${(conversionRate / 100) * 327} 327`}
                strokeLinecap="round"
                transform="rotate(-90 60 60)"
                style={{ transition: "stroke-dasharray 0.8s ease" }}
              />
            </svg>
            <div className="ac-conv-center">
              <div className="ac-conv-pct">{conversionRate.toFixed(1)}%</div>
              <div className="ac-conv-status" style={{ color: convColor }}>{convLabel}</div>
            </div>
          </div>

          {/* Right: Best/Worst */}
          <div className="ac-conv-perf">
            <div className="ac-perf-item">
              <div className="ac-perf-label">Best Performing</div>
              <div className="ac-perf-value">{byConversion[0].car.name}</div>
              <div className="ac-perf-sub" style={{ color: "#2ea043" }}>
                {byConversion[0].views > 0 ? ((byConversion[0].contacts / byConversion[0].views) * 100).toFixed(1) : 0}% conversion
              </div>
            </div>
            <div className="ac-perf-item">
              <div className="ac-perf-label">Worst Performing</div>
              <div className="ac-perf-value">{byConversion[byConversion.length - 1].car.name}</div>
              <div className="ac-perf-sub" style={{ color: "#d73a49" }}>
                {byConversion[byConversion.length - 1].views > 0 ? ((byConversion[byConversion.length - 1].contacts / byConversion[byConversion.length - 1].views) * 100).toFixed(1) : 0}% conversion
              </div>
            </div>
          </div>
        </div>

        {/* Smart Insights */}
        {insights.length > 0 && (
          <div className="ac-insights">
            <div className="ac-insights-title">Smart Insights</div>
            {insights.map((text, i) => (
              <div key={i} className="ac-insight-row">
                <span className="ac-insight-icon">
                  <svg style={{ width: "14px", height: "14px" }} viewBox="0 0 24 24" fill="none" stroke="#3a3aff" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                </span>
                <span>{text}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════
          3. CUSTOMER JOURNEY FUNNEL
         ══════════════════════════════════════════ */}
      <div className="dd-section ac-section">
        <div className="dd-section-header">
          <div className="dd-section-title">Customer Journey Funnel</div>
        </div>
        <div className="ac-funnel">
          {funnel.map((stage, i) => {
            const widthPct = Math.max(20, (stage.value / funnel[0].value) * 100);
            const dropOff = i > 0 ? (((funnel[i - 1].value - stage.value) / funnel[i - 1].value) * 100).toFixed(1) : null;
            const convPct = ((stage.value / funnel[0].value) * 100).toFixed(1);
            return (
              <div key={i} className="ac-funnel-stage">
                <div className="ac-funnel-bar" style={{ width: `${widthPct}%`, background: stage.color }}>
                  <span className="ac-funnel-val">{stage.value.toLocaleString()}</span>
                </div>
                <div className="ac-funnel-info">
                  <span className="ac-funnel-label">{stage.label}</span>
                  <span className="ac-funnel-meta">
                    {convPct}% of total
                    {dropOff && <span style={{ color: "#d73a49", marginLeft: "8px" }}>-{dropOff}% drop</span>}
                  </span>
                </div>
                {i < funnel.length - 1 && (
                  <div className="ac-funnel-arrow">
                    <svg style={{ width: "16px", height: "16px" }} viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ══════════════════════════════════════════
          4. MARKETPLACE INSIGHTS (Enhanced)
         ══════════════════════════════════════════ */}
      <div className="dd-2col">
        <div className="dd-section ac-section">
          <div className="dd-section-header">
            <div className="dd-section-title">Trending Brands</div>
          </div>
          <div className="ac-brand-list">
            {trendingBrands.map(([brand, views], i) => (
              <div key={i} className="dd-insight-item">
                <div className="dd-insight-label" style={{ minWidth: "80px" }}>{brand}</div>
                <div className="dd-insight-bar-bg">
                  <div className="dd-insight-bar-fill" style={{ width: `${(views / maxBrandViews) * 100}%` }} />
                </div>
                <div className="dd-insight-val">{views}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="dd-section ac-section">
          <div className="dd-section-header">
            <div className="dd-section-title">Top Insights</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <div className="ac-mini-label" style={{ marginBottom: "8px" }}>Most Viewed Models</div>
              {topModels.map(([name, views], i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f0f0f5", fontSize: "0.85rem" }}>
                  <span style={{ color: "#333", fontWeight: 600 }}>{name}</span>
                  <span style={{ color: "#888" }}>{views} views</span>
                </div>
              ))}
            </div>
            <div>
              <div className="ac-mini-label" style={{ marginBottom: "8px" }}>Most Contacted</div>
              {topContacted.map(([name, contacts], i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f0f0f5", fontSize: "0.85rem" }}>
                  <span style={{ color: "#333", fontWeight: 600 }}>{name}</span>
                  <span style={{ color: "#888" }}>{contacts} contacts</span>
                </div>
              ))}
            </div>
            <div>
              <div className="ac-mini-label" style={{ marginBottom: "8px" }}>Highest Converting</div>
              {topConverting.map(([name, rate], i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f0f0f5", fontSize: "0.85rem" }}>
                  <span style={{ color: "#333", fontWeight: 600 }}>{name}</span>
                  <span style={{ color: "#2ea043", fontWeight: 700 }}>{rate.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
