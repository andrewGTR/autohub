import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

/**
 * GET /api/car-images?brand=Alfa+Romeo&model=145&year=1994
 *
 * Scans public/images/ for files matching {Brand}-{Model}_{Year}_*
 * and returns an array of /images/<filename> paths.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const brand = searchParams.get("brand") || "";
  const model = searchParams.get("model") || "";
  const year  = searchParams.get("year")  || "";

  // Build the filename prefix:  "Alfa-Romeo-145_1994"
  // brand "Alfa Romeo" → "Alfa-Romeo"
  // model "Alfa Romeo 145" → strip brand prefix → "145"
  const brandSlug = brand.trim().replace(/\s+/g, "-");
  const modelStripped = model.trim()
    .replace(new RegExp(`^${brand.trim()}\\s*`, "i"), "")
    .trim()
    .replace(/\s+/g, "-");

  // The year field from CAR_DATA can be "1994 - 1999"; extract first 4-digit year
  const yearMatch = year.match(/\d{4}/);
  const yearSlug = yearMatch ? yearMatch[0] : "";

  // Prefix: e.g. "Alfa-Romeo-145_1994"
  const prefix = yearSlug
    ? `${brandSlug}-${modelStripped}_${yearSlug}`
    : `${brandSlug}-${modelStripped}_`;

  const imagesDir = path.join(process.cwd(), "public", "images");

  let files: string[] = [];
  try {
    files = fs
      .readdirSync(imagesDir)
      .filter((f) => f.toLowerCase().startsWith(prefix.toLowerCase()))
      .sort()
      .map((f) => `/images/${f}`);
  } catch {
    // Directory not readable — return empty
  }

  return NextResponse.json({ images: files });
}
