"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { useRouter } from "next/navigation";
import { logoutUser } from "../../lib/api";
import { API_BASE_URL } from "../../lib/config";
import s from "./admin.module.css";

// ─── Types ───────────────────────────────────────────────────

interface AdminPost {
  id?: string;
  _id?: string;
  title?: string;
  brand?: string;
  model?: string;
  status?: string;
  price?: number;
  currency?: string;
  mileage?: number;
  transmission?: string;
  bodyType?: string;
  fuelType?: string;
  year?: number;
  color?: string;
  description?: string;
  images?: string[];
  image?: string;
  dealer?: { name?: string; _id?: string; id?: string };
  dealerName?: string;
}

interface AdminUser {
  id?: string;
  _id?: string;
  name?: string;
  email?: string;
  role?: string;
  listings?: number;
  listingsCount?: number;
  createdAt?: string;
  joined?: string;
}

interface Vehicle {
  id?: string;
  _id?: string;
  brand?: string;
  model?: string;
  name?: string;
  bodyType?: string;
  fuelType?: string;
  transmission?: string;
  engineSize?: string;
  description?: string;
  image?: string;
  imageUrl?: string;
}

interface Stats {
  users?: {
    standardUsers?: number;
    dealers?: number;
    totalUsers?: number;
  };
  posts?: {
    pending?: number;
    approved?: number;
    rejected?: number;
    total?: number;
  };
}

type PageName = "dashboard" | "posts" | "users" | "vehicles";
type PostFilter = "all" | "pending" | "approved" | "rejected";

// ─── Helpers ─────────────────────────────────────────────────

function getToken(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("autohub_token") || "";
}

function authHeaders(json = true): HeadersInit {
  const h: Record<string, string> = { Authorization: `Bearer ${getToken()}` };
  if (json) h["Content-Type"] = "application/json";
  return h;
}

function capitalize(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
}

function getId(item: { id?: string; _id?: string }): string {
  return item.id ?? item._id ?? "";
}

// ─── Component ───────────────────────────────────────────────

