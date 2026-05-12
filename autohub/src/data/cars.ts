import type { CarBrand } from "../types/car";
import rawData from "./cars.json";

// Re-export as typed CarBrand[] — the JSON file is the source of truth
export const CAR_DATA: CarBrand[] = rawData as unknown as CarBrand[];
