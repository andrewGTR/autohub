import PageNavbar from "../../components/PageNavbar";
import PageHeader from "../../components/PageHeader";

export default function MarketplaceLoading() {
  return (
    <>
      <PageNavbar />
      <PageHeader title="Marketplace" description="Find your perfect vehicle" />

      <div className="main-wrapper" style={{ display: 'block' }}>
        <div className="content-area" style={{ width: '100%', padding: '0 20px', maxWidth: '1400px', margin: '0 auto' }}>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
            <div className="skeleton skeleton-rect" style={{ width: '120px', height: '40px', borderRadius: '8px' }}></div>
          </div>
          
          <div className="car-grid">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="car-card" style={{ border: "1px solid var(--border)", padding: "0" }}>
                <div style={{ height: "200px" }} className="skeleton skeleton-rect" />
                <div style={{ padding: "16px" }}>
                  <div className="skeleton skeleton-text medium" />
                  <div className="skeleton skeleton-text short" style={{ marginBottom: "16px" }} />
                  
                  <div className="skeleton skeleton-text" />
                  <div className="skeleton skeleton-text" />
                  <div className="skeleton skeleton-text short" />
                  
                  <div style={{ marginTop: "16px", display: "flex", justifyContent: "center" }}>
                    <div className="skeleton skeleton-text medium" style={{ height: "24px" }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