export default function AdminPage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  // Pages
  const [activePage, setActivePage] = useState<PageName>("dashboard");

  // Stats
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Posts
  const [allPosts, setAllPosts] = useState<AdminPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsLoaded, setPostsLoaded] = useState(false);
  const [postFilter, setPostFilter] = useState<PostFilter>("all");

  // Users
  const [allUsers, setAllUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [userSearch, setUserSearch] = useState("");

  // Vehicles
  const [allVehicles, setAllVehicles] = useState<Vehicle[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);
  const [vehiclesLoaded, setVehiclesLoaded] = useState(false);

  // Vehicle modal
  const [vehicleModalOpen, setVehicleModalOpen] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [vBrand, setVBrand] = useState("");
  const [vModel, setVModel] = useState("");
  const [vBodyType, setVBodyType] = useState("");
  const [vFuelType, setVFuelType] = useState("");
  const [vTransmission, setVTransmission] = useState("");
  const [vEngineSize, setVEngineSize] = useState("");
  const [vDescription, setVDescription] = useState("");
  const [vImgFile, setVImgFile] = useState<File | null>(null);
  const [vImgPreview, setVImgPreview] = useState<string | null>(null);
  const [vehicleSaving, setVehicleSaving] = useState(false);
  const vehicleFileRef = useRef<HTMLInputElement>(null);

  // Post detail modal
  const [postModalOpen, setPostModalOpen] = useState(false);
  const [postModalData, setPostModalData] = useState<AdminPost | null>(null);

  // Toast
  const [toastMsg, setToastMsg] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimer = useRef<NodeJS.Timeout | null>(null);

  // Activity feed
  const [activities, setActivities] = useState<{ icon: string; text: string; time: string }[]>([]);

  // ─── Toast ────────────────────────────────────────────────

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setToastVisible(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastVisible(false), 3000);
  }, []);

  const addActivity = useCallback((text: string) => {
    setActivities((prev) => {
      const next = [{ icon: "", text, time: "Just now" }, ...prev];
      return next.slice(0, 10);
    });
  }, []);

  // ─── Stats ────────────────────────────────────────────────

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/stats`, { headers: authHeaders() });
      if (!res.ok) throw new Error("stats failed");
      const data = await res.json();
      const d = data.data ?? data;
      setStats(d);
      setStatsLoading(false);
    } catch {
      setStatsLoading(false);
    }
  }, []);

  // ─── Posts ────────────────────────────────────────────────

  const loadPosts = useCallback(async () => {
    setPostsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/posts`, { headers: authHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const raw = data.data ?? data;
      setAllPosts(Array.isArray(raw) ? raw : (raw.posts ?? []));
      setPostsLoaded(true);
    } catch (err: any) {
      showToast(" Failed to load posts: " + err.message);
    } finally {
      setPostsLoading(false);
    }
  }, [showToast]);

  const updatePostStatus = useCallback(async (id: string, status: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/posts/${id}/status`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setAllPosts((prev) =>
        prev.map((p) => (getId(p) === id ? { ...p, status } : p))
      );
      const p = allPosts.find((x) => getId(x) === id);
      addActivity(status === "approved" ? ` Approved: ${p?.title ?? id}` : ` Rejected: ${p?.title ?? id}`);
      showToast(status === "approved" ? " Post approved!" : " Post rejected.");
      setPostModalOpen(false);
      loadStats();
    } catch (err: any) {
      showToast(" Failed: " + err.message);
    }
  }, [allPosts, addActivity, showToast, loadStats]);

  const deletePost = useCallback(async (id: string) => {
    const p = allPosts.find((x) => getId(x) === id);
    const name = p?.title ?? id;
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`${API_BASE_URL}/admin/posts/${id}`, { method: "DELETE", headers: authHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setAllPosts((prev) => prev.filter((x) => getId(x) !== id));
      addActivity(` Deleted post: ${name}`);
      showToast(" Post deleted.");
      loadStats();
    } catch (err: any) {
      showToast(" Failed to delete: " + err.message);
    }
  }, [allPosts, addActivity, showToast, loadStats]);

  // ─── Users ────────────────────────────────────────────────

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/users`, { headers: authHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const raw = data.data ?? data;
      setAllUsers(Array.isArray(raw) ? raw : (raw.users ?? []));
      setUsersLoaded(true);
    } catch (err: any) {
      showToast(" Failed to load users: " + err.message);
    } finally {
      setUsersLoading(false);
    }
  }, [showToast]);

  const changeUserRole = useCallback(async (id: string, newRole: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/users/${id}/role`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setAllUsers((prev) =>
        prev.map((u) => (getId(u) === id ? { ...u, role: newRole } : u))
      );
      const u = allUsers.find((x) => getId(x) === id);
      addActivity(` ${u?.name ?? id} role → ${capitalize(newRole)}`);
      showToast(` ${u?.name ?? id} is now ${capitalize(newRole)}`);
    } catch (err: any) {
      showToast(" Failed: " + err.message);
    }
  }, [allUsers, addActivity, showToast]);

  // ─── Vehicles ─────────────────────────────────────────────

  const loadVehicles = useCallback(async () => {
    setVehiclesLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/vehicles`, { headers: authHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const raw = data.data ?? data;
      setAllVehicles(Array.isArray(raw) ? raw : (raw.vehicles ?? []));
      setVehiclesLoaded(true);
    } catch (err: any) {
      showToast(" Failed to load vehicles: " + err.message);
    } finally {
      setVehiclesLoading(false);
    }
  }, [showToast]);

  const openVehicleModal = (vehicle?: Vehicle) => {
    if (vehicle) {
      setEditingVehicleId(getId(vehicle));
      setVBrand(vehicle.brand ?? "");
      setVModel(vehicle.model ?? "");
      setVBodyType(vehicle.bodyType ?? "");
      setVFuelType(vehicle.fuelType ?? "");
      setVTransmission(vehicle.transmission ?? "");
      setVEngineSize(vehicle.engineSize ?? "");
      setVDescription(vehicle.description ?? "");
      setVImgPreview(vehicle.image ?? vehicle.imageUrl ?? null);
    } else {
      setEditingVehicleId(null);
      setVBrand(""); setVModel(""); setVBodyType(""); setVFuelType("");
      setVTransmission(""); setVEngineSize(""); setVDescription("");
      setVImgPreview(null);
    }
    setVImgFile(null);
    setVehicleModalOpen(true);
  };

  const saveVehicle = async () => {
    if (!vBrand.trim() || !vModel.trim()) { showToast(" Brand and Model are required"); return; }
    if (!editingVehicleId && !vImgFile) { showToast(" Vehicle image is required"); return; }
    setVehicleSaving(true);

    const formData = new FormData();
    formData.append("brand", vBrand.trim());
    formData.append("model", vModel.trim());
    if (vBodyType) formData.append("bodyType", vBodyType);
    if (vFuelType) formData.append("fuelType", vFuelType);
    if (vTransmission) formData.append("transmission", vTransmission);
    if (vEngineSize.trim()) formData.append("engineSize", vEngineSize.trim());
    if (vDescription.trim()) formData.append("description", vDescription.trim());
    
    // The backend's Joi validator is checking `req.body.image` as a string.
    // If we send a File, `multer` puts it in `req.file`, leaving `req.body.image` empty.
    // By sending the Base64 string instead, `multer` puts it in `req.body.image`, satisfying the validator!
    if (vImgPreview) {
      formData.append("image", vImgPreview);
    }

    const token = getToken();
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const url = editingVehicleId
        ? `${API_BASE_URL}/vehicles/${editingVehicleId}`
        : `${API_BASE_URL}/vehicles`;
      const method = editingVehicleId ? "PUT" : "POST";
      const res = await fetch(url, { method, headers, body: formData });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `HTTP ${res.status}`);
      }
      showToast(editingVehicleId ? " Vehicle updated!" : " Vehicle added!");
      addActivity(editingVehicleId ? ` Updated: ${vBrand} ${vModel}` : ` Added: ${vBrand} ${vModel}`);
      setVehicleModalOpen(false);
      loadVehicles();
      loadStats();
    } catch (err: any) {
      showToast(" " + err.message);
    } finally {
      setVehicleSaving(false);
    }
  };

  const deleteVehicle = async (id: string) => {
    const v = allVehicles.find((x) => getId(x) === id);
    const name = v ? `${v.brand ?? ""} ${v.model ?? ""}`.trim() : id;
    if (!confirm(`Delete "${name}"?`)) return;
    try {
      const res = await fetch(`${API_BASE_URL}/vehicles/${id}`, { method: "DELETE", headers: authHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setAllVehicles((prev) => prev.filter((x) => getId(x) !== id));
      addActivity(` Deleted: ${name}`);
      showToast(" Vehicle deleted.");
      loadStats();
    } catch (err: any) {
      showToast(" " + err.message);
    }
  };

  // ─── Page switch lazy-load ────────────────────────────────

  const switchPage = (page: PageName) => {
    setActivePage(page);
    if (page === "posts" && !postsLoaded) loadPosts();
    if (page === "users" && !usersLoaded) loadUsers();
    if (page === "vehicles" && !vehiclesLoaded) loadVehicles();
  };

  // ─── Init ─────────────────────────────────────────────────

  useEffect(() => { loadStats(); }, [loadStats]);

  // ─── Logout ───────────────────────────────────────────────

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  // ─── Derived ──────────────────────────────────────────────

  const pendingCount = allPosts.filter((p) => (p.status ?? "").toLowerCase() === "pending").length;
  const filteredPosts = postFilter === "all" ? allPosts : allPosts.filter((p) => (p.status ?? "").toLowerCase() === postFilter);
  const filteredUsers = userSearch
    ? allUsers.filter((u) => (u.name ?? "").toLowerCase().includes(userSearch.toLowerCase()) || (u.email ?? "").toLowerCase().includes(userSearch.toLowerCase()))
    : allUsers;

  // ─── Render helpers ───────────────────────────────────────

  const statusClass = (status: string) => {
    switch (status) {
      case "pending":  return s.statusPending;
      case "approved": return s.statusApproved;
      case "rejected": return s.statusRejected;
      default: return s.postStatus;
    }
  };

  const postCardClass = (status: string) => {
    switch (status) {
      case "pending":  return s.postCardPending;
      case "approved": return s.postCardApproved;
      case "rejected": return s.postCardRejected;
      default: return s.postCard;
    }
  };

  const roleClass = (role: string) => {
    switch (role) {
      case "user":   return s.roleUser;
      case "dealer": return s.roleDealer;
      case "admin":  return s.roleAdmin;
      default: return s.roleBadge;
    }
  };

  // ─── JSX ──────────────────────────────────────────────────

  return (
    <>
      {/* NAVBAR */}
      <nav className={s.navbar}>
        <div className={s.navBrand}>AUTO HUB <span className={s.adminTag}>ADMIN</span></div>
        <div className={s.navRight}>
          <div className={s.adminInfo}>
            <div className={s.adminAv}>{(user?.name ?? "A").charAt(0).toUpperCase()}</div>
            <div>
              <div className={s.adminName}>{user?.name ?? "Admin Panel"}</div>
              <div className={s.adminRole}>Super Administrator</div>
            </div>
          </div>
          <button className={s.logoutBtn} onClick={handleLogout}> Logout</button>
        </div>
      </nav>

      <div className={s.layout}>
        {/* SIDEBAR */}
        <aside className={s.sidebar}>
          <ul className={s.sideNav}>
            {(["dashboard", "posts", "users", "vehicles"] as PageName[]).map((page) => (
              <li
                key={page}
                className={activePage === page ? s.sideItemActive : s.sideItem}
                onClick={() => switchPage(page)}
              >
                <span>{page === "dashboard" ? "" : page === "posts" ? "" : page === "users" ? "" : ""}</span>
                {page === "dashboard" ? " Dashboard" : page === "posts" ? " Car Posts" : page === "users" ? " Users" : " Explorer"}
                {page === "posts" && (pendingCount > 0 || (stats?.posts?.pending ?? 0) > 0) && (
                  <span className={s.badge}>{pendingCount || stats?.posts?.pending || 0}</span>
                )}
              </li>
            ))}
          </ul>
        </aside>

        {/* MAIN */}
        <main className={s.mainContent}>

          {/* ───── DASHBOARD ───── */}
          {activePage === "dashboard" && (
            <div>
              <div className={s.pageTitle}>Dashboard Overview</div>
              <div className={s.statsRow}>
                <div className={`${s.statCard} ${statsLoading ? s.skeleton : ""}`}>
                  <div className={s.scIcon}></div>
                  <div className={s.scVal}>{stats?.posts?.total ?? "—"}</div>
                  <div className={s.scLbl}>Total Listings</div>
                </div>
                <div className={`${s.statCard} ${statsLoading ? s.skeleton : ""}`}>
                  <div className={s.scIcon}></div>
                  <div className={s.scVal}>{stats?.users?.totalUsers ?? "—"}</div>
                  <div className={s.scLbl}>Total Users</div>
                </div>
                <div className={`${s.statCard} ${statsLoading ? s.skeleton : ""}`}>
                  <div className={s.scIcon}></div>
                  <div className={s.scVal}>{stats?.users?.dealers ?? "—"}</div>
                  <div className={s.scLbl}>Dealers</div>
                </div>
                <div className={`${s.statCardPending} ${statsLoading ? s.skeleton : ""}`}>
                  <div className={s.scIcon}></div>
                  <div className={s.scVal}>{stats?.posts?.pending ?? "—"}</div>
                  <div className={s.scLbl}>Pending Posts</div>
                </div>
                <div className={`${s.statCard} ${statsLoading ? s.skeleton : ""}`}>
                  <div className={s.scIcon}></div>
                  <div className={s.scVal}>{allVehicles.length || "—"}</div>
                  <div className={s.scLbl}>Explorer Vehicles</div>
                </div>
              </div>
              <div className={s.dashGrid}>
                <div className={s.dashCard}>
                  <div className={s.dcTitle}>Recent Activity</div>
                  {activities.length === 0
                    ? <div className={s.emptyState} style={{ fontSize: ".8rem" }}>No recent activity yet.</div>
                    : activities.map((a, i) => (
                        <div key={i} className={s.activityItem}>
                          <span className={s.aIcon}>{a.icon}</span>
                          <span>{a.text}</span>
                          <span className={s.aTime}>{a.time}</span>
                        </div>
                      ))
                  }
                </div>
                <div className={s.dashCard}>
                  <div className={s.dcTitle}>Quick Actions</div>
                  <div className={s.quickActions}>
                    <button className={s.qaBtn} onClick={() => switchPage("posts")}> Review Pending Posts</button>
                    <button className={s.qaBtn} onClick={() => switchPage("users")}> Manage Users</button>
                    <button className={s.qaBtn} onClick={() => { switchPage("vehicles"); setTimeout(() => openVehicleModal(), 100); }}> Add New Vehicle</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ───── POSTS ───── */}
          {activePage === "posts" && (
            <div>
              <div className={s.pageHeader}>
                <div className={s.pageTitle}>Car Posts Review</div>
                <button className={s.refreshBtn} onClick={loadPosts}>↻ Refresh</button>
              </div>
              <div className={s.filterBar}>
                {(["all", "pending", "approved", "rejected"] as PostFilter[]).map((f) => (
                  <button
                    key={f}
                    className={postFilter === f ? s.filterBtnActive : s.filterBtn}
                    onClick={() => setPostFilter(f)}
                  >
                    {f === "pending" ? " " : f === "approved" ? " " : f === "rejected" ? " " : ""}
                    {capitalize(f)}
                  </button>
                ))}
              </div>
              {postsLoading && <div className={s.loaderWrap}><div className={s.spinner} /></div>}
              {!postsLoading && filteredPosts.length === 0 && <div className={s.emptyState}>No posts found.</div>}
              <div className={s.postsList}>
                {filteredPosts.map((p) => {
                  const id = getId(p);
                  const status = (p.status ?? "pending").toLowerCase();
                  const title = (p.title ?? `${p.brand ?? ""} ${p.model ?? ""}`.trim()) || "Untitled";
                  const dealer = p.dealer?.name ?? p.dealerName ?? "Unknown Dealer";
                  const price = p.price ? `${Number(p.price).toLocaleString()} ${p.currency ?? "EGP"}` : "—";
                  const img = (Array.isArray(p.images) && p.images.length > 0) ? p.images[0] : (p.image ?? "");
                  return (
                    <div key={id} className={postCardClass(status)}>
                      <div className={s.postImg}>
                        {img
                          ? <img src={img} alt={title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          : <div className={s.imgPh}></div>
                        }
                      </div>
                      <div className={s.postInfo}>
                        <div className={s.postName}>{title}</div>
                        <div className={s.postDealer}> {dealer}</div>
                        <div className={s.postMeta}>
                          <span> {price}</span>
                          <span> {p.mileage != null ? `${p.mileage} KM` : "—"}</span>
                          <span> {p.transmission ?? "—"}</span>
                          <span> {p.bodyType ?? "—"}</span>
                          <span> {p.fuelType ?? "—"}</span>
                        </div>
                        <span className={statusClass(status)}>{capitalize(status)}</span>
                      </div>
                      <div className={s.postActions}>
                        <button className={s.paView} onClick={() => { setPostModalData(p); setPostModalOpen(true); }}> View</button>
                        {status === "pending" ? (
                          <>
                            <button className={s.paApprove} onClick={() => updatePostStatus(id, "approved")}> Approve</button>
                            <button className={s.paReject} onClick={() => updatePostStatus(id, "rejected")}> Reject</button>
                          </>
                        ) : status === "approved" ? (
                          <button className={s.paReject} onClick={() => updatePostStatus(id, "rejected")}> Reject</button>
                        ) : (
                          <button className={s.paApprove} onClick={() => updatePostStatus(id, "approved")}> Approve</button>
                        )}
                        <button className={s.paDelete} onClick={() => deletePost(id)}> Delete</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ───── USERS ───── */}
          {activePage === "users" && (
            <div>
              <div className={s.pageHeader}>
                <div className={s.pageTitle}>User Management</div>
                <button className={s.refreshBtn} onClick={loadUsers}>↻ Refresh</button>
              </div>
              <div className={s.searchBar}>
                <input
                  type="text"
                  placeholder=" Search users by name or email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                />
              </div>
              {usersLoading && <div className={s.loaderWrap}><div className={s.spinner} /></div>}
              <div className={s.tableWrap}>
                <table className={s.usersTable}>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Listings</th>
                      <th>Joined</th>
                      <th>Change Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length === 0 && !usersLoading && (
                      <tr><td colSpan={7} className={s.emptyState}>No users found.</td></tr>
                    )}
                    {filteredUsers.map((u, i) => {
                      const id = getId(u);
                      const role = (u.role ?? "user").toLowerCase();
                      const joined = u.createdAt
                        ? new Date(u.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })
                        : (u.joined ?? "—");
                      return (
                        <tr key={id}>
                          <td>{i + 1}</td>
                          <td><strong>{u.name ?? "—"}</strong></td>
                          <td className={s.muted}>{u.email ?? "—"}</td>
                          <td><span className={roleClass(role)}>{capitalize(role)}</span></td>
                          <td>{u.listings ?? u.listingsCount ?? 0}</td>
                          <td className={s.muted}>{joined}</td>
                          <td>
                            <select
                              className={s.roleSelect}
                              value={role}
                              onChange={(e) => changeUserRole(id, e.target.value)}
                            >
                              <option value="user">User</option>
                              <option value="dealer">Dealer</option>
                              <option value="admin">Admin</option>
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ───── VEHICLES ───── */}
          {activePage === "vehicles" && (
            <div>
              <div className={s.pageHeader}>
                <div className={s.pageTitle}>Explorer Vehicles</div>
                <div className={s.pageHeaderRight}>
                  <button className={s.refreshBtn} onClick={loadVehicles}>↻ Refresh</button>
                  <button className={s.addBtn} onClick={() => openVehicleModal()}> Add Vehicle</button>
                </div>
              </div>
              <div className={s.adsToolbar}>
                <span className={s.adsCount}>{allVehicles.length} Vehicle{allVehicles.length !== 1 ? "s" : ""}</span>
              </div>
              {vehiclesLoading && <div className={s.loaderWrap}><div className={s.spinner} /></div>}
              {!vehiclesLoading && allVehicles.length === 0 && (
                <div className={s.emptyState}>No vehicles yet. Add your first one!</div>
              )}
              <div className={s.adsGrid}>
                {allVehicles.map((v) => {
                  const id = getId(v);
                  const name = v.brand && v.model ? `${v.brand} ${v.model}` : (v.name ?? "Vehicle");
                  const img = v.image ?? v.imageUrl ?? "";
                  return (
                    <div key={id} className={s.adCard}>
                      {img
                        ? <img src={img} className={s.adCardImg} alt={name} />
                        : <div className={s.adCardImgPh}></div>
                      }
                      <div className={s.adCardBody}>
                        <div className={s.adCardName}>{name}</div>
                        {v.bodyType && <div className={s.adCardModel}>Body: {v.bodyType}</div>}
                        {v.fuelType && <div className={s.adCardHp}> {v.fuelType}</div>}
                        {v.transmission && <div className={s.adCardMeta}> {v.transmission}</div>}
                        {v.engineSize && <div className={s.adCardMeta}> {v.engineSize}</div>}
                        {v.description && <div className={s.adCardDesc}>{v.description}</div>}
                        <div className={s.adCardActions}>
                          <button className={s.adEditBtn} onClick={() => openVehicleModal(v)}> Edit</button>
                          <button className={s.adDelBtn} onClick={() => deleteVehicle(id)}> Delete</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ───── POST DETAIL MODAL ───── */}
      {postModalOpen && postModalData && (() => {
        const p = postModalData;
        const status = (p.status ?? "pending").toLowerCase();
        const title = (p.title ?? `${p.brand ?? ""} ${p.model ?? ""}`.trim()) || "Untitled";
        const dealer = p.dealer?.name ?? p.dealerName ?? "Unknown Dealer";
        const price = p.price ? `${Number(p.price).toLocaleString()} ${p.currency ?? "EGP"}` : "—";
        const img = (Array.isArray(p.images) && p.images.length > 0) ? p.images[0] : (p.image ?? "");
        const id = getId(p);
        return (
          <div className={s.modalOverlay} onClick={() => setPostModalOpen(false)}>
            <div className={s.modalWide} onClick={(e) => e.stopPropagation()}>
              <div className={s.modalHeader}>
                <h3>{title}</h3>
                <button className={s.modalClose} onClick={() => setPostModalOpen(false)}></button>
              </div>
              <div className={s.modalBody}>
                {img && <img src={img} className={s.pdImg} alt={title} />}
                <div className={s.pdName}>{title}</div>
                <div className={s.pdDealer}> Posted by: {dealer}</div>
                <div className={s.pdSpecs}>
                  <div className={s.pdSpec}><div className={s.pdSpecLbl}>Price</div><div className={s.pdSpecVal}>{price}</div></div>
                  <div className={s.pdSpec}><div className={s.pdSpecLbl}>Mileage</div><div className={s.pdSpecVal}>{p.mileage != null ? `${p.mileage} KM` : "—"}</div></div>
                  <div className={s.pdSpec}><div className={s.pdSpecLbl}>Transmission</div><div className={s.pdSpecVal}>{p.transmission ?? "—"}</div></div>
                  <div className={s.pdSpec}><div className={s.pdSpecLbl}>Body</div><div className={s.pdSpecVal}>{p.bodyType ?? "—"}</div></div>
                  <div className={s.pdSpec}><div className={s.pdSpecLbl}>Fuel</div><div className={s.pdSpecVal}>{p.fuelType ?? "—"}</div></div>
                  <div className={s.pdSpec}><div className={s.pdSpecLbl}>Year</div><div className={s.pdSpecVal}>{p.year ?? "—"}</div></div>
                  <div className={s.pdSpec}><div className={s.pdSpecLbl}>Color</div><div className={s.pdSpecVal}>{p.color ?? "—"}</div></div>
                  <div className={s.pdSpec}><div className={s.pdSpecLbl}>Status</div><div className={s.pdSpecVal}><span className={statusClass(status)}>{capitalize(status)}</span></div></div>
                </div>
                {p.description && <div className={s.pdDesc}>{p.description}</div>}
              </div>
              <div className={s.modalFooter}>
                {status === "pending" ? (
                  <>
                    <button className={s.btnCancel} onClick={() => setPostModalOpen(false)}>Close</button>
                    <button className={s.btnReject} onClick={() => updatePostStatus(id, "rejected")}> Reject</button>
                    <button className={s.btnApprove} onClick={() => updatePostStatus(id, "approved")}> Approve</button>
                  </>
                ) : (
                  <button className={s.btnSave} onClick={() => setPostModalOpen(false)}>Close</button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ───── VEHICLE MODAL ───── */}
      {vehicleModalOpen && (
        <div className={s.modalOverlay} onClick={() => setVehicleModalOpen(false)}>
          <div className={s.modal} onClick={(e) => e.stopPropagation()}>
            <div className={s.modalHeader}>
              <h3>{editingVehicleId ? "Edit Vehicle" : "Add New Vehicle"}</h3>
              <button className={s.modalClose} onClick={() => setVehicleModalOpen(false)}></button>
            </div>
            <div className={s.modalBody}>
              <div className={s.mfRow}>
                <div className={s.mf}>
                  <label>Brand <span className={s.req}>*</span></label>
                  <input type="text" value={vBrand} onChange={(e) => setVBrand(e.target.value)} placeholder="e.g. Nissan" />
                </div>
                <div className={s.mf}>
                  <label>Model <span className={s.req}>*</span></label>
                  <input type="text" value={vModel} onChange={(e) => setVModel(e.target.value)} placeholder="e.g. GTR R-35" />
                </div>
              </div>
              <div className={s.mfRow}>
                <div className={s.mf}>
                  <label>Body Type</label>
                  <select value={vBodyType} onChange={(e) => setVBodyType(e.target.value)}>
                    <option value="">Select body type</option>
                    <option>Sedan</option><option>SUV</option><option>Coupe</option>
                    <option>Hatchback</option><option>Pickup</option><option>Van</option>
                    <option>Convertible</option><option>Sport</option><option>Wagon</option>
                  </select>
                </div>
                <div className={s.mf}>
                  <label>Fuel Type</label>
                  <select value={vFuelType} onChange={(e) => setVFuelType(e.target.value)}>
                    <option value="">Select fuel type</option>
                    <option>Petrol</option><option>Diesel</option><option>Electric</option>
                    <option>Hybrid</option><option>Gas</option>
                  </select>
                </div>
              </div>
              <div className={s.mfRow}>
                <div className={s.mf}>
                  <label>Transmission</label>
                  <select value={vTransmission} onChange={(e) => setVTransmission(e.target.value)}>
                    <option value="">Select transmission</option>
                    <option>Automatic</option><option>Manual</option>
                    <option>CVT</option><option>Semi-Automatic</option>
                  </select>
                </div>
                <div className={s.mf}>
                  <label>Engine Size</label>
                  <input type="text" value={vEngineSize} onChange={(e) => setVEngineSize(e.target.value)} placeholder="e.g. 3.8L Twin-Turbo V6" />
                </div>
              </div>
              <div className={s.mf}>
                <label>Description</label>
                <textarea rows={3} value={vDescription} onChange={(e) => setVDescription(e.target.value)} placeholder="Describe the vehicle..." />
              </div>
              <div className={s.mf}>
                <label>Vehicle Image</label>
                <div className={s.imgUploadBox} onClick={() => vehicleFileRef.current?.click()}>
                  <input
                    ref={vehicleFileRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setVImgFile(file);
                      const reader = new FileReader();
                      reader.onload = (ev) => setVImgPreview(ev.target?.result as string);
                      reader.readAsDataURL(file);
                    }}
                  />
                  {vImgPreview
                    ? <img src={vImgPreview} alt="Preview" style={{ width: "100%", height: 160, objectFit: "cover", display: "block" }} />
                    : <div className={s.imgUploadPlaceholder}> Click to upload image</div>
                  }
                </div>
              </div>
            </div>
            <div className={s.modalFooter}>
              <button className={s.btnCancel} onClick={() => setVehicleModalOpen(false)}>Cancel</button>
              <button className={s.btnSave} disabled={vehicleSaving} onClick={saveVehicle}>
                {vehicleSaving ? " Saving..." : " Save Vehicle"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      <div className={`${s.toast} ${toastVisible ? s.toastShow : ""}`}>{toastMsg}</div>
    </>
  );
}
