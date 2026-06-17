import { CAR_DATA } from "../../../../data/cars";
import PageNavbar from "../../../../components/PageNavbar";
import PageHeader from "../../../../components/PageHeader";
import ModelDetailView from "../../../../components/ModelDetailView";
import { notFound } from "next/navigation";
import { CarBrand } from "../../../../types/car";

interface PageProps {
  params: Promise<{
    brand: string;
    model: string;
  }>;
}

export default async function ModelLearnPage({ params }: PageProps) {
  const resolvedParams = await params;
  const { brand, model } = resolvedParams;
  const decodedBrand = decodeURIComponent(brand);
  const decodedModel = decodeURIComponent(model);

  // Find brand data
  const brandData = (CAR_DATA as CarBrand[]).find(
    (b) => b.n.toLowerCase() === decodedBrand.toLowerCase()
  );

  if (!brandData) {
    notFound();
  }

  // Find model data — brandData is guaranteed non-null here (notFound throws above)
  const modelData = (brandData as NonNullable<typeof brandData>).m.find(
    (m) => m.n.toLowerCase() === decodedModel.toLowerCase()
  );

  if (!modelData) {
    notFound();
  }

  return (
    <main>
      <PageNavbar />
      <div>
        <div className="section" style={{ paddingBottom: "0" }}>
          <div style={{ marginBottom: "10px" }}>
            <a 
              href={`/learn/${decodedBrand}`} 
              style={{ color: "var(--primary)", textDecoration: "none", fontWeight: "600", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "5px" }}
            >
              ← Back to {decodedBrand}
            </a>
          </div>
        </div>
        
        <PageHeader
          title={decodedModel}
          description={`Full specifications and price history for all generations of the ${decodedModel}.`}
        />

        <ModelDetailView 
          brandName={decodedBrand} 
          modelName={decodedModel} 
          model={modelData} 
        />
      </div>
    </main>
  );
}
