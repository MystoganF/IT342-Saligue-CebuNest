import React, { useState, useEffect, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { adminUsersApi } from "./admin_users.api";
import styles from "./AdminUsers.module.css";
import {
  Search, Users, AlertTriangle, UserPlus, X, Mail, Shield, ShieldAlert,
  Power, CheckCircle, Loader2, Phone, User, Link2
} from "lucide-react";

const PAGE_SIZE = 20;

interface AdminUser { id: number; name: string; email: string; role: string; avatarUrl?: string | null; }
interface UserEntry {
  id: number; name: string; email: string; phoneNumber?: string | null; role: string;
  avatarUrl?: string | null; facebookUrl?: string | null; instagramUrl?: string | null;
  twitterUrl?: string | null; active: boolean; createdAt?: string;
}

type ModalMode = "detail" | "create" | "edit-role" | "edit-email" | "edit-profile" | "deactivate" | null;

const ROLES = ["TENANT", "OWNER", "ADMIN"];
const roleBg:    Record<string, string> = { ADMIN: "rgba(31,93,113,0.12)",  OWNER: "rgba(183,142,66,0.12)", TENANT: "rgba(45,140,106,0.12)" };
const roleColor: Record<string, string> = { ADMIN: "#1f5d71", OWNER: "#b78e42", TENANT: "#2d8c6a" };

const AdminUsers: React.FC = () => {
  const { user: admin } = useOutletContext<{ user: AdminUser }>();

  const [allUsers, setAllUsers]       = useState<UserEntry[]>([]);
  const [visible, setVisible]         = useState<UserEntry[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);

  const [search, setSearch]           = useState("");
  const [roleFilter, setRoleFilter]   = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage]               = useState(1);

  const [modal, setModal]             = useState<ModalMode>(null);
  const [target, setTarget]           = useState<UserEntry | null>(null);
  const [submitting, setSubmitting]   = useState(false);
  const [modalError, setModalError]   = useState<string | null>(null);

  const [form, setForm]               = useState({ name: "", email: "", password: "", role: "TENANT" });
  const [newRole, setNewRole]         = useState("");
  const [newEmail, setNewEmail]       = useState("");

  // Profile edit form state
  const [profileForm, setProfileForm] = useState({
    name: "", phoneNumber: "", facebookUrl: "", instagramUrl: "", twitterUrl: ""
  });

  const fetchUsers = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await adminUsersApi.getAllUsers();
      if (!data.success) { setError(data?.error?.message ?? "Failed."); return; }
      const usersList = data.data.users ?? [];
      const filteredUsers = usersList.filter((u: UserEntry) => u.id !== admin?.id);
      setAllUsers(filteredUsers);
      setPage(1);
    } catch {
      setError("Unable to connect.");
    } finally {
      setLoading(false);
    }
  }, [admin]);

  useEffect(() => { if (admin) fetchUsers(); }, [admin, fetchUsers]);

  useEffect(() => {
    const q = search.toLowerCase();
    const filtered = allUsers.filter((u) => {
      const matchSearch = u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      const matchRole   = roleFilter === "ALL" || u.role.toUpperCase() === roleFilter;
      const matchStatus = statusFilter === "ALL" ||
                          (statusFilter === "ACTIVE" && u.active) ||
                          (statusFilter === "INACTIVE" && !u.active);
      return matchSearch && matchRole && matchStatus;
    });
    setVisible(filtered.slice(0, page * PAGE_SIZE));
  }, [allUsers, search, roleFilter, statusFilter, page]);

  const filteredTotal = allUsers.filter((u) => {
    const q = search.toLowerCase();
    return (u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
        && (roleFilter === "ALL" || u.role.toUpperCase() === roleFilter)
        && (statusFilter === "ALL" || (statusFilter === "ACTIVE" && u.active) || (statusFilter === "INACTIVE" && !u.active));
  }).length;

  const hasMore = visible.length < filteredTotal;

  // ── Modal helpers ──────────────────────────────────────────────────────
  const openDetail   = (u: UserEntry) => { setTarget(u); setModalError(null); setModal("detail"); };
  const openCreate   = () => { setForm({ name: "", email: "", password: "", role: "TENANT" }); setModalError(null); setModal("create"); };
  const openEditRole = (u: UserEntry) => { setTarget(u); setNewRole(u.role); setModalError(null); setModal("edit-role"); };
  const openEditEmail = (u: UserEntry) => { setTarget(u); setNewEmail(u.email); setModalError(null); setModal("edit-email"); };
  const openEditProfile = (u: UserEntry) => {
    setTarget(u);
    setProfileForm({
      name:         u.name         ?? "",
      phoneNumber:  u.phoneNumber  ?? "",
      facebookUrl:  u.facebookUrl  ?? "",
      instagramUrl: u.instagramUrl ?? "",
      twitterUrl:   u.twitterUrl   ?? "",
    });
    setModalError(null);
    setModal("edit-profile");
  };
  const openToggle   = (u: UserEntry) => { setTarget(u); setModalError(null); setModal("deactivate"); };
  const closeModal   = () => { if (!submitting) { setModal(null); setTarget(null); } };

  // ── API actions ────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!form.name.trim())     { setModalError("Name is required."); return; }
    if (!form.email.trim())    { setModalError("Email is required."); return; }
    if (!form.password.trim()) { setModalError("Password is required."); return; }
    setSubmitting(true); setModalError(null);
    try {
      const data = await adminUsersApi.createUser(form);
      if (!data.success) { setModalError(data?.error?.message ?? "Failed."); return; }
      await fetchUsers(); closeModal();
    } catch (err: any) {
      setModalError(err.response?.data?.error?.message || "Network error.");
    } finally { setSubmitting(false); }
  };

  const handleEditRole = async () => {
    if (!target) return;
    setSubmitting(true); setModalError(null);
    try {
      const data = await adminUsersApi.updateUserRole(target.id, { role: newRole });
      if (!data.success) { setModalError(data?.error?.message ?? "Failed."); return; }
      await fetchUsers(); closeModal();
    } catch (err: any) {
      setModalError(err.response?.data?.error?.message || "Network error.");
    } finally { setSubmitting(false); }
  };

  const handleEditEmail = async () => {
    if (!target) return;
    if (!newEmail.trim()) { setModalError("Email is required."); return; }
    setSubmitting(true); setModalError(null);
    try {
      const data = await adminUsersApi.updateUserEmail(target.id, { email: newEmail });
      if (!data.success) { setModalError(data?.error?.message ?? "Failed."); return; }
      await fetchUsers(); closeModal();
    } catch (err: any) {
      setModalError(err.response?.data?.error?.message || "Network error.");
    } finally { setSubmitting(false); }
  };

  const handleEditProfile = async () => {
    if (!target) return;
    if (!profileForm.name.trim()) { setModalError("Full name is required."); return; }
    setSubmitting(true); setModalError(null);
    try {
      const data = await adminUsersApi.updateUserProfile(target.id, profileForm);
      if (!data.success) { setModalError(data?.error?.message ?? "Failed."); return; }
      await fetchUsers(); closeModal();
    } catch (err: any) {
      setModalError(err.response?.data?.error?.message || "Network error.");
    } finally { setSubmitting(false); }
  };

  const handleToggleActive = async () => {
    if (!target) return;
    setSubmitting(true); setModalError(null);
    try {
      const data = await adminUsersApi.toggleUserActiveStatus(target.id, { active: !target.active });
      if (!data.success) { setModalError(data?.error?.message ?? "Failed."); return; }
      await fetchUsers(); closeModal();
    } catch (err: any) {
      setModalError(err.response?.data?.error?.message || "Network error.");
    } finally { setSubmitting(false); }
  };

  if (!admin) return null;

  return (
    <div className={styles.page}>
      <div className={styles.main}>

        {/* ── Page Header ── */}
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>User Management</h1>
            <p className={styles.pageSub}>
              {loading ? "Syncing…" : `${visible.length} of ${filteredTotal} user${filteredTotal !== 1 ? "s" : ""}`}
            </p>
          </div>
          <button className={styles.addBtn} onClick={openCreate} type="button">
            <UserPlus size={18} /> Create User
          </button>
        </div>

        {/* ── Filter Bar ── */}
        <div className={styles.filterBar}>
          <div className={styles.searchWrap}>
            <span className={styles.searchIcon}><Search size={16} /></span>
            <input
              className={styles.searchInput}
              type="text"
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
            {search && (
              <button className={styles.searchClear} onClick={() => { setSearch(""); setPage(1); }} type="button">
                <X size={14} />
              </button>
            )}
          </div>

          <select
            className={styles.filterSelect}
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          >
            <option value="ALL">All Roles</option>
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>

          <select
            className={styles.filterSelect}
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>

        {/* ── Content ── */}
        {loading ? (
          <div className={styles.grid}>
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className={styles.skeletonCard} />)}
          </div>
        ) : error ? (
          <div className={styles.stateBox}>
            <span className={styles.stateIcon}><AlertTriangle size={48} /></span>
            <h3 className={styles.stateTitle}>Failed to load</h3>
            <p className={styles.stateBody}>{error}</p>
            <button className={styles.stateBtn} onClick={fetchUsers} type="button">Try Again</button>
          </div>
        ) : visible.length === 0 ? (
          <div className={styles.stateBox}>
            <span className={styles.stateIcon}><Users size={48} /></span>
            <h3 className={styles.stateTitle}>No users found</h3>
            <p className={styles.stateBody}>Try adjusting your search or filters.</p>
          </div>
        ) : (
          <>
            <div className={styles.grid}>
              {visible.map((u, i) => (
                <div key={u.id} className={styles.card} style={{ animationDelay: `${i * 20}ms` }} onClick={() => openDetail(u)}>
                  <div className={styles.cardAvatar}>
                    {u.avatarUrl
                      ? <img src={u.avatarUrl} alt={u.name} className={styles.cardAvatarImg} />
                      : u.name?.charAt(0).toUpperCase()
                    }
                  </div>
                  <h3 className={styles.cardName}>{u.name}</h3>
                  <p className={styles.cardEmail}>{u.email}</p>
                  <div className={styles.cardFooter}>
                    <span className={styles.badge} style={{ background: roleBg[u.role] ?? "#f0f4f5", color: roleColor[u.role] ?? "#6e7071" }}>
                      {u.role}
                    </span>
                    <span className={`${styles.badge} ${u.active ? styles.badgeActive : styles.badgeInactive}`}>
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
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>

            {/* DETAIL */}
            {modal === "detail" && target && <>
              <div className={styles.modalHeader}>
                <div className={styles.modalTitleGroup}>
                  <div className={styles.modalIcon} style={{ background: 'var(--teal-aero)', color: '#fff' }}>
                    {target.avatarUrl
                      ? <img src={target.avatarUrl} alt={target.name} className={styles.cardAvatarImg} style={{ borderRadius: '50%' }} />
                      : target.name?.charAt(0).toUpperCase()
                    }
                  </div>
                  <div>
                    <h3 className={styles.modalTitle}>{target.name}</h3>
                    <p className={styles.modalSubtitle}>{target.email}</p>
                  </div>
                </div>
                <button className={styles.modalCloseBtn} onClick={closeModal} type="button"><X size={20}/></button>
              </div>

              <div>
                <div className={styles.detailRows}>
                  <div className={styles.detailRow}>
                    <span className={styles.detailRowLabel}>Role</span>
                    <span className={styles.badge} style={{ background: roleBg[target.role] ?? "#f0f4f5", color: roleColor[target.role] ?? "#6e7071" }}>
                      {target.role}
                    </span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailRowLabel}>Status</span>
                    <span className={`${styles.badge} ${target.active ? styles.badgeActive : styles.badgeInactive}`}>
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
                  <button className={styles.detailActionBtn} onClick={() => openEditProfile(target)} type="button">
                    <User size={16} className={styles.detailActionBtnIcon}/> Edit Profile
                  </button>
                  <button className={styles.detailActionBtn} onClick={() => openEditRole(target)} type="button">
                    <Shield size={16} className={styles.detailActionBtnIcon}/> Change Role
                  </button>
                  <button className={styles.detailActionBtn} onClick={() => openEditEmail(target)} type="button">
                    <Mail size={16} className={styles.detailActionBtnIcon}/> Change Email
                  </button>
                  <button className={`${styles.detailActionBtn} ${target.active ? styles.detailActionBtnDanger : styles.detailActionBtnGreen}`}
                    onClick={() => openToggle(target)} type="button">
                    {target.active ? <Power size={16} /> : <CheckCircle size={16} />}
                    {target.active ? "Deactivate User" : "Activate User"}
                  </button>
                </div>
              </div>
            </>}

            {/* CREATE */}
            {modal === "create" && <>
              <div className={styles.modalHeader}>
                <div className={styles.modalTitleGroup}>
                  <div className={styles.modalIcon}><UserPlus size={24} /></div>
                  <h3 className={styles.modalTitle}>Create User</h3>
                </div>
                <button className={styles.modalCloseBtn} onClick={closeModal} type="button"><X size={20}/></button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
                  <select className={styles.fieldSelectLg} value={form.role}
                    onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} disabled={submitting}>
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>

                {modalError && <p className={styles.modalError}><AlertTriangle size={14}/> {modalError}</p>}

                <div className={styles.modalActions}>
                  <button className={styles.modalCancelBtn} onClick={closeModal} disabled={submitting} type="button">Cancel</button>
                  <button className={styles.modalConfirmBtn} onClick={handleCreate} disabled={submitting} type="button">
                    {submitting ? <><Loader2 size={16} className={styles.spinner} /> Creating…</> : "Create User"}
                  </button>
                </div>
              </div>
            </>}

            {/* EDIT PROFILE */}
            {modal === "edit-profile" && target && <>
              <div className={styles.modalHeader}>
                <div className={styles.modalTitleGroup}>
                  <div className={styles.modalIcon}><User size={24} /></div>
                  <div>
                    <h3 className={styles.modalTitle}>Edit Profile</h3>
                    <p className={styles.modalSubtitle}>{target.name}</p>
                  </div>
                </div>
                <button className={styles.modalCloseBtn} onClick={closeModal} type="button"><X size={20}/></button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Full Name */}
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>
                    <User size={11} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                    Full Name <span style={{ color: '#c0392b' }}>*</span>
                  </label>
                  <input
                    className={styles.fieldInput}
                    type="text"
                    placeholder="Full name"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm((f) => ({ ...f, name: e.target.value }))}
                    disabled={submitting}
                  />
                </div>

                {/* Phone Number */}
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>
                    <Phone size={11} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                    Phone Number
                  </label>
                  <input
                    className={styles.fieldInput}
                    type="tel"
                    placeholder="+63 900 000 0000"
                    value={profileForm.phoneNumber}
                    onChange={(e) => setProfileForm((f) => ({ ...f, phoneNumber: e.target.value }))}
                    disabled={submitting}
                  />
                </div>

                {/* Social links divider */}
                <div className={styles.profileSectionDivider}>
                  <Link2 size={12} />
                  <span>Social Links</span>
                </div>

                {/* Facebook */}
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Facebook URL</label>
                  <input
                    className={styles.fieldInput}
                    type="url"
                    placeholder="https://facebook.com/username"
                    value={profileForm.facebookUrl}
                    onChange={(e) => setProfileForm((f) => ({ ...f, facebookUrl: e.target.value }))}
                    disabled={submitting}
                  />
                </div>

                {/* Instagram */}
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Instagram URL</label>
                  <input
                    className={styles.fieldInput}
                    type="url"
                    placeholder="https://instagram.com/username"
                    value={profileForm.instagramUrl}
                    onChange={(e) => setProfileForm((f) => ({ ...f, instagramUrl: e.target.value }))}
                    disabled={submitting}
                  />
                </div>

                {/* Twitter / X */}
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Twitter / X URL</label>
                  <input
                    className={styles.fieldInput}
                    type="url"
                    placeholder="https://twitter.com/username"
                    value={profileForm.twitterUrl}
                    onChange={(e) => setProfileForm((f) => ({ ...f, twitterUrl: e.target.value }))}
                    disabled={submitting}
                  />
                </div>

                {modalError && <p className={styles.modalError}><AlertTriangle size={14}/> {modalError}</p>}

                <div className={styles.modalActions}>
                  <button className={styles.modalCancelBtn} onClick={closeModal} disabled={submitting} type="button">Cancel</button>
                  <button className={styles.modalConfirmBtn} onClick={handleEditProfile} disabled={submitting} type="button">
                    {submitting ? <><Loader2 size={16} className={styles.spinner} /> Saving…</> : "Save Profile"}
                  </button>
                </div>
              </div>
            </>}

            {/* EDIT ROLE */}
            {modal === "edit-role" && target && <>
              <div className={styles.modalHeader}>
                <div className={styles.modalTitleGroup}>
                  <div className={styles.modalIcon}><Shield size={24} /></div>
                  <h3 className={styles.modalTitle}>Change Role</h3>
                </div>
                <button className={styles.modalCloseBtn} onClick={closeModal} type="button"><X size={20}/></button>
              </div>

              <div>
                <p className={styles.modalDesc} style={{ marginBottom: '16px' }}>Changing role for <strong>{target.name}</strong></p>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>New Role</label>
                  <select className={styles.fieldSelectLg} value={newRole}
                    onChange={(e) => setNewRole(e.target.value)} disabled={submitting}>
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>

                {modalError && <p className={styles.modalError} style={{ marginTop: '12px' }}><AlertTriangle size={14}/> {modalError}</p>}

                <div className={styles.modalActions}>
                  <button className={styles.modalCancelBtn} onClick={closeModal} disabled={submitting} type="button">Cancel</button>
                  <button className={styles.modalConfirmBtn} onClick={handleEditRole} disabled={submitting} type="button">
                    {submitting ? <><Loader2 size={16} className={styles.spinner} /> Saving…</> : "Save Role"}
                  </button>
                </div>
              </div>
            </>}

            {/* EDIT EMAIL */}
            {modal === "edit-email" && target && <>
              <div className={styles.modalHeader}>
                <div className={styles.modalTitleGroup}>
                  <div className={styles.modalIcon}><Mail size={24} /></div>
                  <h3 className={styles.modalTitle}>Change Email</h3>
                </div>
                <button className={styles.modalCloseBtn} onClick={closeModal} type="button"><X size={20}/></button>
              </div>

              <div>
                <p className={styles.modalDesc} style={{ marginBottom: '16px' }}>Changing email for <strong>{target.name}</strong></p>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>New Email</label>
                  <input className={styles.fieldInput} type="email"
                    placeholder="new@example.com" value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)} disabled={submitting} />
                </div>

                {modalError && <p className={styles.modalError} style={{ marginTop: '12px' }}><AlertTriangle size={14}/> {modalError}</p>}

                <div className={styles.modalActions}>
                  <button className={styles.modalCancelBtn} onClick={closeModal} disabled={submitting} type="button">Cancel</button>
                  <button className={styles.modalConfirmBtn} onClick={handleEditEmail} disabled={submitting} type="button">
                    {submitting ? <><Loader2 size={16} className={styles.spinner} /> Saving…</> : "Save Email"}
                  </button>
                </div>
              </div>
            </>}

            {/* TOGGLE ACTIVE */}
            {modal === "deactivate" && target && <>
              <div className={styles.modalHeader}>
                <div className={styles.modalTitleGroup}>
                  <div className={`${styles.modalIcon} ${target.active ? styles.modalIconWarn : ''}`}>
                    {target.active ? <ShieldAlert size={24} /> : <CheckCircle size={24} />}
                  </div>
                  <h3 className={styles.modalTitle}>{target.active ? "Deactivate User" : "Activate User"}</h3>
                </div>
                <button className={styles.modalCloseBtn} onClick={closeModal} type="button"><X size={20}/></button>
              </div>

              <div>
                <p className={styles.modalDesc}>
                  {target.active
                    ? <>Are you sure you want to deactivate <strong>{target.name}</strong>? They will not be able to log in.</>
                    : <>Reactivate <strong>{target.name}</strong>? They will be able to log in again.</>
                  }
                </p>

                {modalError && <p className={styles.modalError} style={{ marginTop: '12px' }}><AlertTriangle size={14}/> {modalError}</p>}

                <div className={styles.modalActions}>
                  <button className={styles.modalCancelBtn} onClick={closeModal} disabled={submitting} type="button">Cancel</button>
                  <button className={target.active ? styles.modalWarnBtn : styles.modalConfirmBtn}
                    onClick={handleToggleActive} disabled={submitting} type="button">
                    {submitting ? <><Loader2 size={16} className={styles.spinner} /> Processing…</> : target.active ? "Yes, Deactivate" : "Yes, Activate"}
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