"use client";

import { useState, useRef, useEffect } from "react";
import PageNavbar from "../../components/PageNavbar";
import SmoothImage from "../../components/SmoothImage";
import { useAuth } from "../../context/AuthContext";
import { useSavedCars } from "../../context/SavedCarsContext";
import SavedCarsGrid from "../../components/SavedCarsGrid";
import { useRouter } from "next/navigation";

export default function UserProfile() {
  const { isLoggedIn, logout, user, userRole, setAuth } = useAuth();
  const router = useRouter();
  const { savedCars } = useSavedCars();
  const [activeTab, setActiveTab] = useState<"info" | "saved">("info");

  const [isEditing, setIsEditing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [avatarSrc, setAvatarSrc] = useState(
    `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name ?? "User")}&background=1a1a2e&color=fff&size=200&bold=true`
  );

  const defaultProfile = {
    name: user?.name ?? "User",
    email: user?.email ?? "",
    phone: "",
    location: "",
  };

  const [formData, setFormData] = useState<any>(defaultProfile);
  const [originalData, setOriginalData] = useState<any>(defaultProfile);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load profile data on mount — keyed by user ID so profiles never bleed across accounts
  useEffect(() => {
    if (!isLoggedIn || userRole !== "user") {
      setLoading(false);
      return;
    }

    // First initialize from auth token & local storage for instant feedback
    const baseProfile: any = {
      name: user?.name || "User",
      email: user?.email || "",
      phone: "",
      location: "",
      avatar: "",
    };

    if (user?.id && typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(`user_profile_${user.id}`);
        if (stored) {
          const saved = JSON.parse(stored);
          baseProfile.phone    = saved.phone    ?? "";
          baseProfile.location = saved.location ?? "";
          baseProfile.avatar   = saved.avatar   ?? "";
        }
      } catch { /* ignore corrupt storage */ }
    }

    setFormData(baseProfile as any);
    setOriginalData(baseProfile as any);
    if (baseProfile.avatar) {
      setAvatarSrc(baseProfile.avatar);
    } else {
      setAvatarSrc(`https://ui-avatars.com/api/?name=${encodeURIComponent(baseProfile.name || "U")}&background=1a1a2e&color=fff&size=200&bold=true`);
    }

    // Now try to fetch the authoritative profile from the API
    import("../../lib/api").then(({ getUserProfile }) => {
      getUserProfile().then((profileData) => {
        if (profileData && profileData.email) { // Check if we actually got a valid payload
          const merged: any = {
            name: profileData.name || user?.name || "",
            email: profileData.email || user?.email || "",
            location: profileData.location || baseProfile.location,
            phone: profileData.phone || baseProfile.phone,
            avatar: profileData.avatar || baseProfile.avatar,
          };
          setFormData(merged);
          setOriginalData(merged);
          if (merged.avatar) {
            setAvatarSrc(merged.avatar);
          }
        }
      }).catch(() => { /* Ignore API errors, we already have local fallback */ })
        .finally(() => setLoading(false));
    });
  }, [isLoggedIn, userRole, user]);

  const handleSave = async (overrideData?: any, overrideFile?: File | null) => {
    const dataToSave = overrideData || formData;
    const fileToSave = overrideFile !== undefined ? overrideFile : avatarFile;
    if (!dataToSave.name || !dataToSave.email) {
      alert("Name and Email cannot be empty");
      return;
    }
    setSaving(true);
    try {
      // Persist to backend
      try {
        const { updateUserProfile } = await import("../../lib/api");
        await updateUserProfile(dataToSave as any, fileToSave || undefined);
      } catch (e) {
        console.warn("Backend save failed, falling back to local storage", e);
      }

      // Persist extras locally under a user-scoped key — as backup
      if (user?.id && typeof window !== "undefined") {
        localStorage.setItem(
          `user_profile_${user.id}`,
          JSON.stringify({ phone: dataToSave.phone, location: dataToSave.location, avatar: dataToSave.avatar })
        );
        const updatedUser = { ...user, name: dataToSave.name, email: dataToSave.email };
        setAuth(updatedUser);
        localStorage.setItem("autohub_user", JSON.stringify(updatedUser));
      }
      setOriginalData(dataToSave);
      setIsEditing(false);
      setShowSuccess(true);
      if (!dataToSave.avatar) {
        setAvatarSrc(`https://ui-avatars.com/api/?name=${encodeURIComponent(dataToSave.name)}&background=1a1a2e&color=fff&size=200&bold=true`);
      }
      setTimeout(() => setShowSuccess(false), 3500);
    } catch (e: any) {
      alert(e.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const [saving, setSaving] = useState(false);

  const handleCancel = () => {
    setFormData(originalData);
    setIsEditing(false);
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
          
          const newData = { ...formData, avatar: base64 };
          setFormData(newData);
          
          // Auto-save the image if we aren't currently editing
          if (!isEditing) {
             handleSave(newData, file);
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push("/");
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

  if (userRole !== "user") {
    return (
      <>
        <PageNavbar />
        <div style={{ textAlign: "center", padding: "80px 20px", color: "var(--text-secondary)" }}>
          <div style={{ fontSize: "3rem", marginBottom: "16px" }}></div>
          <h2 style={{ marginBottom: "12px" }}>User account required.</h2>
          <p style={{ marginBottom: "20px", color: "#888" }}>This page is only accessible to regular users.</p>
          <button style={{ background: "var(--subnav-bg)", color: "var(--background)", border: "none", padding: "12px 30px", borderRadius: "8px", cursor: "pointer", fontSize: "1rem" }} onClick={() => router.push("/")}>Go Home</button>
        </div>
      </>
    );
  }

  if (loading) {
    return (
      <>
        <PageNavbar />
        <div className="page-header">
          <div className="skeleton skeleton-text medium" style={{ height: "40px", marginBottom: "8px", maxWidth: "200px", margin: "0 auto" }} />
          <div className="skeleton skeleton-text" style={{ height: "20px", maxWidth: "300px", margin: "0 auto" }} />
          <hr />
        </div>
        <div className="profile-wrapper" style={{ display: 'flex', gap: '32px', maxWidth: '1000px', margin: '40px auto', padding: '0 20px' }}>
          <div className="profile-sidebar" style={{ width: '300px', flexShrink: 0 }}>
            <div className="skeleton skeleton-rect" style={{ height: "250px", borderRadius: "12px", marginBottom: "20px" }} />
            <div className="skeleton skeleton-text" style={{ height: "40px" }} />
          </div>
          <div className="profile-content" style={{ flex: 1 }}>
            <div className="skeleton skeleton-rect" style={{ height: "400px", borderRadius: "12px" }} />
          </div>
        </div>
      </>
    );
  }

  const mapLink = `https://maps.google.com/?q=${encodeURIComponent(formData.location)}`;

  return (
    <>
      <PageNavbar />
      <div className="page-header">
        <h1>My Profile</h1>
        <p>Manage your personal information</p>
        <hr />
      </div>

      <div className="profile-wrapper">
        {/* LEFT: Avatar Card */}
        <div className="avatar-card">
          <div className="avatar-wrap" onClick={() => fileInputRef.current?.click()}>
            <SmoothImage src={avatarSrc} alt="Profile Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div className="avatar-overlay">
              <span></span>
              <span>Change Photo</span>
            </div>
            <input type="file" ref={fileInputRef} accept="image/*" style={{ display: "none" }} onChange={handlePhotoChange} />
          </div>

          <h2 className="avatar-name">{formData.name}</h2>
          <p className="avatar-role">Member</p>
          <p className="avatar-joined">Member since April 2024</p>

          <div className="avatar-stats">
            <div className="astat"><div className="astat-val">{savedCars.length}</div><div className="astat-lbl">Saved Cars</div></div>
            <div className="astat"><div className="astat-val">5</div><div className="astat-lbl">Searches</div></div>
            <div className="astat"><div className="astat-val">New</div><div className="astat-lbl">Member</div></div>
          </div>

          <button
            style={{ marginTop: "20px", width: "100%", padding: "10px", background: "#fee", color: "#e33", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}
            onClick={handleLogout}
          >
            Log Out
          </button>
        </div>

        {/* RIGHT: Tabs */}
        <div className="info-card">
          {/* Tab bar */}
          <div style={{ display: "flex", gap: 0, borderBottom: "2px solid #f0f0f5", marginBottom: "24px" }}>
            <button
              onClick={() => setActiveTab("info")}
              style={{ padding: "10px 20px", border: "none", background: "transparent", fontWeight: 700, fontSize: "0.88rem", cursor: "pointer", borderBottom: activeTab === "info" ? "2px solid #1a1a2e" : "2px solid transparent", color: activeTab === "info" ? "#1a1a2e" : "#aaa", marginBottom: "-2px" }}
            >Personal Info</button>
            <button
              onClick={() => setActiveTab("saved")}
              style={{ padding: "10px 20px", border: "none", background: "transparent", fontWeight: 700, fontSize: "0.88rem", cursor: "pointer", borderBottom: activeTab === "saved" ? "2px solid #1a1a2e" : "2px solid transparent", color: activeTab === "saved" ? "#1a1a2e" : "#aaa", marginBottom: "-2px", display: "flex", alignItems: "center", gap: "6px" }}
            >
              Saved Cars
              {savedCars.length > 0 && (
                <span style={{ background: "var(--subnav-bg)", color: "var(--background)", borderRadius: "20px", fontSize: "0.7rem", padding: "1px 7px", fontWeight: 800 }}>
                  {savedCars.length}
                </span>
              )}
            </button>
          </div>

          {/* Personal Info Tab */}
          {activeTab === "info" && (
            <>
              <div className="info-header">
                <h3>Personal Information</h3>
                <button className={`btn-edit ${isEditing ? "active" : ""}`} onClick={isEditing ? undefined : () => setIsEditing(true)}>
                  {isEditing ? "Editing..." : "Edit"}
                </button>
              </div>
              <div className="info-form">
                {["name", "email", "phone", "location"].map((field) => {
                  const icons: Record<string, string> = { name: "", email: "", phone: "", location: "" };
                  const labels: Record<string, string> = { name: "Full Name", email: "Email Address", phone: "Phone Number", location: "Location" };
                  return (
                    <div key={field} className="field-group">
                      <label>{labels[field]}</label>
                      <div className="field-wrap" style={{ background: isEditing ? "#fff" : "" }}>
                        <span className="field-icon">{icons[field]}</span>
                        <input
                          type={field === "email" ? "email" : field === "phone" ? "tel" : "text"}
                          name={field}
                          value={formData[field as keyof typeof formData]}
                          onChange={handleChange}
                          disabled={!isEditing}
                        />
                      </div>
                      {field === "location" && <a className="map-link" href={mapLink} target="_blank">View on Map</a>}
                    </div>
                  );
                })}
              </div>
              {isEditing && (
                <div className="form-actions">
                  <button className="btn-save" onClick={handleSave} disabled={saving}>
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                  <button className="btn-cancel" onClick={handleCancel}>Cancel</button>
                </div>
              )}
              {showSuccess && <div className="success-msg">Profile updated successfully!</div>}
            </>
          )}

          {/* Saved Cars Tab */}
          {activeTab === "saved" && (
            <>
              <div className="info-header">
                <h3>Saved Cars ({savedCars.length})</h3>
              </div>
              <SavedCarsGrid />
            </>
          )}
        </div>
      </div>
    </>
  );
}
