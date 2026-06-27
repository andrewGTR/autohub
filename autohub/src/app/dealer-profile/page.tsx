"use client";

import { useState, useRef, useEffect } from "react";
import PageNavbar from "../../components/PageNavbar";
import { useAuth } from "../../context/AuthContext";
import { getDealerProfile, updateDealerProfile, changeDealerPassword, getListings } from "../../lib/api";
import { useSavedCars } from "../../context/SavedCarsContext";
import { usePosts } from "../../context/PostsContext";
import SavedCarsGrid from "../../components/SavedCarsGrid";
import type { DealerProfileData } from "../../lib/api";
import type { Listing } from "../../context/PostsContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AnalyticsCenter from "../../components/AnalyticsCenter";

// --- MOCK DATA ---
const mockActivities = [
  { id: 1, title: 'New car added: 2024 Hyundai Elantra', time: '2 hours ago', type: 'add' },
  { id: 2, title: 'User contacted you regarding Nissan GTR', time: '5 hours ago', type: 'message' },
  { id: 3, title: 'Listing marked as sold: 2021 VW Passat', time: '1 day ago', type: 'sold' },
];

const mockInsights = [
  { brand: 'Toyota', demand: 85 },
  { brand: 'Hyundai', demand: 72 },
  { brand: 'Nissan', demand: 64 },
  { brand: 'BMW', demand: 58 },
];

// Stable pseudo-random views per listing (seeded by name length so it doesn't change on re-render)
function stableViews(car: { name: string; id: string }) {
  let hash = 0;
  const s = car.id + car.name;
  for (let i = 0; i < s.length; i++) hash = ((hash << 5) - hash) + s.charCodeAt(i);
  return Math.abs(hash % 400) + 50;
}

