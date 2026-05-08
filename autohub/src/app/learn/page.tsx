import { CAR_DATA } from "../../data/cars";
import PageNavbar from "../../components/PageNavbar";
import AllBrandsExplorer from "../../components/AllBrandsExplorer";
import { CarBrand } from "../../types/car";
import { getTotalGenerations } from "../../utils/carUtils";

const brands = CAR_DATA as CarBrand[];
const totalModels = brands.reduce((a, b) => a + b.m.length, 0);
const totalGenerations = brands.reduce((a, b) => a + getTotalGenerations(b), 0);

export default function LearnPage() {
  return (
    <main>
      <PageNavbar />
      <div>

        {/* ── Hero banner ── */}
        <div style={{
          background: "linear-gradient(135deg, #1a1a2e 0%, #2e2e5e 60%, #1a1a2e 100%)",
          padding: "70px 30px",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}>
          {/* subtle decorative circles */}
          <div style={{
            position: "absolute", top: "-60px", right: "-60px",
            width: "300px", height: "300px", borderRadius: "50%",
            background: "rgba(58,58,255,0.08)", pointerEvents: "none",
          }} />
          <div style={{
            position: "absolute", bottom: "-80px", left: "-40px",
            width: "240px", height: "240px", borderRadius: "50%",
            background: "rgba(255,255,255,0.04)", pointerEvents: "none",
          }} />

          <div style={{ position: "relative", maxWidth: "700px", margin: "0 auto" }}>
            <h1 style={{
              fontSize: "clamp(2rem, 5vw, 3.2rem)",
              fontWeight: "900",
              color: "#fff",
              marginBottom: "16px",
              lineHeight: "1.15",
              letterSpacing: "-0.02em",
            }}>
              Explore the Automotive Universe
            </h1>

            <p style={{
              color: "rgba(255,255,255,0.65)",
              fontSize: "clamp(0.95rem, 2vw, 1.15rem)",
              lineHeight: "1.7",
              marginBottom: "32px",
            }}>
              Deep-dive into specs and price history
              for thousands of models across all major manufacturers.
            </p>

            <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
              {[
                { label: `${brands.length}+`, sub: "Brands" },
                { label: `${totalModels}+`, sub: "Models" },
                { label: `${totalGenerations}+`, sub: "Generations" },
              ].map((stat) => (
                <div key={stat.sub} style={{
                  background: "rgba(255,255,255,0.1)",
                  backdropFilter: "blur(10px)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: "12px",
                  padding: "14px 28px",
                  textAlign: "center",
                  minWidth: "100px",
                }}>
                  <div style={{ fontWeight: "900", fontSize: "1.4rem", color: "#fff" }}>{stat.label}</div>
                  <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.55)", textTransform: "uppercase", marginTop: "2px" }}>{stat.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── All Brands Explorer ── */}
        <AllBrandsExplorer brands={brands} />

      </div>
    </main>
  );
}

