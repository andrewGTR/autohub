import type { CarBrand } from "../types/car";
import rawData from "./cars.json";

// Filter out models and generations that have no details
const filteredData = (rawData as any[])
  .map(brand => ({
    ...brand,
    m: brand.m
      ? brand.m
          .map((model: any) => ({
            ...model,
            g: model.g
              ? model.g.filter(
                  (g: any) => g.desc || (g.mods && g.mods.length > 0)
                )
              : [],
          }))
          .filter((m: any) => m.g.length > 0)
      : [],
  }))
  .filter(brand => brand.m.length > 0);

// Re-export as typed CarBrand[] — the JSON file is the source of truth
export const CAR_DATA: CarBrand[] = filteredData as unknown as CarBrand[];
