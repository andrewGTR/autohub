"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";

function HeaderMobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [mounted, setMounted] = useState(false);
  const { isLoggedIn, userRole } = useAuth();

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!mounted) return null;

  const profileHref = isLoggedIn ? (userRole === "dealer" ? "/dealer-profile" : "/user-profile") : "/login";

  return createPortal(
    <>
      <div className={`mobile-menu-backdrop ${open ? "open" : ""}`} onClick={onClose} />
      <div className={`mobile-menu-panel ${open ? "open" : ""}`}>
        <button className="mobile-close-btn" onClick={onClose} aria-label="Close menu">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        <nav className="mobile-menu-links">
          <Link className="selected" href="/" onClick={onClose}>Home</Link>
          <Link href="/learn" onClick={onClose}>Explorer</Link>
          <Link href="/marketplace" onClick={onClose}>Marketplace</Link>
          <Link href="/ai" onClick={onClose}>AI</Link>
          <Link href={profileHref} onClick={onClose}>Profile</Link>
          {userRole !== "user" && (
            <Link href={userRole === "guest" ? "/dealer-signup" : "/sell-car"} onClick={onClose}>Sell Car</Link>
          )}
        </nav>
      </div>
    </>,
    document.body
  );
}

export default function Header() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { isLoggedIn, userRole, logout } = useAuth();
  const router = useRouter();

  const openSearch = () => {
    setIsSearchOpen(true);
  };

  const closeSearch = () => {
    setIsSearchOpen(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      closeSearch();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSearch();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const profileHref = isLoggedIn ? (userRole === "dealer" ? "/dealer-profile" : "/user-profile") : "/login";

  return (
    <>
      <div
        className={`overlay ${isSearchOpen ? "active" : ""}`}
        id="overlay"
        onClick={closeSearch}
      ></div>

      <header className="header">
        <div className="navbar">
          <div className="logo">AUTO HUB</div>

          <form className="search-box" onSubmit={handleSearch} onClick={openSearch}>
            <button type="submit" aria-label="Search" style={{ position: 'absolute', right: '12px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0, color: '#fff' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
              </svg>
            </button>
            <input 
              type="text" 
              placeholder="Search" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </form>

          {/* Desktop nav-links (hidden on mobile) */}
          <nav className="nav-links nav-links-desktop">
            <Link className="selected" href="/">Home</Link>
            <Link href="/learn">Explorer</Link>
            <Link href="/marketplace">Marketplace</Link>
            <Link href="/ai">AI</Link>
            <Link href={profileHref}>Profile</Link>
            {userRole !== "user" && (
              <Link
                href={userRole === "guest" ? "/dealer-signup" : "/sell-car"}
                style={{ color: "#fff", fontSize: "0.9rem", display: "flex", alignItems: "center" }}
              >
                Sell Car
              </Link>
            )}
          </nav>

          {/* Hamburger (shown on mobile) */}
          <button 
            className={`hamburger ${menuOpen ? "open" : ""}`} 
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </header>

      {/* Mobile menu via portal */}
      <HeaderMobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
