import { CarBrand, CarModel } from "../types/car";

export function getTotalGenerations(brand: CarBrand): number {
  return brand.m.reduce((acc, model) => acc + model.g.length, 0);
}

/**
 * Converts any car image reference to a Next.js public path.
 *
 * Handles three cases:
 *   1. External img.autoabc.lv URL  → extract filename → `/images/filename.jpg`
 *   2. data\images\...  (CAR_DATA i field) → extract filename → `/images/filename.jpg`
 *   3. Already starts with /images/ or / → return as-is
 */
export function toLocalImage(raw: string): string {
  if (!raw) return "";

  // Already a local Next.js public path
  if (raw.startsWith("/images/") || raw.startsWith("/icons/")) return raw;

  // External autoabc.lv CDN or any http URL
  // e.g. https://img.autoabc.lv/Alfa-Romeo-145/Alfa-Romeo-145_1994_Hecbeks_...jpg
  if (raw.startsWith("http")) {
    const filename = raw.split("/").pop() || "";
    return filename ? `/images/${filename}` : "";
  }

  // Local data\images\ path from CAR_DATA "i" field
  // e.g. data\\images\\Alfa-Romeo-145_1994_Hecbeks_...jpg
  const normalised = raw.replace(/\\/g, "/");
  const filename = normalised.split("/").pop() || "";
  return filename ? `/images/${filename}` : "";
}

export function getHeroImageForBrand(brand: CarBrand): string {
  if (!brand || !brand.m || brand.m.length === 0) return "";
  const firstGen = brand.m[0]?.g?.[0];
  const rawImg = (firstGen?.photos && firstGen.photos[0]) || firstGen?.i || "";
  return toLocalImage(rawImg);
}

export function getHeroImageForModel(model: CarModel): string {
  if (!model || !model.g || model.g.length === 0) return "";
  const firstGen = model.g[0];
  const rawImg = (firstGen?.photos && firstGen.photos[0]) || firstGen?.i || "";
  return toLocalImage(rawImg);
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

/**
 * Returns the best local /images/... path for a generation's hero image.
 */
export function getLocalGenImage(gen: { photos?: string[]; i?: string }): string {
  const raw = (gen.photos && gen.photos.length > 0 ? gen.photos[0] : gen.i) || "";
  return toLocalImage(raw);
}

/**
 * Returns all local /images/... paths for a generation's photo gallery.
 */
export function getLocalGenPhotos(gen: { photos?: string[]; i?: string }): string[] {
  const sources = gen.photos && gen.photos.length > 0
    ? gen.photos
    : gen.i ? [gen.i] : [];
  return sources.map(toLocalImage).filter(Boolean);
}
