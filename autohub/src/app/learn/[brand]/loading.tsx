import PageNavbar from "../../../components/PageNavbar";

export default function LearnBrandLoading() {
  return (
    <main>
      <PageNavbar />
      
      {/* Skeleton Hero Header */}
      <div style={{ padding: "60px 20px", background: "var(--subnav-bg)", display: "flex", justifyContent: "center" }}>
        <div style={{ width: "100%", maxWidth: "1200px" }}>
          <div className="skeleton skeleton-text short" style={{ height: "16px", marginBottom: "32px", width: "20%" }} />
          
          <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>
            <div className="skeleton skeleton-circle" style={{ width: "80px", height: "80px" }} />
            <div style={{ flex: 1 }}>
              <div className="skeleton skeleton-text medium" style={{ height: "40px", marginBottom: "12px", width: "40%" }} />
              <div className="skeleton skeleton-text" style={{ height: "20px", width: "30%" }} />
            </div>
          </div>
          
          <div style={{ display: "flex", gap: "16px", marginTop: "32px" }}>
            <div className="skeleton skeleton-rect" style={{ width: "120px", height: "80px", borderRadius: "12px" }} />
            <div className="skeleton skeleton-rect" style={{ width: "120px", height: "80px", borderRadius: "12px" }} />
          </div>
        </div>
      </div>
      
      {/* Skeleton Models Grid */}
      <div style={{ padding: "60px 20px", maxWidth: "1200px", margin: "0 auto" }}>
        <div className="skeleton skeleton-text" style={{ height: "32px", width: "30%", marginBottom: "32px" }} />
        
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "24px" }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ padding: "20px", border: "1px solid var(--border)", borderRadius: "12px" }}>
              <div className="skeleton skeleton-text medium" style={{ height: "24px", marginBottom: "20px" }} />
              <div style={{ display: "flex", gap: "12px" }}>
                <div className="skeleton skeleton-rect" style={{ width: "100px", height: "40px", borderRadius: "20px" }} />
                <div className="skeleton skeleton-rect" style={{ width: "100px", height: "40px", borderRadius: "20px" }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
