import cloudinary from '../lib/cloudinary';

export interface CloudinaryImage {
  public_id: string;
  secure_url: string;
  format: string;
  width: number;
  height: number;
}

/**
 * Returns the cloud name, reading from the env var each time
 * so it works regardless of module initialization order.
 */
function getCloudName(): string {
  return process.env.CLOUDINARY_CLOUD_NAME || '';
}

/**
 * Returns the optimized URL for a brand's cover image.
 * Uses the deterministic path: cars/covers/{brand-lowercase}-cover.jpg
 *
 * Constructs the URL directly instead of using the SDK so that
 * it works even when the full SDK config (api_key/secret) isn't loaded.
 */
export function getBrandCoverUrl(brand: string): string {
  if (!brand) return '';
  const cloudName = getCloudName();
  if (!cloudName) return '';
  
  const normalizedBrand = brand.trim().toLowerCase();
  
  // Mapping for typos/specific names the user uploaded to Cloudinary
  const coverMap: Record<string, string> = {
    'audi': 'Audi_A4.jpg',
    'mitsubishi': 'mitsobishi-cover.jpg',
    'chevrolet': 'chevorlet-cover.jpg',
    'citroen': 'citroin-cover.jpg',
    'alfa romeo': 'alfa romeo-cover.jpg',
    'land rover': 'land rover-cover.jpg',
    'peugeot': 'PEUGEOT-cover.jpg',
    'mercedes-benz': 'mercedes-cover.jpg',
    'mercedes': 'mercedes-cover.jpg',
    'lada (vaz)': 'lada-cover.jpg',
    'toyota': 'Toyota-cover.jpg',
    'subaru': 'Subaru-cover.jpg',
    'hyundai': 'Hyundai-cover.jpg',
    'honda': 'Honda-cover.jpg',
    'fiat': 'Fiat-cover.jpg',
    'chrysler': 'Chrysler-cover.jpg',
    'seat': 'seat-cover_nvm2vf.webp',
  };

  const filename = coverMap[normalizedBrand] || `${normalizedBrand}-cover.jpg`;
  
  // For spaces in file names like "alfa romeo-cover.jpg", URL encode them
  const encodedFilename = encodeURIComponent(filename);

  // The Seat cover was uploaded directly to the root, not inside cars/covers/
  if (normalizedBrand === 'seat') {
    return `https://res.cloudinary.com/${cloudName}/image/upload/f_auto,q_auto/${encodedFilename}`;
  }

  return `https://res.cloudinary.com/${cloudName}/image/upload/f_auto,q_auto/cars/covers/${encodedFilename}`;
}

/**
 * Searches Cloudinary for all images within a specific car's folder.
 * Folder structure: cars/Brand/Model/Year
 *
 * Handles data mismatches:
 * - DB model names include brand prefix ("BMW M5") → strips to "M5"
 * - DB years are ranges ("2018 - 2022") → extracts individual years
 */
export async function getCarGallery(brand: string, model: string, year: string): Promise<string[]> {
  try {
    if (!brand || !model) return [];

    const cloudName = getCloudName();
    if (!cloudName) {
      console.warn('CLOUDINARY_CLOUD_NAME is not set — skipping gallery fetch.');
      return [];
    }

    // Clean up brand names with parentheses (e.g. "Lada (VAZ)" -> "Lada")
    let cleanBrand = brand.replace(/\(.*\)/g, '').trim();

    // Brands in cloudinary seem to have spaces replaced with dashes
    const safeBrand = cleanBrand.replace(/\s+/g, '-');

    // Strip the brand name prefix from the model if present
    // e.g. "BMW M5" → "M5", "Mercedes C200" → "C200"
    let safeModel = model.trim();
    if (safeModel.toLowerCase().startsWith(cleanBrand.toLowerCase())) {
      safeModel = safeModel.slice(cleanBrand.length).trim();
    }
    // Handle model name mismatches between our DB and the Cloudinary folders
    // e.g., "Alfa Romeo 147" has spaces, but sometimes Cloudinary uses dashes
    safeModel = safeModel.replace(/\//g, '-');
    
    // Cloudinary folders use Latvian names:
    // "series" -> "serija" (e.g. BMW 3 series -> 3-serija)
    // "class" -> "klase" (e.g. Mercedes C-Class -> C-klase)
    safeModel = safeModel
      .replace(/series/i, 'serija')
      .replace(/class/i, 'klase')
      .replace(/\s+/g, '-');



    // Extract individual years from year ranges
    // "2018 - 2022" → ["2018", "2019", "2020", "2021", "2022"]
    // "2019 -" → ["2019"]
    // "2022" → ["2022"]
    const yearNumbers: string[] = [];
    if (year) {
      const matches = year.match(/\d{4}/g);
      if (matches) {
        if (matches.length === 2) {
          const start = parseInt(matches[0]);
          const end = parseInt(matches[1]);
          for (let y = start; y <= end; y++) {
            yearNumbers.push(String(y));
          }
        } else {
          yearNumbers.push(matches[0]);
        }
      }
    }

    // Helper to search a specific folder
    const searchFolder = async (folder: string): Promise<string[]> => {
      try {
        const result = await cloudinary.search
          .expression(`folder:"${folder}"`)
          .sort_by('public_id', 'asc')
          .max_results(30)
          .execute();

        if (!result || !result.resources || result.resources.length === 0) {
          return [];
        }

        return result.resources.map((res: any) =>
          `https://res.cloudinary.com/${cloudName}/image/upload/f_auto,q_auto/${res.public_id}`
        );
      } catch {
        return [];
      }
    };

    // Strategy 1: Try each specific year folder (most precise)
    // Cloudinary path is "cars/Brand/Model/Year"
    for (const y of yearNumbers) {
      const folder = `cars/${safeBrand}/${safeModel}/${y}`;
      const images = await searchFolder(folder);
      if (images.length > 0) return images;
    }

    // Strategy 2: Search the model folder directly (any year)
    if (safeModel) {
      const modelFolder = `cars/${safeBrand}/${safeModel}`;
      const result = await cloudinary.search
        .expression(`folder:"${modelFolder}/*"`)
        .sort_by('public_id', 'asc')
        .max_results(30)
        .execute();

      if (result?.resources?.length > 0) {
        return result.resources.map((res: any) =>
          `https://res.cloudinary.com/${cloudName}/image/upload/f_auto,q_auto/${res.public_id}`
        );
      }
    }

    return [];
  } catch (error) {
    console.error(`Error fetching car gallery from Cloudinary for ${brand}/${model}/${year}:`, error);
    return [];
  }
}
