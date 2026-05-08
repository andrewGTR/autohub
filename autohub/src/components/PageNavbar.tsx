"use client";
import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";

import { useState, Suspense, useEffect } from "react";

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
    ? (isLoggedIn ? (userRole === "dealer" ? "/dealer-profile" : "/user-profile") : "/login")
    : "/login";
    
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <nav className="sub-navbar">
      <div className="nav-brand">
        <Link href="/">AUTO HUB</Link>
      </div>
      <form className="nav-search" onSubmit={handleSearch}>
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
      <ul className={`nav-links ${menuOpen ? "open" : ""}`}>
        <li><Link href="/" className={pathname === "/" ? "active" : ""} onClick={() => setMenuOpen(false)}>Home</Link></li>
        <li><Link href="/learn" className={pathname.startsWith("/learn") ? "active" : ""} onClick={() => setMenuOpen(false)}>Explorer</Link></li>
        <li><Link href="/marketplace" className={pathname === "/marketplace" ? "active" : ""} onClick={() => setMenuOpen(false)}>Marketplace</Link></li>
        <li><Link href="/ai" className={pathname === "/ai" ? "active" : ""} onClick={() => setMenuOpen(false)}>AI</Link></li>
        <li><Link href={profileHref} className={pathname.includes("login") || pathname.includes("signup") || pathname.includes("dealer-profile") || pathname.includes("user-profile") ? "active" : ""} onClick={() => setMenuOpen(false)}>Profile</Link></li>
      </ul>
    </nav>
  );
}

export default function PageNavbar() {
  return (
    <Suspense fallback={<nav className="sub-navbar"><div className="nav-brand"><Link href="/">AUTO HUB</Link></div></nav>}>
      <PageNavbarContent />
    </Suspense>
  );
}
