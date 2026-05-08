"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { getListings, createListing } from "../lib/api";

export interface Listing {
  id: string;
  name: string;          // maps to API `title`
  year: string;
  category: string;      // maps to API `condition`
  mileage: string;
  transmission: string;
  location: string;
  price: string;
  image: string;         // first image URL for the card thumbnail
  images?: string[];     // all image URLs
  link: string;
  manufacturer: string;  // maps to API `brand`
  model: string;         // maps to API `model`
  body: string;          // maps to API `bodyType`
  fuel: string;          // maps to API `fuelType`
  color: string;
  description: string;
  negotiable: boolean;
  payments: string[];    // maps to API `paymentOptions`
  contactPhone: string;  // maps to API `contactPhone`
}

interface PostsContextType {
  listings: Listing[];
  loading: boolean;
  addListing: (listing: Omit<Listing, "id">, imageFiles?: File[]) => Promise<void>;
}

const PostsContext = createContext<PostsContextType>({
  listings: [],
  loading: false,
  addListing: async () => {},
});

export const PostsProvider = ({ children }: { children: React.ReactNode }) => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all listings on mount — GET /api/posts
  useEffect(() => {
    getListings()
      .then((data) => setListings(data))
      .catch(() => setListings([]))
      .finally(() => setLoading(false));
  }, []);

  // Called by the Sell Car form — POST /api/posts
  const addListing = async (listing: Omit<Listing, "id">, imageFiles?: File[]) => {
    const created = await createListing(listing, imageFiles);
    setListings((prev) => [created, ...prev]);
  };

  return (
    <PostsContext.Provider value={{ listings, loading, addListing }}>
      {children}
    </PostsContext.Provider>
  );
};

export const usePosts = () => useContext(PostsContext);
