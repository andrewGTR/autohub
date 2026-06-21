// ============================================================
// AUTOHUB API SERVICE LAYER — WIRED TO REAL BACKEND
// ============================================================

import { API_BASE_URL } from "./config";
import { Listing } from "../context/PostsContext";
import { CAR_DATA } from "../data/cars";
import { CarBrand, CarGeneration } from "../types/car";
import { toLocalImage } from "../utils/carUtils";

// ─── TYPES ───────────────────────────────────────────────────

export type UserRole = "guest" | "user" | "dealer";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  token: string;
}

export interface ProfileData {
  name: string;
  location: string;
  phone: string;
  whatsapp: string;
  taxNumber: string;
  email: string;
  avatar?: string;
  cover?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface SignupPayload {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface DealerSignupPayload {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  location: string;
  phone: string;
  whatsapp: string;
  taxNumber: string;
}

// ─── HELPERS ─────────────────────────────────────────────────

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("autohub_token");
}

function authHeaders(): HeadersInit {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/** Normalise whatever shape the backend returns into AuthUser and persist session */
function normalizeUser(
  data: any,
  defaultRole: UserRole,
  fallbackName?: string,
  fallbackEmail?: string
): AuthUser {
  // Unwrap the `{ success: true, data: { ... } }` payload if it exists
  const payload = data.data ?? data;

  const user: AuthUser = {
    id: payload.user?.id ?? payload.user?._id ?? payload.id ?? payload._id ?? "",
    name: payload.user?.name ?? payload.name ?? fallbackName ?? "",
    email: payload.user?.email ?? payload.email ?? fallbackEmail ?? "",
    role: (payload.user?.role ?? payload.role ?? defaultRole) as UserRole,
    token: payload.token ?? payload.access_token ?? "",
  };
  if (typeof window !== "undefined") {
    localStorage.setItem("autohub_token", user.token);
    localStorage.setItem("autohub_user", JSON.stringify(user));
    
    // Set cookies for Next.js Middleware and Server Components
    document.cookie = `autohub_token=${user.token}; path=/; max-age=604800; SameSite=Lax`;
    document.cookie = `autohub_role=${user.role}; path=/; max-age=604800; SameSite=Lax`;
  }
  return user;
}

/** Map a raw API post object → our internal Listing shape */
function mapApiPostToListing(p: any): Listing {
  let rawDesc = p.description ?? "";
  let extractedIsOffer = false;
  let extractedOfferPrice = "";
  let extractedPayments: string[] = [];

  const offerMatch = rawDesc.match(/\[OFFER:([0-9.]+)\]/);
  if (offerMatch) {
    extractedIsOffer = true;
    extractedOfferPrice = offerMatch[1];
    rawDesc = rawDesc.replace(offerMatch[0], "").trim();
  }

  const payMatch = rawDesc.match(/\[PAYMENTS:(.*?)\]/);
  if (payMatch) {
    extractedPayments = payMatch[1].split(",");
    rawDesc = rawDesc.replace(payMatch[0], "").trim();
  }

  return {
    id: String(p.id ?? p._id ?? Date.now()),
    dealerId: p.dealer?._id ?? p.dealer?.id ?? (typeof p.dealer === "string" ? p.dealer : ""),
    name: p.title ?? `${p.brand ?? ""} ${p.model ?? ""}`.trim(),
    year: String(p.year ?? ""),
    category: p.condition ?? "Used",
    mileage: p.mileage != null ? `${p.mileage} KM` : "",
    transmission: p.transmission ?? "",
    location: p.location ?? "",
    price:
      p.price != null
        ? `${Number(p.price).toLocaleString()} ${p.currency ?? "EGP"}`
        : "",
    isOffer: extractedIsOffer,
    offerPrice:
      extractedOfferPrice
        ? `${Number(extractedOfferPrice).toLocaleString()} ${p.currency ?? "EGP"}`
        : "",
    image:
      Array.isArray(p.images) && p.images.length > 0
        ? p.images[0]
        : p.image ?? "",
    images: Array.isArray(p.images) ? p.images : (p.image ? [p.image] : []),
    link: `/car-details/${p.id ?? p._id ?? Date.now()}`,
    manufacturer: p.brand ?? "",
    model: p.model ?? "",
    body: p.bodyType ?? "",
    fuel: p.fuelType ?? "",
    color: p.color ?? "",
    description: rawDesc,
    negotiable: p.negotiable ?? false,
    dealerName: p.dealer?.name ?? "",
    dealerAvatar: p.dealer?.avatar ?? "",
    dealerPhone: p.dealer?.phone ?? p.contactPhone ?? "",
    payments: extractedPayments.length > 0 ? extractedPayments : (Array.isArray(p.paymentOptions) ? p.paymentOptions : []),
    contactPhone: p.contactPhone ?? "",
  };
}

// ─── AUTH ─────────────────────────────────────────────────────

/** POST /api/auth/login */
export async function loginUser(payload: LoginPayload): Promise<AuthUser> {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Login failed");
  }
  return normalizeUser(await res.json(), "user");
}


/** POST /api/auth/register/user */
export async function signupUser(payload: SignupPayload): Promise<AuthUser> {
  const res = await fetch(`${API_BASE_URL}/auth/register/user`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Signup failed");
  }
  return normalizeUser(await res.json(), "user", payload.name, payload.email);
}

/** POST /api/auth/register/dealer */
export async function dealerSignup(
  payload: DealerSignupPayload
): Promise<AuthUser> {
  const res = await fetch(`${API_BASE_URL}/auth/register/dealer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Dealer registration failed");
  }
  return normalizeUser(
    await res.json(),
    "dealer",
    payload.name,
    payload.email
  );
}

/** Clear local session (no server-side logout endpoint provided) */
export async function logoutUser(): Promise<void> {
  if (typeof window !== "undefined") {
    localStorage.removeItem("autohub_token");
    localStorage.removeItem("autohub_user");
    document.cookie = "autohub_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = "autohub_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  }
}

/** Restore session from localStorage (no /auth/me endpoint provided) */
export async function getMe(): Promise<AuthUser | null> {
  const stored = localStorage.getItem("autohub_user");
  if (!stored) return null;
  return JSON.parse(stored) as AuthUser;
}

// ─── PROFILE ─────────────────────────────────────────────────

/** GET /api/dealers/me/profile */
export async function getProfile(): Promise<ProfileData> {
  const res = await fetch(`${API_BASE_URL}/dealers/me/profile`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    return { name: "", email: "", location: "", phone: "", whatsapp: "", taxNumber: "" };
  }
  const data = await res.json();
  const payload = data.data ?? data;
  return {
    name: payload.name ?? "",
    email: payload.email ?? "",
    location: payload.location ?? "",
    phone: payload.phone ?? "",
    whatsapp: payload.whatsapp ?? "",
    taxNumber: payload.taxNumber ?? "",
    avatar: payload.avatar ?? payload.avatarUrl ?? "",
    cover: payload.cover ?? payload.coverImage ?? payload.coverUrl ?? "",
  };
}

/** PUT /api/dealers/me/profile */
export async function updateProfile(data: ProfileData, avatarFile?: File, coverFile?: File): Promise<ProfileData> {
  const formData = new FormData();
  if (data.name) formData.append("name", data.name);
  if (data.email) formData.append("email", data.email);
  if (data.location) formData.append("location", data.location);
  if (data.phone) formData.append("phone", data.phone);
  if (data.whatsapp) formData.append("whatsapp", data.whatsapp);
  if (data.taxNumber) formData.append("taxNumber", data.taxNumber);
  
  if (avatarFile) formData.append("avatar", avatarFile);
  if (coverFile) formData.append("cover", coverFile);

  const token = getToken();
  const res = await fetch(`${API_BASE_URL}/dealers/me/profile`, {
    method: "PUT",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  if (!res.ok) throw new Error("Failed to update profile");
  const updated = await res.json();
  const payload = updated.data ?? updated;
  return {
    name: payload.name ?? data.name,
    email: payload.email ?? data.email,
    location: payload.location ?? data.location,
    phone: payload.phone ?? data.phone,
    whatsapp: payload.whatsapp ?? data.whatsapp,
    taxNumber: payload.taxNumber ?? data.taxNumber,
    avatar: payload.avatar ?? data.avatar,
    cover: payload.cover ?? payload.coverImage ?? data.cover,
  };
}

/** GET /api/users/me/profile (Best effort for regular users) */
export async function getUserProfile(): Promise<ProfileData> {
  const res = await fetch(`${API_BASE_URL}/users/me/profile`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    return { name: "", email: "", location: "", phone: "", whatsapp: "", taxNumber: "" };
  }
  const data = await res.json();
  const payload = data.data ?? data;
  return {
    name: payload.name ?? "",
    email: payload.email ?? "",
    location: payload.location ?? "",
    phone: payload.phone ?? "",
    whatsapp: payload.whatsapp ?? "",
    taxNumber: payload.taxNumber ?? "",
    avatar: payload.avatar ?? payload.avatarUrl ?? "",
    cover: payload.cover ?? payload.coverImage ?? payload.coverUrl ?? "",
  };
}

/** PUT /api/users/me/profile (Best effort for regular users) */
export async function updateUserProfile(data: ProfileData, avatarFile?: File, coverFile?: File): Promise<ProfileData> {
  const formData = new FormData();
  if (data.name) formData.append("name", data.name);
  if (data.email) formData.append("email", data.email);
  if (data.location) formData.append("location", data.location);
  if (data.phone) formData.append("phone", data.phone);
  if (data.whatsapp) formData.append("whatsapp", data.whatsapp);
  if (data.taxNumber) formData.append("taxNumber", data.taxNumber);
  
  if (avatarFile) formData.append("avatar", avatarFile);
  if (coverFile) formData.append("cover", coverFile);

  const token = getToken();
  const res = await fetch(`${API_BASE_URL}/users/me/profile`, {
    method: "PUT",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  if (!res.ok) throw new Error("Failed to update user profile");
  const updated = await res.json();
  const payload = updated.data ?? updated;
  return {
    name: payload.name ?? data.name,
    email: payload.email ?? data.email,
    location: payload.location ?? data.location,
    phone: payload.phone ?? data.phone,
    whatsapp: payload.whatsapp ?? data.whatsapp,
    taxNumber: payload.taxNumber ?? data.taxNumber,
    avatar: payload.avatar ?? data.avatar,
    cover: payload.cover ?? payload.coverImage ?? data.cover,
  };
}

// ─── LISTINGS / POSTS ─────────────────────────────────────────

/** GET /api/posts */
export async function getListings(): Promise<Listing[]> {
  const isServer = typeof window === "undefined";
  const url = isServer ? `${API_BASE_URL}/posts` : `/api/posts`;
  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error("Failed to fetch listings");
  const data = await res.json();
  const payload = data.data ?? data;
  const posts = Array.isArray(payload) ? payload : (payload.posts ?? []);
  return posts.map(mapApiPostToListing);
}

/** GET /api/posts/:id */
export async function getListingById(id: string): Promise<Listing> {
  const res = await fetch(`${API_BASE_URL}/posts/${id}`);
  if (!res.ok) throw new Error("Failed to fetch listing");
  const data = await res.json();
  const payload = data.data ?? data;
  const post = payload.post ?? payload;
  return mapApiPostToListing(post);
}

/** POST /api/posts  — sends multipart/form-data so images are real files */
export async function createListing(
  listing: Omit<Listing, "id">,
  imageFiles?: File[]
): Promise<Listing> {
  const formData = new FormData();
  formData.append("title", listing.name);
  
  let desc = listing.description;
  if (listing.isOffer && listing.offerPrice) {
    desc += ` [OFFER:${listing.offerPrice.replace(/[^0-9.]/g, "")}]`;
  }
  if (listing.payments && listing.payments.length > 0) {
    desc += ` [PAYMENTS:${listing.payments.join(",")}]`;
  }
  formData.append("description", desc);
  
  formData.append("brand", listing.manufacturer);
  formData.append("model", listing.model ?? "");
  formData.append("bodyType", listing.body);
  formData.append("year", listing.year.toString());
  formData.append("mileage", listing.mileage.replace(/[^0-9.]/g, ""));
  formData.append("price", listing.price.replace(/[^0-9.]/g, ""));
  formData.append("currency", "EGP");
  formData.append("condition", listing.category);
  formData.append("color", listing.color);
  formData.append("transmission", listing.transmission);
  formData.append("fuelType", listing.fuel);
  formData.append("contactPhone", listing.contactPhone ?? "");
  if (imageFiles?.length) {
    imageFiles.forEach((f) => formData.append("images", f));
  }

  const token = getToken();
  const res = await fetch(`/api/posts`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to create listing");
  }
  const responseData = await res.json();
  const payload = responseData.data ?? responseData;
  return mapApiPostToListing(payload);
}

/** PUT /api/posts/:id */
export async function updateListing(
  id: string,
  listing: Partial<Listing>,
  imageFiles?: File[]
): Promise<Listing> {
  const formData = new FormData();
  if (listing.name) formData.append("title", listing.name);
  
  if (listing.description !== undefined) {
    let desc = listing.description;
    if (listing.isOffer && listing.offerPrice) {
      desc += ` [OFFER:${listing.offerPrice.replace(/[^0-9.]/g, "")}]`;
    }
    if (listing.payments && listing.payments.length > 0) {
      desc += ` [PAYMENTS:${listing.payments.join(",")}]`;
    }
    formData.append("description", desc);
  }
  
  if (listing.manufacturer) formData.append("brand", listing.manufacturer);
  if (listing.model) formData.append("model", listing.model);
  if (listing.body) formData.append("bodyType", listing.body);
  if (listing.year) formData.append("year", listing.year.toString());
  if (listing.mileage) formData.append("mileage", listing.mileage.replace(/[^0-9.]/g, ""));
  if (listing.price) formData.append("price", listing.price.replace(/[^0-9.]/g, ""));
  if (listing.category) formData.append("condition", listing.category);
  if (listing.color) formData.append("color", listing.color);
  if (listing.transmission) formData.append("transmission", listing.transmission);
  if (listing.fuel) formData.append("fuelType", listing.fuel);
  if (listing.contactPhone) formData.append("contactPhone", listing.contactPhone);
  if (imageFiles?.length) {
    imageFiles.forEach((f) => formData.append("images", f));
  }

  const token = getToken();
  const res = await fetch(`${API_BASE_URL}/posts/${id}`, {
    method: "PUT", // or PATCH, try PUT first based on standard REST
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to update listing");
  }
  const responseData = await res.json();
  const payload = responseData.data ?? responseData;
  return mapApiPostToListing(payload);
}

/** DELETE /api/posts/:id */
export async function deleteListingAPI(id: string): Promise<void> {
  const token = getToken();
  const res = await fetch(`${API_BASE_URL}/posts/${id}`, {
    method: "DELETE",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to delete listing");
  }
}

// ─── UNIFIED SEARCH & LEARNING ────────────────────────────────

export interface LearningCar {
  id: string;        // used as the href — encodes brand + model
  name: string;
  brand: string;
  model: string;
  year: string;
  engine: string;
  hp: string;
  image: string;
  description: string;
}

/** Returns the local /images/... path for the best available photo across all generations. */
function getModelImage(model: { g: CarGeneration[] }): string {
  for (const gen of model.g) {
    // Prefer photos[] (external URLs → converted to local /images/ paths)
    if (gen.photos && gen.photos.length > 0) {
      const first = gen.photos[0];
      if (first) return toLocalImage(first);
    }
    // Fall back to i field (data\images\... local path → convert to /images/)
    if (gen.i) return toLocalImage(gen.i);
  }
  return "";
}

/**
 * Build a flat LearningCar[] from the full CAR_DATA dataset.
 * Each entry represents one model (using its first generation's data for specs).
 * The `id` encodes the brand/model path so it links to /learn/[brand]/[model].
 */
function buildLearningIndex(): LearningCar[] {
  const results: LearningCar[] = [];

  (CAR_DATA as CarBrand[]).forEach((brand) => {
    brand.m.forEach((model) => {
      const g0: CarGeneration | undefined = model.g[0];
      if (!g0) return;

      // Use our new dynamic endpoint that redirects to Cloudinary
      // The local images folder was deleted, so we must fetch via Cloudinary on the fly
      const image = `/api/images/cover?brand=${encodeURIComponent(brand.n)}&model=${encodeURIComponent(model.n)}`;

      const firstEngine = g0.mods?.[0]?.engine ?? "";
      const hp = g0.hp
        ? g0.hp.replace("Power from ", "").replace(" to ", "–")
        : "";

      results.push({
        // Encode brand+model into the id so search results link correctly
        id: `${encodeURIComponent(brand.n)}/${encodeURIComponent(model.n)}`,
        name: model.n,
        brand: brand.n,
        model: model.n.replace(new RegExp(`^${brand.n}\\s*`, "i"), "").trim() || model.n,
        year: g0.y ?? "",
        engine: firstEngine,
        hp,
        image, // local /images/... path or empty string
        description: g0.desc ?? "",
      });
    });
  });

  return results;
}

// Build once at module level (server-side, no repeated work)
const LEARNING_INDEX: LearningCar[] = buildLearningIndex();

export async function getLearningCars(query?: string): Promise<LearningCar[]> {
  if (!query || !query.trim()) return LEARNING_INDEX;

  const q = query.toLowerCase().trim();
  return LEARNING_INDEX.filter(
    (car) =>
      car.name.toLowerCase().includes(q) ||
      car.brand.toLowerCase().includes(q) ||
      car.model.toLowerCase().includes(q)
  );
}

export async function searchMarketplace(query: string): Promise<Listing[]> {
  const allListings = await getListings().catch(() => []);
  if (!query) return allListings;

  const q = query.toLowerCase();
  return allListings.filter(
    (car) =>
      car.name.toLowerCase().includes(q) ||
      car.manufacturer.toLowerCase().includes(q) ||
      car.model.toLowerCase().includes(q) ||
      car.description.toLowerCase().includes(q)
  );
}

export async function unifiedSearch(query: string) {
  const [learning, ads] = await Promise.all([
    getLearningCars(query),
    searchMarketplace(query),
  ]);
  return { learning, ads };
}
