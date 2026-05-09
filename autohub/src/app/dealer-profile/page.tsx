"use client";

import { useState, useRef, useEffect } from "react";
import PageNavbar from "../../components/PageNavbar";
import { useAuth } from "../../context/AuthContext";
import { getProfile, updateProfile, getListings } from "../../lib/api";
import { useSavedCars } from "../../context/SavedCarsContext";
import { usePosts } from "../../context/PostsContext";
import SavedCarsGrid from "../../components/SavedCarsGrid";
import type { ProfileData } from "../../lib/api";
import type { Listing } from "../../context/PostsContext";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function DealerProfile() {
  const { isLoggedIn, logout, user, userRole, setAuth } = useAuth();
  const router = useRouter();
  const { savedCars } = useSavedCars();
  const { deleteListing } = usePosts();

  const [activeTab, setActiveTab] = useState<"listings" | "saved" | "settings">("listings");
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarSrc, setAvatarSrc] = useState<string | null>(null);
  const [coverSrc, setCoverSrc] = useState<string | null>(null);
  
  const [myListings, setMyListings] = useState<Listing[]>([]);

  const defaultProfile: ProfileData = {
    name: user?.name ?? "User",
    location: "",
    phone: "",
    whatsapp: "",
    taxNumber: "",
    email: user?.email ?? "",
  };

  const [formData, setFormData] = useState<ProfileData>(defaultProfile);
  const [originalData, setOriginalData] = useState<ProfileData>(defaultProfile);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Load profile from API on mount — only for dealers
  useEffect(() => {
    if (!isLoggedIn || userRole !== "dealer") {
      setLoading(false);
      return;
    }
    
    // Fetch profile and listings
    Promise.all([
      getProfile(),
      getListings().catch(() => [])
    ]).then(([profileData, listingsData]) => {
        // Seed with auth user data if API returned empty fields
        const merged: ProfileData = {
          name: profileData.name || user?.name || "",
          email: profileData.email || user?.email || "",
          location: profileData.location,
          phone: profileData.phone,
          whatsapp: profileData.whatsapp,
          taxNumber: profileData.taxNumber,
          avatar: profileData.avatar,
          cover: profileData.cover,
        };
        setFormData(merged);
        setOriginalData(merged);
        
        if (profileData.avatar) setAvatarSrc(profileData.avatar);
        if (profileData.cover) setCoverSrc(profileData.cover);
        
        // Filter listings to only show the ones belonging to this dealer
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
    if (!formData.name || !formData.phone) {
      alert("Name and Phone cannot be empty");
      return;
    }
    setSaving(true);
    try {
      const updated = await updateProfile(formData, avatarFile || undefined, coverFile || undefined);
      setOriginalData(updated);

      if (user) {
        const updatedUser = { ...user, name: updated.name, email: updated.email };
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
          setFormData(prev => ({ ...prev, avatar: base64 }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCoverFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const base64 = event.target.result as string;
          setCoverSrc(base64);
          setFormData(prev => ({ ...prev, cover: base64 }));
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
        <div style={{ textAlign: "center", padding: "80px 20px", color: "#555" }}>
          <div style={{ fontSize: "3rem", marginBottom: "16px" }}>🔒</div>
          <h2 style={{ marginBottom: "12px" }}>You must be logged in to view this page.</h2>
          <button className="btn-primary" style={{ background: "#1a1a2e", color: "#fff", border: "none", padding: "12px 30px", borderRadius: "8px", cursor: "pointer", fontSize: "1rem" }} onClick={() => router.push("/login")}>Go to Login</button>
        </div>
      </>
    );
  }

  if (userRole !== "dealer") {
    return (
      <>
        <PageNavbar />
        <div style={{ textAlign: "center", padding: "80px 20px", color: "#555" }}>
          <div style={{ fontSize: "3rem", marginBottom: "16px" }}>🚫</div>
          <h2 style={{ marginBottom: "12px" }}>Dealer account required.</h2>
          <p style={{ marginBottom: "20px", color: "#888" }}>This page is only accessible to registered dealers.</p>
          <button style={{ background: "#1a1a2e", color: "#fff", border: "none", padding: "12px 30px", borderRadius: "8px", cursor: "pointer", fontSize: "1rem" }} onClick={() => router.push("/dealer-signup")}>Register as a Dealer</button>
        </div>
      </>
    );
  }

  if (loading) {
    return (
      <>
        <PageNavbar />
        <div style={{ textAlign: "center", padding: "80px 20px", color: "#aaa" }}>Loading profile...</div>
      </>
    );
  }

  return (
    <div className="profile-page-container">
      <PageNavbar />
      
      {/* COVER */}
      <div className="cover-section">
        <div 
          className="cover-bg" 
          id="coverBg"
          style={coverSrc ? { background: `url(${coverSrc}) center/cover no-repeat` } : {}}
        >
          <button className="cover-edit-btn" onClick={() => coverInputRef.current?.click()}>📷 Change Cover</button>
          <input type="file" ref={coverInputRef} accept="image/*" style={{ display: "none" }} onChange={handleCoverChange} />
        </div>
        <div className="avatar-wrap">
          <div
            className="avatar avatar-clickable"
            id="avatarCircle"
            onClick={() => fileInputRef.current?.click()}
            title="Click to change profile photo"
          >
            {avatarSrc ? <img src={avatarSrc} alt="Avatar" /> : (originalData.name.charAt(0).toUpperCase() || "A")}
            <div className="avatar-hover-overlay">
              <span className="avatar-camera-icon">📷</span>
            </div>
          </div>
          <input type="file" ref={fileInputRef} accept="image/*" style={{ display: "none" }} onChange={handlePhotoChange} />
        </div>
      </div>

      {/* BODY */}
      <div className="profile-body">

        {/* SIDEBAR */}
        <aside className="sidebar-info">
          <div className="info-card">
            <div className="user-name">{originalData.name}</div>
            <div className="user-email">{originalData.email}</div>
            <div className="user-badge">⭐ Verified Member</div>
            <div className="user-since">Member since April 2020</div>
            <button className="edit-btn" onClick={() => setIsModalOpen(true)}>✏️ Edit Profile</button>
          </div>

          <div className="stats-card">
            <div className="stat"><div className="sv">{myListings.length}</div><div className="sl">Listings</div></div>
            <div className="stat"><div className="sv">{savedCars.length}</div><div className="sl">Saved</div></div>
            <div className="stat"><div className="sv">98%</div><div className="sl">Response</div></div>
          </div>

          <div className="contact-card">
            <div className="cc-title">Contact Info</div>
            <div className="cc-row"><span>📧</span><span>{originalData.email || "Not provided"}</span></div>
            <div className="cc-row"><span>📞</span><span>{originalData.phone || "Not provided"}</span></div>
            <div className="cc-row"><span>📍</span><span>{originalData.location || "Not provided"}</span></div>
          </div>
        </aside>

        {/* MAIN */}
        <main className="main-content">
          <div className="tabs-bar">
            <button className={`ptab ${activeTab === "listings" ? "active" : ""}`} onClick={() => setActiveTab("listings")}>🚗 My Listings</button>
            <button className={`ptab ${activeTab === "saved" ? "active" : ""}`} onClick={() => setActiveTab("saved")}>❤ Saved</button>
            <button className={`ptab ${activeTab === "settings" ? "active" : ""}`} onClick={() => setActiveTab("settings")}>⚙️ Settings</button>
          </div>

          {/* LISTINGS */}
          <div className={`tab-content ${activeTab === "listings" ? "active" : "hidden"}`}>
            <div className="tab-toolbar">
              <span className="tab-count">My Listings ({myListings.length})</span>
              <Link href="/sell-car" className="add-btn">+ Add New Car</Link>
            </div>
            <div className="cars-grid">
              {myListings.length === 0 ? (
                <div style={{ padding: "40px 0", color: "#888", gridColumn: "1 / -1", textAlign: "center" }}>No listings found.</div>
              ) : (
                myListings.map(car => (
                  <Link href={car.link} key={car.id} style={{ textDecoration: 'none' }}>
                    <div className="car-card">
                      <div className="cc-img">
                        <img src={car.image} alt={car.name} />
                      </div>
                      <div className="cc-name">{car.name} <span>{car.year}</span></div>
                      <div className="cc-meta" style={{ fontSize: '0.85rem', color: '#888', marginBottom: '8px' }}>
                        <span>👤 {car.dealerName || `${car.manufacturer} Dealer`}</span>
                      </div>
                      <div className="cc-price" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: '1.2' }}>
                        {car.isOffer && car.offerPrice ? (
                          <>
                            <span style={{ textDecoration: 'line-through', fontSize: '0.8em', opacity: 0.7, color: 'white' }}>{car.price}</span>
                            <span style={{ color: '#dd0000' }}>{car.offerPrice}</span>
                          </>
                        ) : (
                          <span>{car.price}</span>
                        )}
                      </div>
                      <div className="cc-meta">🔄 {car.mileage} • {car.location}</div>
                      <div className="cc-actions">
                        <button className="cc-btn" onClick={(e) => { e.preventDefault(); router.push(`/sell-car?edit=${car.id}`); }}>Edit</button>
                        <button className="cc-btn del" onClick={(e) => handleDeleteListing(e, car.id)}>Delete</button>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* SAVED */}
          <div className={`tab-content ${activeTab === "saved" ? "active" : "hidden"}`}>
            <div className="tab-toolbar">
              <span className="tab-count">Saved Cars ({savedCars.length})</span>
            </div>
            <SavedCarsGrid />
          </div>



          {/* SETTINGS */}
          <div className={`tab-content ${activeTab === "settings" ? "active" : "hidden"}`}>
            <div className="settings-wrap">

              <div className="sg">
                <div className="sg-title">Personal Information</div>
                <div className="sg-field"><label>Full Name</label><input type="text" name="name" value={formData.name} onChange={handleChange} /></div>
                <div className="sg-field"><label>Email Address</label><input type="email" name="email" value={formData.email} onChange={handleChange} /></div>
                <div className="sg-field"><label>Phone Number</label><input type="tel" name="phone" value={formData.phone} onChange={handleChange} /></div>
                <div className="sg-field"><label>City / Area</label><input type="text" name="location" value={formData.location} onChange={handleChange} /></div>
                <button className="save-btn" onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "💾 Save Changes"}</button>
              </div>

              <div className="sg">
                <div className="sg-title">Change Password</div>
                <div className="sg-field"><label>Current Password</label><input type="password" placeholder="Enter current password"/></div>
                <div className="sg-field"><label>New Password</label><input type="password" placeholder="Enter new password"/></div>
                <div className="sg-field"><label>Confirm New Password</label><input type="password" placeholder="Confirm new password"/></div>
                <button className="save-btn">🔒 Update Password</button>
              </div>

              <div className="sg danger-sg">
                <div className="sg-title">Danger Zone</div>
                <p>These actions are permanent and cannot be undone.</p>
                <div className="danger-row">
                  <button className="danger-btn" onClick={handleLogout}>🚪 Log Out</button>
                  <button className="danger-btn red">🗑️ Delete Account</button>
                </div>
              </div>

            </div>
          </div>

        </main>
      </div>

      {/* EDIT MODAL */}
      <div className={`modal-overlay ${isModalOpen ? "" : "hidden"}`}>
        <div className="modal">
          <div className="modal-header">
            <h3>Edit Profile</h3>
            <button className="modal-close" onClick={handleCancelModal}>✕</button>
          </div>
          <div className="modal-body">
            <div className="mf"><label>Full Name</label><input type="text" name="name" value={formData.name} onChange={handleChange}/></div>
            <div className="mf"><label>Email</label><input type="email" name="email" value={formData.email} onChange={handleChange}/></div>
            <div className="mf"><label>Phone</label><input type="tel" name="phone" value={formData.phone} onChange={handleChange}/></div>
            <div className="mf"><label>City / Area</label><input type="text" name="location" value={formData.location} onChange={handleChange}/></div>
          </div>
          <div className="modal-footer">
            <button className="btn-cancel" onClick={handleCancelModal}>Cancel</button>
            <button className="btn-save" onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</button>
          </div>
        </div>
      </div>
      
      {showSuccess && <div className="toast">✅ Profile updated successfully!</div>}
    </div>
  );
}
