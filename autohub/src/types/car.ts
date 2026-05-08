export interface CarModification {
  name: string;
  engine: string;
  power: string;
  consumption: string;
  gearbox: string;
  drive_type: string;
}

export interface CarOption {
  name: string;
  percent: string;
}

export interface CarPrice {
  year: string;
  lowest: string;
  average: string;
  highest: string;
}

export interface CarReview {
  e: string;
  p: string;
  c: string;
  f: string;
  r: number;
}

export interface CarGeneration {
  n: string;
  u: string;
  i: string;
  y: string;
  pr: string;
  hp: string;
  fl: string;
  desc: string;
  mods: CarModification[];
  opts: CarOption[];
  prices: CarPrice[];
  photos: string[];
  rv?: CarReview[];
}

export interface CarModel {
  n: string;
  g: CarGeneration[];
}

export interface CarBrand {
  n: string;
  m: CarModel[];
}
