"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";

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

          <button 
            className={`hamburger ${menuOpen ? "open" : ""}`} 
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>

          <nav className={`nav-links ${menuOpen ? "open" : ""}`}>
            <Link className="selected" href="/" onClick={() => setMenuOpen(false)}>
              Home
            </Link>
            <Link href="/learn" onClick={() => setMenuOpen(false)}>Explorer</Link>
            <Link href="/marketplace" onClick={() => setMenuOpen(false)}>Marketplace</Link>
            <Link href="/ai" onClick={() => setMenuOpen(false)}>AI</Link>
            <Link href={isLoggedIn ? (userRole === "dealer" ? "/dealer-profile" : "/user-profile") : "/login"} onClick={() => setMenuOpen(false)}>Profile</Link>
            {userRole !== "user" && (
              <Link
                href={userRole === "guest" ? "/dealer-signup" : "/sell-car"}
                onClick={() => setMenuOpen(false)}
                style={{
                  color: "#fff",
                  fontSize: "0.9rem",
                  display: "flex",
                  alignItems: "center"
                }}
              >
                Sell Car
              </Link>
            )}
          </nav>
        </div>
      </header>
    </>
  );
}
