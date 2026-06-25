"use client";

// ============================================================
// SavedCarsContext — per-user wishlist with isolated storage
//
// SECURITY: Every key written to localStorage is scoped by the
// authenticated user's unique ID.  When no user is logged in
// we operate purely in-memory (nothing is persisted), so a
// guest or a different account can never see another user's
// saved cars.
// ============================================================

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { Listing } from "./PostsContext";
import { useAuth } from "./AuthContext";
import { getListingById } from "../lib/api";

// ─── Types ────────────────────────────────────────────────────

interface SavedCarsContextType {
  savedIds: string[];
  savedCars: Listing[];
  isSaved: (id: string) => boolean;
  toggleSave: (listing: Listing) => void;
  removeSaved: (id: string) => void;
  loadingSaved: boolean;
}

// ─── Context ──────────────────────────────────────────────────

const SavedCarsContext = createContext<SavedCarsContextType>({
  savedIds: [],
  savedCars: [],
  isSaved: () => false,
  toggleSave: () => {},
  removeSaved: () => {},
  loadingSaved: false,
});

// ─── Helpers ──────────────────────────────────────────────────

/**
 * Returns a user-scoped localStorage key.
 * Returns null when there is no authenticated user — callers
 * must treat null as "no persistence allowed".
 */
function storageKey(userId: string | undefined): string | null {
  if (!userId) return null;
  return `autohub_saved_cars_${userId}`;
}

function readIds(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeIds(key: string, ids: string[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(ids));
  } catch {
    // Storage quota exceeded — silently ignore
  }
}

// ─── Provider ─────────────────────────────────────────────────

export const SavedCarsProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const userId = user?.id;

  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [savedCars, setSavedCars] = useState<Listing[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);

  // Track the previous userId so we can detect account switches
  const prevUserIdRef = useRef<string | undefined>(undefined);

  // ── Load / reset whenever the authenticated user changes ────
  useEffect(() => {
    // If the user didn't actually change, skip
    if (prevUserIdRef.current === userId) return;
    prevUserIdRef.current = userId;

    // Always start from a clean slate — prevents leaking state
    // between accounts while hydration is in-flight
    setSavedIds([]);
    setSavedCars([]);

    const key = storageKey(userId);
    if (!key) {
      // Guest — no persistence, just empty state
      setLoadingSaved(false);
      return;
    }

    // Load from localStorage first for instant visual feedback
    const localIds = readIds(key);
    setSavedIds(localIds);

    setLoadingSaved(true);

    // Fetch the authoritative saved posts from the backend saved-posts endpoint
    import("../lib/api").then(({ getSavedPosts, getListingById }) => {
      getSavedPosts()
        .then((cars) => {
          const backendIds = cars.map((c) => c.id);

          // Union of local and backend saved posts to ensure no loss of data
          const combinedIds = Array.from(new Set([...localIds, ...backendIds]));
          setSavedIds(combinedIds);

          const localOnlyIds = localIds.filter((id) => !backendIds.includes(id));
          if (localOnlyIds.length === 0) {
            setSavedCars(cars);
            return;
          }

          // Hydrate only local-only IDs and append them
          return Promise.allSettled(localOnlyIds.map((id) => getListingById(id))).then((results) => {
            const extraCars = results
              .filter((r): r is PromiseFulfilledResult<Listing> => r.status === "fulfilled")
              .map((r) => r.value);
            setSavedCars([...cars, ...extraCars]);
          });
        })
        .catch((err) => {
          console.warn("Failed to load saved posts from backend saved-posts, using local only:", err);
          if (localIds.length > 0) {
            return Promise.allSettled(localIds.map((id) => getListingById(id))).then((results) => {
              const cars = results
                .filter((r): r is PromiseFulfilledResult<Listing> => r.status === "fulfilled")
                .map((r) => r.value);
              setSavedCars(cars);
            });
          }
        })
        .finally(() => {
          setLoadingSaved(false);
        });
    });
  }, [userId]);

  // ── Persist ids to localStorage whenever they change ────────
  useEffect(() => {
    const key = storageKey(userId);
    if (!key) return; // Guest — don't write anything
    writeIds(key, savedIds);
  }, [savedIds, userId]);

  // ── Actions ─────────────────────────────────────────────────

  const isSaved = useCallback(
    (id: string) => savedIds.includes(id),
    [savedIds]
  );

  const toggleSave = useCallback(
    (listing: Listing) => {
      if (!user) {
        alert("You must login to save a post.");
        return;
      }

      // Optimistically toggle state locally
      setSavedIds((prev) => {
        const alreadySaved = prev.includes(listing.id);
        if (alreadySaved) {
          // Remove
          setSavedCars((cars) => cars.filter((c) => c.id !== listing.id));
          return prev.filter((x) => x !== listing.id);
        } else {
          // Add
          setSavedCars((cars) => {
            if (cars.find((c) => c.id === listing.id)) return cars;
            return [...cars, listing];
          });
          return [...prev, listing.id];
        }
      });

      // Notify backend of the toggle
      import("../lib/api").then(({ toggleSavePost }) => {
        toggleSavePost(listing.id).catch((err) => {
          console.error("Backend toggle save failed:", err);
        });
      });
    },
    [user]
  );

  const removeSaved = useCallback((id: string) => {
    // Notify backend of the toggle (remove/unsave)
    import("../lib/api").then(({ toggleSavePost }) => {
      toggleSavePost(id).catch((err) => {
        console.error("Backend remove save failed:", err);
      });
    });

    setSavedIds((prev) => prev.filter((x) => x !== id));
    setSavedCars((prev) => prev.filter((c) => c.id !== id));
  }, []);

  return (
    <SavedCarsContext.Provider
      value={{ savedIds, savedCars, isSaved, toggleSave, removeSaved, loadingSaved }}
    >
      {children}
    </SavedCarsContext.Provider>
  );
};

export const useSavedCars = () => useContext(SavedCarsContext);