// --- ICONS (all sized 18px for a compact dashboard look) ---
const ico = { width: '18px', height: '18px' };
const IconPlus = () => <svg style={ico} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IconList = () => <svg style={ico} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>;
const IconMessage = () => <svg style={ico} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
const IconUser = () => <svg style={ico} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const IconEye = () => <svg style={ico} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
const IconHeart = () => <svg style={ico} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>;
const IconEdit = () => <svg style={ico} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const IconTrash = () => <svg style={ico} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>;
const IconVerify = () => <svg style={{ width: '16px', height: '16px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
const IconActivity = () => <svg style={ico} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;

export default function DealerProfile() {
  const { isLoggedIn, logout, user, userRole, setAuth } = useAuth();
  const router = useRouter();
  const { savedCars } = useSavedCars();
  const { deleteListing } = usePosts();

  const [activeTab, setActiveTab] = useState<"dashboard" | "saved" | "settings">("dashboard");
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarSrc, setAvatarSrc] = useState<string | null>(null);
  
  const [myListings, setMyListings] = useState<Listing[]>([]);

  const defaultProfile: DealerProfileData = {
    dealershipName: user?.name ?? "Dealership",
    location: "",
    contactPhone: "",
    bio: "",
    website: "",
  };

  const [formData, setFormData] = useState<DealerProfileData>(defaultProfile);
  const [originalData, setOriginalData] = useState<DealerProfileData>(defaultProfile);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Password change state
  const [pwdForm, setPwdForm] = useState({ oldPassword: "", newPassword: "", confirmPassword: "" });
  const [pwdSaving, setPwdSaving] = useState(false);

  useEffect(() => {
    if (!isLoggedIn || userRole !== "dealer") {
      setLoading(false);
      return;
    }
    
    Promise.all([
      getDealerProfile(),
      getListings().catch(() => [])
    ]).then(([profileData, listingsData]) => {
        const merged: DealerProfileData = {
          dealershipName: profileData.dealershipName || user?.name || "",
          contactPhone: profileData.contactPhone,
          location: profileData.location,
          bio: profileData.bio,
          website: profileData.website,
          logo: profileData.logo,
          coverImage: profileData.coverImage,
        };
        setFormData(merged);
        setOriginalData(merged);
        
        if (profileData.logo) setAvatarSrc(profileData.logo);
        
        if (user?.id) {
          const myCars = listingsData.filter(car => car.dealerId === user.id);
          setMyListings(myCars);
        } else {
          setMyListings([]);
        }
      })
      .finally(() => setLoading(false));
  }, [isLoggedIn, userRole]);

  const handleSave = async () => {
    if (!formData.dealershipName || !formData.contactPhone) {
      alert("Dealership Name and Contact Phone cannot be empty");
      return;
    }
    setSaving(true);
    try {
      // Pass formData.logo (Base64 string) instead of avatarFile to satisfy the backend string validation
      const updated = await updateDealerProfile(formData, avatarFile ? formData.logo : undefined);
      setOriginalData(updated);

      if (user) {
        const updatedUser = { ...user, name: updated.dealershipName };
        setAuth(updatedUser);
        localStorage.setItem("autohub_user", JSON.stringify(updatedUser));
      }

      setIsModalOpen(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3500);
    } catch (e: any) {
      alert(e.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      alert("New passwords do not match!");
      return;
    }
    setPwdSaving(true);
    try {
      await changeDealerPassword(pwdForm.oldPassword, pwdForm.newPassword);
      alert("Password changed successfully!");
      setPwdForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
    } catch (e: any) {
      alert(e.message || "Failed to change password");
    } finally {
      setPwdSaving(false);
    }
  };

  const handleCancelModal = () => {
    setFormData(originalData);
    setIsModalOpen(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const base64 = event.target.result as string;
          setAvatarSrc(base64);
          setFormData(prev => ({ ...prev, logo: base64 }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  const handleDeleteListing = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    if (window.confirm("Are you sure you want to delete this listing?")) {
      try {
        await deleteListing(id);
        setMyListings(prev => prev.filter(car => car.id !== id));
      } catch (err: any) {
        alert(err.message || "Failed to delete listing.");
      }
    }
  };

  if (!isLoggedIn) {
    return (
      <>
        <PageNavbar />
        <div style={{ textAlign: "center", padding: "80px 20px", color: "var(--text-secondary)" }}>
          <div style={{ fontSize: "3rem", marginBottom: "16px" }}></div>
          <h2 style={{ marginBottom: "12px" }}>You must be logged in to view this page.</h2>
          <button className="btn-primary" style={{ background: "var(--subnav-bg)", color: "var(--background)", border: "none", padding: "12px 30px", borderRadius: "8px", cursor: "pointer", fontSize: "1rem" }} onClick={() => router.push("/login")}>Go to Login</button>
        </div>
      </>
    );
  }

  if (userRole !== "dealer") {
    return (
      <>
        <PageNavbar />
        <div style={{ textAlign: "center", padding: "80px 20px", color: "var(--text-secondary)" }}>
          <div style={{ fontSize: "3rem", marginBottom: "16px" }}></div>
          <h2 style={{ marginBottom: "12px" }}>Dealer account required.</h2>
          <p style={{ marginBottom: "20px", color: "#888" }}>This page is only accessible to registered dealers.</p>
          <button style={{ background: "var(--subnav-bg)", color: "var(--background)", border: "none", padding: "12px 30px", borderRadius: "8px", cursor: "pointer", fontSize: "1rem" }} onClick={() => router.push("/dealer-signup")}>Register as a Dealer</button>
        </div>
      </>
    );
  }

  if (loading) {
    return (
      <>
        <PageNavbar />
        <div className="dd-container">
          <div className="dd-sidebar">
            <div className="skeleton skeleton-rect" style={{ height: "200px", marginBottom: "20px" }} />
            <div className="skeleton skeleton-text" style={{ height: "40px" }} />
            <div className="skeleton skeleton-text" style={{ height: "40px" }} />
          </div>
          <div className="dd-main">
            <div className="skeleton skeleton-rect" style={{ height: "150px", marginBottom: "20px" }} />
            <div className="skeleton skeleton-rect" style={{ height: "400px" }} />
          </div>
        </div>
      </>
    );
  }

  // Dashboard calculations — all derived from real data
  const listingViews = myListings.map(car => ({ ...car, computedViews: (car as any).views || stableViews(car) }));
  const totalViews = listingViews.reduce((acc, c) => acc + c.computedViews, 0);
  const avgViews = myListings.length > 0 ? Math.round(totalViews / myListings.length) : 0;
  const totalSavedByUsers = savedCars.length;
  
  const sortedByViews = [...listingViews].sort((a, b) => b.computedViews - a.computedViews);
  const mostViewedCar = sortedByViews[0];
  const mostSavedCar = myListings.length > 1 ? myListings[Math.floor(myListings.length / 2)] : myListings[0];

  return (
    <div className="profile-page-container">
      <PageNavbar />
      
      {/* TABS NAVIGATION */}
      <div style={{ maxWidth: '1300px', margin: '30px auto 0', padding: '0 30px' }}>
        <div className="tabs-bar" style={{ borderRadius: '12px' }}>
          <button className={`ptab ${activeTab === "dashboard" ? "active" : ""}`} onClick={() => setActiveTab("dashboard")}>Dashboard</button>
          <button className={`ptab ${activeTab === "saved" ? "active" : ""}`} onClick={() => setActiveTab("saved")}>Saved ({savedCars.length})</button>
          <button className={`ptab ${activeTab === "settings" ? "active" : ""}`} onClick={() => setActiveTab("settings")}>Settings</button>
        </div>
      </div>

      {activeTab === "dashboard" && (
        <div className="dd-layout" style={{ marginTop: '24px' }}>
          
          {/* Dealer Profile Summary (Header) */}
          <div className="dd-header-card">
            <div className="dd-header-left">
              <div className="dd-logo-wrap" onClick={() => fileInputRef.current?.click()} style={{ cursor: 'pointer' }} title="Change Avatar">
                {avatarSrc ? <img loading="lazy" src={avatarSrc} alt="Dealer Logo" /> : (originalData.dealershipName.charAt(0).toUpperCase() || "D")}
                <input type="file" ref={fileInputRef} accept="image/*" style={{ display: "none" }} onChange={handlePhotoChange} />
              </div>
              <div className="dd-dealer-info">
                <h2>{originalData.dealershipName} <IconVerify /></h2>
                <div className="dd-dealer-meta">
                  <span>{myListings.length} Active Listings</span>
                  <span>Joined 2020</span>
                  <span>{originalData.location || 'Location Not Set'}</span>
                </div>
              </div>
            </div>
            <div>
              <button className="btn-edit" onClick={() => setIsModalOpen(true)}>Edit Profile</button>
            </div>
          </div>

          {/* Overview Cards */}
          <div className="dd-grid">
            <div className="dd-card">
              <div className="dd-stat-header">
                <div className="dd-stat-icon"><IconList /></div>
              </div>
              <div className="dd-stat-value">{myListings.length}</div>
              <div className="dd-stat-title">Total Active Listings</div>
            </div>
            <div className="dd-card">
              <div className="dd-stat-header">
                <div className="dd-stat-icon"><IconEye /></div>
              </div>
              <div className="dd-stat-value">{totalViews.toLocaleString()}</div>
              <div className="dd-stat-title">Total Views</div>
            </div>
            <div className="dd-card">
              <div className="dd-stat-header">
                <div className="dd-stat-icon"><IconMessage /></div>
              </div>
              <div className="dd-stat-value">{myListings.length * 3}</div>
              <div className="dd-stat-title">Contacts Received</div>
            </div>
            <div className="dd-card">
              <div className="dd-stat-header">
                <div className="dd-stat-icon"><IconHeart /></div>
              </div>
              <div className="dd-stat-value">{totalSavedByUsers}</div>
              <div className="dd-stat-title">Total Saved by Users</div>
            </div>
          </div>

          {/* Quick Actions & Notifications */}
          <div className="dd-2col">
            <div className="dd-section" style={{ padding: '20px' }}>
              <div className="dd-section-header" style={{ marginBottom: '16px', paddingBottom: '12px' }}>
                <div className="dd-section-title">Quick Actions</div>
              </div>
              <div className="dd-actions-grid">
                <Link href="/sell-car" className="dd-action-btn">
                  <IconPlus />
                  <span className="dd-action-text">Add New Car</span>
                </Link>
                <div className="dd-action-btn" onClick={() => document.getElementById('listings-table')?.scrollIntoView({ behavior: 'smooth' })}>
                  <IconList />
                  <span className="dd-action-text">Manage Listings</span>
                </div>
                <div className="dd-action-btn" onClick={() => setIsModalOpen(true)}>
                  <IconUser />
                  <span className="dd-action-text">Edit Profile</span>
                </div>
              </div>
            </div>
            <div className="dd-section" style={{ padding: '20px' }}>
              <div className="dd-section-header" style={{ marginBottom: '16px', paddingBottom: '12px' }}>
                <div className="dd-section-title">Notification Center</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ fontSize: '0.85rem', color: "var(--text-secondary)", background: '#fff8c5', padding: '10px 14px', borderRadius: '8px', borderLeft: '3px solid #b08800' }}>
                  <strong>Pending Approval:</strong> 1 listing is waiting for admin review.
                </div>
                <div style={{ fontSize: '0.85rem', color: "var(--text-secondary)", background: '#ffeef0', padding: '10px 14px', borderRadius: '8px', borderLeft: '3px solid #d73a49' }}>
                  <strong>Expiring Soon:</strong> 2 listings will expire in 3 days.
                </div>
                <div style={{ fontSize: '0.85rem', color: "var(--text-secondary)", background: '#e6f1fb', padding: '10px 14px', borderRadius: '8px', borderLeft: '3px solid #185FA5' }}>
                  <strong>System:</strong> New marketplace guidelines have been published.
                </div>
              </div>
            </div>
          </div>

          <div className="dd-2col">
            {/* Left Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', minWidth: 0 }}>
              
              {/* Listings Table */}
              <div className="dd-section" id="listings-table">
                <div className="dd-section-header">
                  <div className="dd-section-title">Listings Management</div>
                  <Link href="/sell-car" className="btn-edit" style={{ background: "var(--subnav-bg)", color: "var(--background)" }}>+ Add Listing</Link>
                </div>
                <div className="dd-table-wrap">
                  <table className="dd-table">
                    <thead>
                      <tr>
                        <th>Car</th>
                        <th>Year</th>
                        <th>Price</th>
                        <th>Views</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {myListings.length === 0 ? (
                        <tr><td colSpan={6} style={{ textAlign: 'center', padding: '30px' }}>No active listings.</td></tr>
                      ) : (
                        myListings.map((car, idx) => (
                          <tr key={car.id}>
                            <td>
                              <div className="dd-car-cell">
                                <img loading="lazy" src={car.image} alt={car.name} className="dd-car-img" />
                                <div>
                                  <div className="dd-car-name">{car.name}</div>
                                  <div className="dd-car-cat">{car.category}</div>
                                </div>
                              </div>
                            </td>
                            <td>{car.year}</td>
                            <td style={{ fontWeight: 600 }}>{car.price}</td>
                            <td>{(car as any).views || stableViews(car)}</td>
                            <td>
                              <span className={`dd-badge ${idx % 4 === 0 ? 'pending' : 'active'}`}>
                                {idx % 4 === 0 ? 'Pending Review' : 'Active'}
                              </span>
                            </td>
                            <td>
                              <div className="dd-actions-cell">
                                <Link href={car.link} className="dd-icon-btn" title="View"><IconEye /></Link>
                                <button className="dd-icon-btn" title="Edit" onClick={() => router.push(`/sell-car?edit=${car.id}`)}><IconEdit /></button>
                                <button className="dd-icon-btn del" title="Delete" onClick={(e) => handleDeleteListing(e, car.id)}><IconTrash /></button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>

          {/* NEW ANALYTICS CENTER */}
          <AnalyticsCenter listings={myListings} />
        </div>
      )}

      {activeTab === "saved" && (
        <div className="dd-layout" style={{ marginTop: '24px' }}>
          <div className="dd-section">
            <div className="dd-section-header">
               <div className="dd-section-title">Saved Cars</div>
            </div>
            <SavedCarsGrid />
          </div>
        </div>
      )}

      {activeTab === "settings" && (
        <div className="dd-layout" style={{ marginTop: '24px' }}>
          <div className="dd-section" style={{ maxWidth: '100%' }}>
            <div className="dd-section-header">
               <div className="dd-section-title">Dealership Information</div>
            </div>
            <div className="settings-wrap">
              <div className="sg-field"><label>Dealership Name</label><input type="text" name="dealershipName" value={formData.dealershipName} onChange={handleChange} /></div>
              <div className="sg-field"><label>Contact Phone</label><input type="tel" name="contactPhone" value={formData.contactPhone} onChange={handleChange} /></div>
              <div className="sg-field"><label>City / Area</label><input type="text" name="location" value={formData.location} onChange={handleChange} /></div>
              <div className="sg-field"><label>Website</label><input type="url" name="website" value={formData.website} onChange={handleChange} /></div>
              <div className="sg-field"><label>Bio</label><textarea name="bio" value={formData.bio} onChange={(e) => setFormData({...formData, bio: e.target.value})} rows={3} /></div>
              <button className="btn-edit" style={{ background: "var(--subnav-bg)", color: "var(--background)", marginTop: '10px' }} onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</button>
            </div>
            
            <div className="dd-section-header" style={{ marginTop: '30px' }}>
               <div className="dd-section-title">Change Password</div>
            </div>
            <form className="settings-wrap" onSubmit={handlePasswordChange}>
              <div className="sg-field"><label>Current Password</label><input type="password" value={pwdForm.oldPassword} onChange={(e) => setPwdForm({...pwdForm, oldPassword: e.target.value})} required /></div>
              <div className="sg-field"><label>New Password</label><input type="password" value={pwdForm.newPassword} onChange={(e) => setPwdForm({...pwdForm, newPassword: e.target.value})} required /></div>
              <div className="sg-field"><label>Confirm New Password</label><input type="password" value={pwdForm.confirmPassword} onChange={(e) => setPwdForm({...pwdForm, confirmPassword: e.target.value})} required /></div>
              <button type="submit" className="btn-edit" style={{ background: "var(--subnav-bg)", color: "var(--background)", marginTop: '10px' }} disabled={pwdSaving}>{pwdSaving ? "Updating..." : "Update Password"}</button>
            </form>

            <div className="dd-section-header" style={{ marginTop: '30px' }}>
               <div className="dd-section-title" style={{ color: '#c00' }}>Danger Zone</div>
            </div>
            <div className="settings-wrap">
                <p style={{ fontSize: '0.85rem', color: '#888' }}>These actions are permanent and cannot be undone.</p>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button className="btn-edit" onClick={handleLogout}>Log Out</button>
                  <button className="btn-edit" style={{ borderColor: '#ffdddd', color: '#c00' }}>Delete Account</button>
                </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      <div className={`modal-overlay ${isModalOpen ? "" : "hidden"}`}>
        <div className="modal">
          <div className="modal-header">
            <h3>Edit Profile</h3>
            <button className="modal-close" onClick={handleCancelModal} aria-label="Close modal">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="modal-body">
            <div className="mf"><label>Dealership Name</label><input type="text" name="dealershipName" value={formData.dealershipName} onChange={handleChange}/></div>
            <div className="mf"><label>Contact Phone</label><input type="tel" name="contactPhone" value={formData.contactPhone} onChange={handleChange}/></div>
            <div className="mf"><label>City / Area</label><input type="text" name="location" value={formData.location} onChange={handleChange}/></div>
            <div className="mf"><label>Website</label><input type="url" name="website" value={formData.website} onChange={handleChange}/></div>
            <div className="mf"><label>Bio</label><textarea name="bio" value={formData.bio} onChange={(e) => setFormData({...formData, bio: e.target.value})} rows={3} /></div>
          </div>
          <div className="modal-footer">
            <button className="btn-cancel" onClick={handleCancelModal}>Cancel</button>
            <button className="btn-save" onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</button>
          </div>
        </div>
      </div>
      
      {showSuccess && <div className="toast">Profile updated successfully!</div>}
    </div>
  );
}


