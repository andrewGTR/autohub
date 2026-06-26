"use client";
import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { createPortal } from "react-dom";
import { useState, Suspense, useEffect } from "react";

function MobileMenu({ open, onClose, profileHref, pathname }: { open: boolean; onClose: () => void; profileHref: string; pathname: string }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll when menu is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!mounted) return null;

  return createPortal(
    <>
      {/* Backdrop overlay */}
      <div
        className={`mobile-menu-backdrop ${open ? "open" : ""}`}
        onClick={onClose}
      />
      {/* Slide-in menu panel */}
      <div className={`mobile-menu-panel ${open ? "open" : ""}`}>
        <button className="mobile-close-btn" onClick={onClose} aria-label="Close menu">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        <nav className="mobile-menu-links">
          <Link href="/" className={pathname === "/" ? "active" : ""} onClick={onClose}>Home</Link>
          <Link href="/learn" className={pathname.startsWith("/learn") ? "active" : ""} onClick={onClose}>Explorer</Link>
          <Link href="/marketplace" className={pathname === "/marketplace" ? "active" : ""} onClick={onClose}>Marketplace</Link>
          <Link href="/ai" className={pathname === "/ai" ? "active" : ""} onClick={onClose}>AI</Link>
          <Link href={profileHref} className={pathname.includes("login") || pathname.includes("signup") || pathname.includes("dealer-profile") || pathname.includes("user-profile") ? "active" : ""} onClick={onClose}>Profile</Link>
        </nav>
      </div>
    </>,
    document.body
  );
}

function PageNavbarContent() {  
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { isLoggedIn, logout, userRole } = useAuth();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  const category = searchParams ? searchParams.get("category") : null;
  
  const profileHref = mounted 
    ? (isLoggedIn ? (userRole === "admin" ? "/admin" : userRole === "dealer" ? "/dealer-profile" : "/user-profile") : "/login")
    : "/login";
    
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <>
      <nav className="sub-navbar">
        <div className="nav-brand">
          <Link href="/">AUTO HUB</Link>
        </div>
        <form className="nav-search" onSubmit={handleSearch}>
          <button type="submit" aria-label="Search" style={{ position: 'absolute', right: '12px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0, color: '#888' }}>
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
        {/* Desktop links (hidden on mobile) */}
        <ul className="nav-links nav-links-desktop">
          <li><Link href="/" className={pathname === "/" ? "active" : ""}>Home</Link></li>
          <li><Link href="/learn" className={pathname.startsWith("/learn") ? "active" : ""}>Explorer</Link></li>
          <li><Link href="/marketplace" className={pathname === "/marketplace" ? "active" : ""}>Marketplace</Link></li>
          <li><Link href="/ai" className={pathname === "/ai" ? "active" : ""}>AI</Link></li>
          <li><Link href={profileHref} className={pathname.includes("login") || pathname.includes("signup") || pathname.includes("dealer-profile") || pathname.includes("user-profile") ? "active" : ""}>Profile</Link></li>
        </ul>
        {/* Hamburger button (shown on mobile) */}
        <button 
          className={`hamburger ${menuOpen ? "open" : ""}`} 
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </nav>
      {/* Mobile menu via portal - renders on document.body */}
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} profileHref={profileHref} pathname={pathname} />
    </>
  );
}

export default function PageNavbar() {
  return (
    <Suspense fallback={<nav className="sub-navbar"><div className="nav-brand"><Link href="/">AUTO HUB</Link></div></nav>}>
      <PageNavbarContent />
    </Suspense>
  );
}
