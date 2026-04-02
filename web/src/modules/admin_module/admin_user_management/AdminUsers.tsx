import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import AdminSidebar from "../../../components/AdminSidebar/AdminSidebar";
import styles from "./AdminUsers.module.css";

const API_BASE  = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
const PAGE_SIZE = 20;

interface AdminUser { id: number; name: string; email: string; role: string; avatarUrl?: string | null; }
interface UserEntry {
  id: number; name: string; email: string;
  phoneNumber?: string | null; role: string;
  avatarUrl?: string | null; active: boolean; createdAt?: string;
}
type ModalMode = "detail" | "create" | "edit-role" | "deactivate" | "delete" | null;
const ROLES = ["TENANT", "OWNER", "ADMIN"];
const roleBg:    Record<string, string> = { ADMIN: "rgba(31,93,113,0.12)",  OWNER: "rgba(183,142,66,0.12)", TENANT: "rgba(45,140,106,0.12)" };
const roleColor: Record<string, string> = { ADMIN: "#1f5d71", OWNER: "#b78e42", TENANT: "#2d8c6a" };

const AdminUsers: React.FC = () => {
  const navigate = useNavigate();
  const [admin, setAdmin]         = useState<AdminUser | null>(null);
  const [allUsers, setAllUsers]   = useState<UserEntry[]>([]);
  const [visible, setVisible]     = useState<UserEntry[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [search, setSearch]       = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [page, setPage]           = useState(1);

  const [modal, setModal]         = useState<ModalMode>(null);
  const [target, setTarget]       = useState<UserEntry | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [form, setForm]           = useState({ name: "", email: "", password: "", role: "TENANT" });
  const [newRole, setNewRole]     = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("user");
    const token  = localStorage.getItem("accessToken");
    if (!stored || !token) { navigate("/"); return; }
    try {
      const parsed: AdminUser = JSON.parse(stored);
      if (parsed.role?.toUpperCase() !== "ADMIN") { navigate("/home"); return; }
      setAdmin(parsed);
    } catch { navigate("/"); }
  }, [navigate]);

  const fetchUsers = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const token = localStorage.getItem("accessToken");
      const res   = await fetch(`${API_BASE}/api/admin/users`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (!res.ok || !data.success) { setError(data?.error?.message ?? "Failed."); return; }
      setAllUsers(data.data.users ?? []);
      setPage(1);
    } catch { setError("Unable to connect."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (admin) fetchUsers(); }, [admin, fetchUsers]);

  // ── Recompute visible list on filter/page change ───────────────────────
  useEffect(() => {
    const q = search.toLowerCase();
    const filtered = allUsers.filter((u) => {
      const matchSearch = u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      const matchRole   = roleFilter === "ALL" || u.role.toUpperCase() === roleFilter;
      return matchSearch && matchRole;
    });
    setVisible(filtered.slice(0, page * PAGE_SIZE));
  }, [allUsers, search, roleFilter, page]);

  const filteredTotal = allUsers.filter((u) => {
    const q = search.toLowerCase();
    return (u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
        && (roleFilter === "ALL" || u.role.toUpperCase() === roleFilter);
  }).length;

  const hasMore = visible.length < filteredTotal;

  // ── Modal helpers ──────────────────────────────────────────────────────
  const openDetail  = (u: UserEntry) => { setTarget(u); setModalError(null); setModal("detail"); };
  const openCreate  = () => { setForm({ name: "", email: "", password: "", role: "TENANT" }); setModalError(null); setModal("create"); };
  const openEditRole = (u: UserEntry) => { setTarget(u); setNewRole(u.role); setModalError(null); setModal("edit-role"); };
  const openToggle  = (u: UserEntry) => { setTarget(u); setModalError(null); setModal("deactivate"); };
  const openDelete  = (u: UserEntry) => { setTarget(u); setModalError(null); setModal("delete"); };
  const closeModal  = () => { if (!submitting) { setModal(null); setTarget(null); } };

  const tok = () => localStorage.getItem("accessToken");

  const handleCreate = async () => {
    if (!form.name.trim())     { setModalError("Name is required.");     return; }
    if (!form.email.trim())    { setModalError("Email is required.");    return; }
    if (!form.password.trim()) { setModalError("Password is required."); return; }
    setSubmitting(true); setModalError(null);
    try {
      const res  = await fetch(`${API_BASE}/api/admin/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(tok() ? { Authorization: `Bearer ${tok()}` } : {}) },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || !data.success) { setModalError(data?.error?.message ?? "Failed."); return; }
      await fetchUsers(); closeModal();
    } catch { setModalError("Network error."); }
    finally { setSubmitting(false); }
  };

  const handleEditRole = async () => {
    if (!target) return;
    setSubmitting(true); setModalError(null);
    try {
      const res  = await fetch(`${API_BASE}/api/admin/users/${target.id}/role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...(tok() ? { Authorization: `Bearer ${tok()}` } : {}) },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) { setModalError(data?.error?.message ?? "Failed."); return; }
      await fetchUsers(); closeModal();
    } catch { setModalError("Network error."); }
    finally { setSubmitting(false); }
  };

  const handleToggleActive = async () => {
    if (!target) return;
    setSubmitting(true); setModalError(null);
    try {
      const res  = await fetch(`${API_BASE}/api/admin/users/${target.id}/active`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...(tok() ? { Authorization: `Bearer ${tok()}` } : {}) },
        body: JSON.stringify({ active: !target.active }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) { setModalError(data?.error?.message ?? "Failed."); return; }
      await fetchUsers(); closeModal();
    } catch { setModalError("Network error."); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!target) return;
    setSubmitting(true); setModalError(null);
    try {
      const res  = await fetch(`${API_BASE}/api/admin/users/${target.id}`, {
        method: "DELETE",
        headers: tok() ? { Authorization: `Bearer ${tok()}` } : {},
      });
      const data = await res.json();
      if (!res.ok || !data.success) { setModalError(data?.error?.message ?? "Failed."); return; }
      await fetchUsers(); closeModal();
    } catch { setModalError("Network error."); }
    finally { setSubmitting(false); }
  };

  if (!admin) return null;

  return (
    <div className={styles.page}>
      <AdminSidebar user={admin} navItems={[
        { path: "/admin/rental-requests", icon: "📋", label: "Rental Requests" },
        { path: "/admin/properties",      icon: "🏘️", label: "All Properties"  },
        { path: "/admin/users",           icon: "👥", label: "Users"           },
        { path: "/admin/audit-log",       icon: "📜", label: "Audit Log"       },
      ]} />

      <div className={styles.main}>
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>User Management</h1>
            <p className={styles.pageSub}>
              {loading ? "Loading…" : `${visible.length} of ${filteredTotal} user${filteredTotal !== 1 ? "s" : ""}`}
            </p>
          </div>
          <button className={styles.createBtn} onClick={openCreate} type="button">+ Create User</button>
        </div>

        <div className={styles.filters}>
          <div className={styles.searchWrap}>
            <span className={styles.searchIcon}>🔍</span>
            <input className={styles.searchInput} type="text"
              placeholder="Search by name or email…" value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            {search && <button className={styles.searchClear} onClick={() => { setSearch(""); setPage(1); }} type="button">✕</button>}
          </div>
          <div className={styles.roleFilters}>
            {["ALL", ...ROLES].map((r) => (
              <button key={r}
                className={`${styles.roleFilterBtn} ${roleFilter === r ? styles.roleFilterActive : ""}`}
                onClick={() => { setRoleFilter(r); setPage(1); }} type="button">{r}</button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className={styles.cardGrid}>
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className={styles.skeletonCard} />)}
          </div>
        ) : error ? (
          <div className={styles.stateBox}>
            <span className={styles.stateIcon}>⚠️</span>
            <h3 className={styles.stateTitle}>Failed to load</h3>
            <p className={styles.stateBody}>{error}</p>
            <button className={styles.stateBtn} onClick={fetchUsers} type="button">Try Again</button>
          </div>
        ) : visible.length === 0 ? (
          <div className={styles.stateBox}>
            <span className={styles.stateIcon}>👥</span>
            <h3 className={styles.stateTitle}>No users found</h3>
            <p className={styles.stateBody}>Try adjusting your search or filters.</p>
          </div>
        ) : (
          <>
            <div className={styles.cardGrid}>
              {visible.map((u, i) => (
                <div key={u.id} className={styles.userCard} style={{ animationDelay: `${i * 20}ms` }}
                  onClick={() => openDetail(u)}>
                  <div className={styles.cardAvatar}>
                    {u.avatarUrl
                      ? <img src={u.avatarUrl} alt={u.name} className={styles.cardAvatarImg} />
                      : u.name?.charAt(0).toUpperCase()
                    }
                  </div>
                  <div className={styles.cardName}>{u.name}</div>
                  <div className={styles.cardEmail}>{u.email}</div>
                  <div className={styles.cardBadges}>
                    <span className={styles.roleBadge} style={{ background: roleBg[u.role] ?? "#f0f4f5", color: roleColor[u.role] ?? "#6e7071" }}>
                      {u.role}
                    </span>
                    <span className={`${styles.statusPill} ${u.active ? styles.statusActive : styles.statusInactive}`}>
                      {u.active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {hasMore && (
              <div className={styles.loadMoreWrap}>
                <button className={styles.loadMoreBtn} onClick={() => setPage((p) => p + 1)} type="button">
                  Load More ({filteredTotal - visible.length} remaining)
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Modals ── */}
      {modal && (
        <div className={styles.overlay} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>

            {/* DETAIL */}
            {modal === "detail" && target && <>
              <div className={styles.modalHeader}>
                <div className={styles.modalAvatarLg}>
                  {target.avatarUrl
                    ? <img src={target.avatarUrl} alt={target.name} className={styles.modalAvatarImg} />
                    : target.name?.charAt(0).toUpperCase()
                  }
                </div>
                <div>
                  <h3 className={styles.modalTitle}>{target.name}</h3>
                  <p className={styles.modalSubtitle}>{target.email}</p>
                </div>
                <button className={styles.modalCloseBtn} onClick={closeModal} type="button">✕</button>
              </div>
              <div className={styles.modalBody}>
                <div className={styles.detailRows}>
                  <div className={styles.detailRow}>
                    <span className={styles.detailRowLabel}>Role</span>
                    <span className={styles.roleBadge} style={{ background: roleBg[target.role] ?? "#f0f4f5", color: roleColor[target.role] ?? "#6e7071" }}>{target.role}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailRowLabel}>Status</span>
                    <span className={`${styles.statusPill} ${target.active ? styles.statusActive : styles.statusInactive}`}>
                      {target.active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  {target.phoneNumber && (
                    <div className={styles.detailRow}>
                      <span className={styles.detailRowLabel}>Phone</span>
                      <span className={styles.detailRowValue}>{target.phoneNumber}</span>
                    </div>
                  )}
                  {target.createdAt && (
                    <div className={styles.detailRow}>
                      <span className={styles.detailRowLabel}>Joined</span>
                      <span className={styles.detailRowValue}>
                        {new Date(target.createdAt).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}
                      </span>
                    </div>
                  )}
                </div>

                <div className={styles.detailActions}>
                  <button className={styles.detailActionBtn} onClick={() => openEditRole(target)} type="button">✏️ Change Role</button>
                  <button className={`${styles.detailActionBtn} ${target.active ? styles.detailActionBtnWarn : styles.detailActionBtnGreen}`}
                    onClick={() => openToggle(target)} type="button">
                    {target.active ? "⏸ Deactivate" : "▶ Activate"}
                  </button>
                  <button className={`${styles.detailActionBtn} ${styles.detailActionBtnDanger}`}
                    onClick={() => openDelete(target)} type="button">🗑 Delete User</button>
                </div>
              </div>
            </>}

            {/* CREATE */}
            {modal === "create" && <>
              <div className={styles.modalHeader}>
                <span className={styles.modalIcon}>👤</span>
                <h3 className={styles.modalTitle}>Create New User</h3>
                <button className={styles.modalCloseBtn} onClick={closeModal} type="button">✕</button>
              </div>
              <div className={styles.modalBody}>
                {(["name", "email", "password"] as const).map((field) => (
                  <div key={field} className={styles.field}>
                    <label className={styles.fieldLabel}>{field.charAt(0).toUpperCase() + field.slice(1)}</label>
                    <input className={styles.fieldInput}
                      type={field === "password" ? "password" : field === "email" ? "email" : "text"}
                      placeholder={field === "name" ? "Full name" : field === "email" ? "email@example.com" : "Password"}
                      value={form[field]} onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                      disabled={submitting} />
                  </div>
                ))}
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Role</label>
                  <select className={styles.fieldSelect} value={form.role}
                    onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} disabled={submitting}>
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                {modalError && <p className={styles.modalError}>⚠ {modalError}</p>}
                <div className={styles.modalFooter}>
                  <button className={styles.cancelBtn} onClick={closeModal} disabled={submitting} type="button">Cancel</button>
                  <button className={styles.confirmBtn} onClick={handleCreate} disabled={submitting} type="button">
                    {submitting ? "Creating…" : "Create User"}
                  </button>
                </div>
              </div>
            </>}

            {/* EDIT ROLE */}
            {modal === "edit-role" && target && <>
              <div className={styles.modalHeader}>
                <span className={styles.modalIcon}>✏️</span>
                <h3 className={styles.modalTitle}>Change Role</h3>
                <button className={styles.modalCloseBtn} onClick={closeModal} type="button">✕</button>
              </div>
              <div className={styles.modalBody}>
                <p className={styles.modalDesc}>Changing role for <strong>{target.name}</strong></p>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>New Role</label>
                  <select className={styles.fieldSelect} value={newRole}
                    onChange={(e) => setNewRole(e.target.value)} disabled={submitting}>
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                {modalError && <p className={styles.modalError}>⚠ {modalError}</p>}
                <div className={styles.modalFooter}>
                  <button className={styles.cancelBtn} onClick={closeModal} disabled={submitting} type="button">Cancel</button>
                  <button className={styles.confirmBtn} onClick={handleEditRole} disabled={submitting} type="button">
                    {submitting ? "Saving…" : "Save Role"}
                  </button>
                </div>
              </div>
            </>}

            {/* TOGGLE ACTIVE */}
            {modal === "deactivate" && target && <>
              <div className={`${styles.modalHeader} ${target.active ? styles.modalHeaderWarn : styles.modalHeaderGreen}`}>
                <span className={styles.modalIcon}>{target.active ? "⏸" : "▶"}</span>
                <h3 className={styles.modalTitle}>{target.active ? "Deactivate User" : "Activate User"}</h3>
                <button className={styles.modalCloseBtn} onClick={closeModal} type="button">✕</button>
              </div>
              <div className={styles.modalBody}>
                <p className={styles.modalDesc}>
                  {target.active
                    ? <>Deactivate <strong>{target.name}</strong>? They will not be able to log in.</>
                    : <>Reactivate <strong>{target.name}</strong>? They will be able to log in again.</>
                  }
                </p>
                {modalError && <p className={styles.modalError}>⚠ {modalError}</p>}
                <div className={styles.modalFooter}>
                  <button className={styles.cancelBtn} onClick={closeModal} disabled={submitting} type="button">Cancel</button>
                  <button className={target.active ? styles.warnBtn : styles.confirmBtn}
                    onClick={handleToggleActive} disabled={submitting} type="button">
                    {submitting ? "Processing…" : target.active ? "Deactivate" : "Activate"}
                  </button>
                </div>
              </div>
            </>}

            {/* DELETE */}
            {modal === "delete" && target && <>
              <div className={`${styles.modalHeader} ${styles.modalHeaderDanger}`}>
                <span className={styles.modalIcon}>🗑</span>
                <h3 className={styles.modalTitle}>Delete User</h3>
                <button className={styles.modalCloseBtn} onClick={closeModal} type="button">✕</button>
              </div>
              <div className={styles.modalBody}>
                <p className={styles.modalDesc}>
                  Permanently delete <strong>{target.name}</strong> ({target.email})? This cannot be undone.
                </p>
                {modalError && <p className={styles.modalError}>⚠ {modalError}</p>}
                <div className={styles.modalFooter}>
                  <button className={styles.cancelBtn} onClick={closeModal} disabled={submitting} type="button">Cancel</button>
                  <button className={styles.dangerBtn} onClick={handleDelete} disabled={submitting} type="button">
                    {submitting ? "Deleting…" : "Delete Permanently"}
                  </button>
                </div>
              </div>
            </>}

          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;