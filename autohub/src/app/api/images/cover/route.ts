import { NextResponse } from 'next/server';
import { getCarGallery } from '../../../../services/imageService';

export const revalidate = 86400; // Cache for 24 hours

// In-memory cache to avoid hammering Cloudinary's rate-limited Search API.
const cache = new Map<string, { url: string; ts: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const brand = searchParams.get('brand');
  const model = searchParams.get('model');

  const placeholderUrl = new URL('/images/placeholder.jpg', request.url).toString();

  if (!brand || !model) {
    return NextResponse.redirect(placeholderUrl, 302);
  }

  const cacheKey = `${brand}|${model}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.redirect(cached.url, 302);
  }

  try {
    const images = await getCarGallery(brand, model, '');
    const targetUrl = images.length > 0 ? images[0] : placeholderUrl;
    
    cache.set(cacheKey, { url: targetUrl, ts: Date.now() });
    return NextResponse.redirect(targetUrl, 302);
  } catch (error) {
    console.error('API Error fetching cover:', error);
    return NextResponse.redirect(placeholderUrl, 302);
  }
}
