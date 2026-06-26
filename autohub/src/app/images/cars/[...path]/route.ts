import { NextResponse } from 'next/server';
import cloudinary from '../../../../lib/cloudinary';

/**
 * Catch-all route for /images/cars/...
 *
 * The cars.json dataset references images as local paths like:
 *   /images/cars/audi/S4/Audi-S4_2016_Universals_2111912815_0_84ee7e90f1.jpg
 *   /images/cars/alfa/Romeo/Alfa-Romeo-145_...jpg
 *
 * This route searches Cloudinary by the exact filename, which avoids any
 * folder path mismatches. If the exact file is missing, it falls back to
 * another image from the same brand.
 */

const fileCache = new Map<string, { url: string; ts: number }>();
const CACHE_TTL = 2 * 60 * 60 * 1000; // 2 hours

function getCloudName(): string {
  return process.env.CLOUDINARY_CLOUD_NAME || '';
}

const BRAND_FOLDER_MAP: Record<string, string> = {
  'alfa-romeo': 'Alfa-Romeo', 'alfaromeo': 'Alfa-Romeo', 'alfa': 'Alfa-Romeo',
  'audi': 'Audi', 'bmw': 'BMW',
  'chevrolet': 'Chevrolet', 'chrysler': 'Chrysler',
  'citroen': 'Citroen', 'cupra': 'Cupra',
  'dacia': 'Dacia', 'dodge': 'Dodge',
  'fiat': 'Fiat', 'ford': 'Ford',
  'honda': 'Honda', 'hyundai': 'Hyundai',
  'infiniti': 'Infiniti', 'isuzu': 'Isuzu',
  'jaguar': 'Jaguar', 'jeep': 'Jeep',
  'kia': 'Kia', 'lada': 'Lada',
  'land-rover': 'Land-Rover', 'landrover': 'Land-Rover', 'land': 'Land-Rover',
  'lexus': 'Lexus', 'mazda': 'Mazda',
  'mercedes': 'Mercedes', 'mercedes-benz': 'Mercedes',
  'mini': 'Mini', 'mitsubishi': 'Mitsubishi',
  'nissan': 'Nissan', 'opel': 'Opel',
  'peugeot': 'Peugeot', 'porsche': 'Porsche',
  'renault': 'Renault', 'rover': 'Rover',
  'seat': 'Seat', 'skoda': 'Skoda',
  'smart': 'Smart', 'subaru': 'Subaru',
  'suzuki': 'Suzuki', 'tesla': 'Tesla',
  'toyota': 'Toyota', 'volkswagen': 'Volkswagen',
  'volvo': 'Volvo',
};

// Cache for brand fallback images to avoid repeated searches
const brandFallbackCache = new Map<string, { url: string; ts: number }>();

export async function GET(
  request: Request,
  context: any
) {
  const params = await context.params;
  const pathParts: string[] = params.path || [];

  if (pathParts.length < 2) {
    return new NextResponse(null, { status: 404 });
  }

  const cloudName = getCloudName();
  if (!cloudName) {
    return new NextResponse(null, { status: 404 });
  }

  const filename = pathParts[pathParts.length - 1];
  const baseName = filename.replace(/\.[^.]+$/, '');

  const cacheKey = pathParts.join('/');
  const cached = fileCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    if (!cached.url) return new NextResponse(null, { status: 404 });
    return NextResponse.redirect(cached.url, 302);
  }

  try {
    // 1. Search by EXACT filename (fast and ignores all folder path issues)
    const result = await cloudinary.search
      .expression(`filename:"${baseName}"`)
      .max_results(1)
      .execute();

    if (result?.resources?.length > 0) {
      const url = `https://res.cloudinary.com/${cloudName}/image/upload/f_auto,q_auto/${result.resources[0].public_id}`;
      fileCache.set(cacheKey, { url, ts: Date.now() });
      return NextResponse.redirect(url, 302);
    }

    // 2. Fallback: If exact file isn't uploaded, return an image from the same brand
    const urlBrand = pathParts[0].toLowerCase();
    
    // Handle multi-word brands where parts[0] is just "alfa" or "land"
    let brandKey = urlBrand;
    if (urlBrand === 'alfa' && pathParts[1].toLowerCase() === 'romeo') brandKey = 'alfa-romeo';
    if (urlBrand === 'land' && pathParts[1].toLowerCase() === 'rover') brandKey = 'land-rover';

    const cloudBrand = BRAND_FOLDER_MAP[brandKey] || urlBrand;

    // Check fallback cache first
    const fallbackCached = brandFallbackCache.get(cloudBrand);
    if (fallbackCached && Date.now() - fallbackCached.ts < CACHE_TTL) {
      fileCache.set(cacheKey, { url: fallbackCached.url, ts: Date.now() });
      return NextResponse.redirect(fallbackCached.url, 302);
    }

    // Search for any image in the brand folder
    const fallbackResult = await cloudinary.search
      .expression(`folder:"cars/${cloudBrand}/*" OR folder:"cars/${cloudBrand}"`)
      .max_results(1)
      .execute();

    if (fallbackResult?.resources?.length > 0) {
      const fallbackUrl = `https://res.cloudinary.com/${cloudName}/image/upload/f_auto,q_auto/${fallbackResult.resources[0].public_id}`;
      brandFallbackCache.set(cloudBrand, { url: fallbackUrl, ts: Date.now() });
      fileCache.set(cacheKey, { url: fallbackUrl, ts: Date.now() });
      return NextResponse.redirect(fallbackUrl, 302);
    }

    // 3. Complete miss
    fileCache.set(cacheKey, { url: '', ts: Date.now() });
    return new NextResponse(null, { status: 404 });
  } catch (error) {
    console.error(`[images/cars] Error resolving ${cacheKey}:`, error);
    return new NextResponse(null, { status: 404 });
  }
}
