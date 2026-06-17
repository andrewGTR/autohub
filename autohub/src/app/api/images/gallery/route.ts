import { NextResponse } from 'next/server';
import { getCarGallery } from '../../../../services/imageService';

export const revalidate = 86400; // Cache for 24 hours

// In-memory cache to avoid hammering Cloudinary's rate-limited Search API.
// Key: "brand|model|year", Value: { images, timestamp }
const cache = new Map<string, { images: string[]; ts: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const brand = searchParams.get('brand');
  const model = searchParams.get('model');
  const year = searchParams.get('year') || '';

  if (!brand || !model) {
    return NextResponse.json({ error: 'Missing required parameters: brand, model' }, { status: 400 });
  }

  const cacheKey = `${brand}|${model}|${year}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json({ images: cached.images });
  }

  try {
    const images = await getCarGallery(brand, model, year);
    cache.set(cacheKey, { images, ts: Date.now() });
    return NextResponse.json({ images });
  } catch (error) {
    console.error('API Error fetching gallery:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

