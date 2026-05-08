import { CarBrand, CarModel } from "../types/car";

export function getTotalGenerations(brand: CarBrand): number {
  return brand.m.reduce((acc, model) => acc + model.g.length, 0);
}

export function getHeroImageForBrand(brand: CarBrand): string {
  if (!brand || !brand.m || brand.m.length === 0) return "";
  const firstGen = brand.m[0]?.g?.[0];
  const rawImg = (firstGen?.photos && firstGen.photos[0]) || firstGen?.i || "";
  return rawImg.replace(/\\/g, "/");
}

export function getHeroImageForModel(model: CarModel): string {
  if (!model || !model.g || model.g.length === 0) return "";
  const firstGen = model.g[0];
  const rawImg = (firstGen?.photos && firstGen.photos[0]) || firstGen?.i || "";
  return rawImg.replace(/\\/g, "/");
}

export function getSampleModels(brand: CarBrand, count: number = 3): string[] {
  if (!brand || !brand.m) return [];
  return brand.m.slice(0, count).map((m) =>
    m.n.replace(new RegExp(`^${brand.n}\\s*`, "i"), "").trim() || m.n
  );
}

export function normalizeImagePath(path: string): string {
  return path ? path.replace(/\\/g, "/") : "";
}
