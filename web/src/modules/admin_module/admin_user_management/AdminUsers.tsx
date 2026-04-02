import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import AdminSidebar from "../../../components/AdminSidebar/AdminSidebar";
import styles from "./AdminUsers.module.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

interface AdminUser { id: number; name: string; email: string; role: string; avatarUrl?: string | null; }

interface UserEntry {
  id: number;
  name: string;
  email: string;
  phoneNumber?: string | null;
  role: string;
  avatarUrl?: string | null;
  active: boolean;
  createdAt?: string;
}

type ModalMode = "create" | "edit-role" | "deactivate" | "delete" | null;

const ROLES = ["TENANT", "OWNER", "ADMIN"];

const AdminUsers: React.FC = () => {
  const navigate = useNavigate();
  const [admin, setAdmin]     = useState<AdminUser | null>(null);
  const [users, setUsers]     = useState<UserEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  // Filters
  const [search, setSearch]         = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");

  // Modal
  const [modal, setModal]         = useState<ModalMode>(null);
  const [target, setTarget]       = useState<UserEntry | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Create form
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "TENANT" });

  // Edit role
  const [newRole, setNewRole] = useState("");

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
      if (!res.ok || !data.success) { setError(data?.error?.message ?? "Failed to load users."); return; }
      setUsers(data.data.users ?? []);
    } catch { setError("Unable to connect to server."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (admin) fetchUsers(); }, [admin, fetchUsers]);

  // ── Filtered list ──────────────────────────────────────────────────────
  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const matchSearch = u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    const matchRole   = roleFilter === "ALL" || u.role.toUpperCase() === roleFilter;
    return matchSearch && matchRole;
  });

  // ── Helpers ────────────────────────────────────────────────────────────
  const openCreate = () => {
    setForm({ name: "", email: "", password: "", role: "TENANT" });
    setModalError(null); setModal("create");
  };
  const openEditRole = (u: UserEntry) => {
    setTarget(u); setNewRole(u.role); setModalError(null); setModal("edit-role");
  };
  const openToggle = (u: UserEntry) => {
    setTarget(u); setModalError(null); setModal("deactivate");
  };
  const openDelete = (u: UserEntry) => {
    setTarget(u); setModalError(null); setModal("delete");
  };
  const closeModal = () => { if (!submitting) { setModal(null); setTarget(null); } };

  const token = () => localStorage.getItem("accessToken");

  // ── Submit: create ─────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!form.name.trim())     { setModalError("Name is required.");     return; }
    if (!form.email.trim())    { setModalError("Email is required.");    return; }
    if (!form.password.trim()) { setModalError("Password is required."); return; }

    setSubmitting(true); setModalError(null);
    try {
      const res  = await fetch(`${API_BASE}/api/admin/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token() ? { Authorization: `Bearer ${token()}` } : {}) },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || !data.success) { setModalError(data?.error?.message ?? "Failed to create user."); return; }
      await fetchUsers(); closeModal();
    } catch { setModalError("Network error."); }
    finally { setSubmitting(false); }
  };

  // ── Submit: edit role ──────────────────────────────────────────────────
  const handleEditRole = async () => {
    if (!target) return;
    setSubmitting(true); setModalError(null);
    try {
      const res  = await fetch(`${API_BASE}/api/admin/users/${target.id}/role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...(token() ? { Authorization: `Bearer ${token()}` } : {}) },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) { setModalError(data?.error?.message ?? "Failed."); return; }
      await fetchUsers(); closeModal();
    } catch { setModalError("Network error."); }
    finally { setSubmitting(false); }
  };

  // ── Submit: toggle active ──────────────────────────────────────────────
  const handleToggleActive = async () => {
    if (!target) return;
    setSubmitting(true); setModalError(null);
    try {
      const res  = await fetch(`${API_BASE}/api/admin/users/${target.id}/active`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...(token() ? { Authorization: `Bearer ${token()}` } : {}) },
        body: JSON.stringify({ active: !target.active }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) { setModalError(data?.error?.message ?? "Failed."); return; }
      await fetchUsers(); closeModal();
    } catch { setModalError("Network error."); }
    finally { setSubmitting(false); }
  };

  // ── Submit: delete ─────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!target) return;
    setSubmitting(true); setModalError(null);
    try {
      const res  = await fetch(`${API_BASE}/api/admin/users/${target.id}`, {
        method: "DELETE",
        headers: token() ? { Authorization: `Bearer ${token()}` } : {},
      });
      const data = await res.json();
      if (!res.ok || !data.success) { setModalError(data?.error?.message ?? "Failed."); return; }
      await fetchUsers(); closeModal();
    } catch { setModalError("Network error."); }
    finally { setSubmitting(false); }
  };

  const roleBadgeColor: Record<string, string> = {
    ADMIN: "rgba(31,93,113,0.12)", OWNER: "rgba(183,142,66,0.12)", TENANT: "rgba(45,140,106,0.12)",
  };
  const roleFontColor: Record<string, string> = {
    ADMIN: "#1f5d71", OWNER: "#b78e42", TENANT: "#2d8c6a",
  };

  if (!admin) return null;

  return (
    <div className={styles.page}>
      <AdminSidebar user={admin} />

      <div className={styles.main}>
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>User Management</h1>
            <p className={styles.pageSub}>
              {loading ? "Loading…" : `${filtered.length} of ${users.length} user${users.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <button className={styles.createBtn} onClick={openCreate} type="button">+ Create User</button>
        </div>

        {/* Filters */}
        <div className={styles.filters}>
          <div className={styles.searchWrap}>
            <span className={styles.searchIcon}>🔍</span>
            <input
              className={styles.searchInput}
              type="text"
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && <button className={styles.searchClear} onClick={() => setSearch("")} type="button">✕</button>}
          </div>
          <div className={styles.roleFilters}>
            {["ALL", ...ROLES].map((r) => (
              <button
                key={r}
                className={`${styles.roleFilterBtn} ${roleFilter === r ? styles.roleFilterActive : ""}`}
                onClick={() => setRoleFilter(r)}
                type="button"
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className={styles.skeletonList}>
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className={styles.skeletonRow} />)}
          </div>
        ) : error ? (
          <div className={styles.stateBox}>
            <span className={styles.stateIcon}>⚠️</span>
            <h3 className={styles.stateTitle}>Failed to load</h3>
            <p className={styles.stateBody}>{error}</p>
            <button className={styles.stateBtn} onClick={fetchUsers} type="button">Try Again</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className={styles.stateBox}>
            <span className={styles.stateIcon}>👥</span>
            <h3 className={styles.stateTitle}>No users found</h3>
            <p className={styles.stateBody}>Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u, i) => (
                  <tr key={u.id} className={styles.tableRow} style={{ animationDelay: `${i * 25}ms` }}>
                    <td>
                      <div className={styles.userCell}>
                        <div className={styles.userAvatar}>
                          {u.avatarUrl
                            ? <img src={u.avatarUrl} alt={u.name} className={styles.userAvatarImg} />
                            : u.name?.charAt(0).toUpperCase()
                          }
                        </div>
                        <div>
                          <div className={styles.userName}>{u.name}</div>
                          <div className={styles.userEmail}>{u.email}</div>
                          {u.phoneNumber && <div className={styles.userPhone}>📞 {u.phoneNumber}</div>}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={styles.roleBadge} style={{
                        background: roleBadgeColor[u.role] ?? "#f0f4f5",
                        color: roleFontColor[u.role] ?? "#6e7071",
                      }}>
                        {u.role}
                      </span>
                    </td>
                    <td>
                      <span className={`${styles.statusPill} ${u.active ? styles.statusActive : styles.statusInactive}`}>
                        {u.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className={styles.dateCell}>
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString("en-PH", {
                        year: "numeric", month: "short", day: "numeric",
                      }) : "—"}
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <button className={styles.actionBtn} onClick={() => openEditRole(u)} type="button" title="Change role">✏️</button>
                        <button
                          className={`${styles.actionBtn} ${u.active ? styles.actionBtnWarn : styles.actionBtnGreen}`}
                          onClick={() => openToggle(u)} type="button"
                          title={u.active ? "Deactivate" : "Activate"}
                        >
                          {u.active ? "⏸" : "▶"}
                        </button>
                        <button className={`${styles.actionBtn} ${styles.actionBtnDanger}`} onClick={() => openDelete(u)} type="button" title="Delete">🗑</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {modal && (
        <div className={styles.overlay} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>

            {/* CREATE */}
            {modal === "create" && <>
              <div className={styles.modalHeader}>
                <span className={styles.modalIcon}>👤</span>
                <h3 className={styles.modalTitle}>Create New User</h3>
              </div>
              <div className={styles.modalBody}>
                {(["name", "email", "password"] as const).map((field) => (
                  <div key={field} className={styles.field}>
                    <label className={styles.fieldLabel}>{field.charAt(0).toUpperCase() + field.slice(1)}</label>
                    <input
                      className={styles.fieldInput}
                      type={field === "password" ? "password" : field === "email" ? "email" : "text"}
                      placeholder={field === "name" ? "Full name" : field === "email" ? "email@example.com" : "Password"}
                      value={form[field]}
                      onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                      disabled={submitting}
                    />
                  </div>
                ))}
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Role</label>
                  <select className={styles.fieldSelect} value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} disabled={submitting}>
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                {modalError && <p className={styles.modalError}>⚠ {modalError}</p>}
              </div>
              <div className={styles.modalFooter}>
                <button className={styles.cancelBtn} onClick={closeModal} disabled={submitting} type="button">Cancel</button>
                <button className={styles.confirmBtn} onClick={handleCreate} disabled={submitting} type="button">
                  {submitting ? "Creating…" : "Create User"}
                </button>
              </div>
            </>}

            {/* EDIT ROLE */}
            {modal === "edit-role" && target && <>
              <div className={styles.modalHeader}>
                <span className={styles.modalIcon}>✏️</span>
                <h3 className={styles.modalTitle}>Change Role</h3>
              </div>
              <div className={styles.modalBody}>
                <p className={styles.modalDesc}>Changing role for <strong>{target.name}</strong></p>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>New Role</label>
                  <select className={styles.fieldSelect} value={newRole} onChange={(e) => setNewRole(e.target.value)} disabled={submitting}>
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                {modalError && <p className={styles.modalError}>⚠ {modalError}</p>}
              </div>
              <div className={styles.modalFooter}>
                <button className={styles.cancelBtn} onClick={closeModal} disabled={submitting} type="button">Cancel</button>
                <button className={styles.confirmBtn} onClick={handleEditRole} disabled={submitting} type="button">
                  {submitting ? "Saving…" : "Save Role"}
                </button>
              </div>
            </>}

            {/* TOGGLE ACTIVE */}
            {modal === "deactivate" && target && <>
              <div className={`${styles.modalHeader} ${target.active ? styles.modalHeaderWarn : styles.modalHeaderGreen}`}>
                <span className={styles.modalIcon}>{target.active ? "⏸" : "▶"}</span>
                <h3 className={styles.modalTitle}>{target.active ? "Deactivate User" : "Activate User"}</h3>
              </div>
              <div className={styles.modalBody}>
                <p className={styles.modalDesc}>
                  {target.active
                    ? <>Are you sure you want to deactivate <strong>{target.name}</strong>? They will not be able to log in.</>
                    : <>Reactivate <strong>{target.name}</strong>? They will be able to log in again.</>
                  }
                </p>
                {modalError && <p className={styles.modalError}>⚠ {modalError}</p>}
              </div>
              <div className={styles.modalFooter}>
                <button className={styles.cancelBtn} onClick={closeModal} disabled={submitting} type="button">Cancel</button>
                <button
                  className={target.active ? styles.warnBtn : styles.confirmBtn}
                  onClick={handleToggleActive} disabled={submitting} type="button"
                >
                  {submitting ? "Processing…" : target.active ? "Deactivate" : "Activate"}
                </button>
              </div>
            </>}

            {/* DELETE */}
            {modal === "delete" && target && <>
              <div className={`${styles.modalHeader} ${styles.modalHeaderDanger}`}>
                <span className={styles.modalIcon}>🗑</span>
                <h3 className={styles.modalTitle}>Delete User</h3>
              </div>
              <div className={styles.modalBody}>
                <p className={styles.modalDesc}>
                  Permanently delete <strong>{target.name}</strong> ({target.email})? This cannot be undone.
                </p>
                {modalError && <p className={styles.modalError}>⚠ {modalError}</p>}
              </div>
              <div className={styles.modalFooter}>
                <button className={styles.cancelBtn} onClick={closeModal} disabled={submitting} type="button">Cancel</button>
                <button className={styles.dangerBtn} onClick={handleDelete} disabled={submitting} type="button">
                  {submitting ? "Deleting…" : "Delete Permanently"}
                </button>
              </div>
            </>}

          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;