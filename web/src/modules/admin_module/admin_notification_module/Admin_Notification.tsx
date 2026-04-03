import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import AdminSidebar from "../../../components/AdminSidebar/AdminSidebar";
import styles from "./admin_notification.module.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

interface AdminUser { id: number; name: string; email: string; role: string; avatarUrl?: string | null; }

interface BroadcastRecord {
  id: number;
  type: string;
  message: string;
  targetRoles: string[];
  recipientCount: number;
  sentByName: string;
  sentAt: string;
}

const NOTIFICATION_TYPES = [
  { value: "ADMIN_BROADCAST",  label: "📢 General Broadcast"  },
  { value: "MAINTENANCE",      label: "🔧 Maintenance Notice"  },
  { value: "POLICY_UPDATE",    label: "📋 Policy Update"       },
  { value: "PAYMENT_REMINDER", label: "💳 Payment Reminder"    },
  { value: "EMERGENCY",        label: "🚨 Emergency Alert"     },
];

function typeColor(type: string): string {
  if (type === "EMERGENCY")        return "#c0392b";
  if (type === "MAINTENANCE")      return "#b78e42";
  if (type === "PAYMENT_REMINDER") return "#2d8c6a";
  return "#1f5d71";
}

function typeIcon(type: string): string {
  if (type === "ADMIN_BROADCAST")  return "📢";
  if (type === "MAINTENANCE")      return "🔧";
  if (type === "POLICY_UPDATE")    return "📋";
  if (type === "PAYMENT_REMINDER") return "💳";
  if (type === "EMERGENCY")        return "🚨";
  return "🔔";
}

function typeBg(type: string): string {
  if (type === "EMERGENCY")        return "rgba(192,57,43,0.08)";
  if (type === "MAINTENANCE")      return "rgba(183,142,66,0.08)";
  if (type === "PAYMENT_REMINDER") return "rgba(45,140,106,0.08)";
  return "rgba(31,93,113,0.06)";
}

function timeAgo(isoStr: string): string {
  const diff  = Date.now() - new Date(isoStr).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  < 1)  return "just now";
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  < 7)  return `${days}d ago`;
  return new Date(isoStr).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

const apiFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const token = localStorage.getItem("accessToken");
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers as Record<string, string> ?? {}),
    },
  });
  if (res.status === 401) {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    window.location.href = "/";
  }
  return res;
};

const AdminNotifications: React.FC = () => {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState<AdminUser | null>(null);

  // Compose state
  const [type, setType]             = useState("ADMIN_BROADCAST");
  const [message, setMessage]       = useState("");
  const [targetOwner, setOwner]     = useState(true);
  const [targetTenant, setTenant]   = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError]   = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // History state
  const [history, setHistory]           = useState<BroadcastRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

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

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true); setHistoryError(null);
    try {
      const res  = await apiFetch(`${API_BASE}/api/admin/notifications/history`);
      const data = await res.json();
      if (!res.ok || !data.success) { setHistoryError(data?.error?.message ?? "Failed to load history."); return; }
      setHistory(data.data.history ?? []);
    } catch { setHistoryError("Unable to connect."); }
    finally { setHistoryLoading(false); }
  }, []);

  useEffect(() => { if (admin) fetchHistory(); }, [admin, fetchHistory]);

  const handleSend = async () => {
    if (!message.trim())              { setFormError("Message cannot be empty."); return; }
    if (!targetOwner && !targetTenant){ setFormError("Select at least one recipient group."); return; }

    const roles: string[] = [];
    if (targetOwner)  roles.push("OWNER");
    if (targetTenant) roles.push("TENANT");

    setSubmitting(true); setFormError(null); setSuccessMsg(null);
    try {
      const res  = await apiFetch(`${API_BASE}/api/admin/notifications/broadcast`, {
        method: "POST",
        body: JSON.stringify({ type, message: message.trim(), targetRoles: roles }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) { setFormError(data?.error?.message ?? "Failed to send."); return; }

      const count: number = data.data?.recipientCount ?? 0;
      setSuccessMsg(`Sent to ${roles.join(" & ")} — ${count} recipient${count !== 1 ? "s" : ""} notified.`);
      setTimeout(() => setSuccessMsg(null), 5000);
      setMessage(""); setType("ADMIN_BROADCAST"); setOwner(true); setTenant(true);

      // Refresh history from server
      await fetchHistory();
    } catch { setFormError("Network error. Please try again."); }
    finally { setSubmitting(false); }
  };

  const charCount = message.length;
  const MAX_CHARS = 500;

  if (!admin) return null;

  return (
    <div className={styles.page}>
      <AdminSidebar user={admin} navItems={[
        { path: "/admin/rental-requests", icon: "📋", label: "Rental Requests" },
        { path: "/admin/properties",      icon: "🏘️", label: "All Properties"  },
        { path: "/admin/users",           icon: "👥", label: "Users"           },
        
        { path: "/admin/audit-log",       icon: "📜", label: "Audit Log"       },
        { path: "/admin/notifications",   icon: "🔔", label: "Create Notifications"   },
      ]} />

      <div className={styles.main}>
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>Notifications</h1>
            <p className={styles.pageSub}>Broadcast announcements to Owners and Tenants</p>
          </div>
          {history.length > 0 && (
            <span className={styles.headerCount}>{history.length} broadcast{history.length !== 1 ? "s" : ""} total</span>
          )}
        </div>

        <div className={styles.layout}>

          {/* ── Compose Panel ── */}
          <div className={styles.composeCard}>
            <div className={styles.composeHeader}>
              <span className={styles.composeHeaderIcon}>📣</span>
              <div>
                <h2 className={styles.composeTitle}>New Broadcast</h2>
                <p className={styles.composeSubtitle}>Appears in-app for all selected active users</p>
              </div>
            </div>

            {/* Type picker */}
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Notification Type</label>
              <div className={styles.typeGrid}>
                {NOTIFICATION_TYPES.map((t) => (
                  <button key={t.value} type="button"
                    className={`${styles.typeChip} ${type === t.value ? styles.typeChipActive : ""}`}
                    style={type === t.value ? { borderColor: typeColor(t.value), color: typeColor(t.value), background: typeBg(t.value) } : {}}
                    onClick={() => setType(t.value)} disabled={submitting}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Recipients */}
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Recipients</label>
              <div className={styles.recipientRow}>
                <button type="button"
                  className={`${styles.recipientChip} ${targetOwner ? styles.recipientOwnerActive : ""}`}
                  onClick={() => setOwner((v) => !v)} disabled={submitting}>
                  <span className={styles.recipientCheck}>{targetOwner ? "✓" : ""}</span>🏠 Owners
                </button>
                <button type="button"
                  className={`${styles.recipientChip} ${targetTenant ? styles.recipientTenantActive : ""}`}
                  onClick={() => setTenant((v) => !v)} disabled={submitting}>
                  <span className={styles.recipientCheck}>{targetTenant ? "✓" : ""}</span>🔑 Tenants
                </button>
              </div>
            </div>

            {/* Message */}
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Message</label>
              <textarea className={styles.textarea}
                placeholder="Type your message here…" value={message}
                maxLength={MAX_CHARS} rows={5}
                onChange={(e) => setMessage(e.target.value)} disabled={submitting} />
              <div className={styles.charCount}>
                <span className={charCount > MAX_CHARS * 0.9 ? styles.charCountWarn : ""}>{charCount}</span>/{MAX_CHARS}
              </div>
            </div>

            {formError  && <p className={styles.formError}>⚠ {formError}</p>}
            {successMsg && <p className={styles.formSuccess}>✓ {successMsg}</p>}

            <button className={styles.sendBtn} type="button"
              onClick={handleSend} disabled={submitting || !message.trim()}>
              {submitting ? <><span className={styles.spinner} />Sending…</> : "📤 Send Notification"}
            </button>
          </div>

          {/* ── Persistent History Panel ── */}
          <div className={styles.historyPanel}>
            <div className={styles.historyHeaderRow}>
              <h2 className={styles.historyTitle}>Broadcast History</h2>
              <button className={styles.refreshBtn} onClick={fetchHistory}
                disabled={historyLoading} type="button" title="Refresh">
                {historyLoading ? <span className={styles.spinnerSm} /> : "↻"}
              </button>
            </div>

            {historyLoading && history.length === 0 ? (
              <div className={styles.historyEmpty}>
                <span className={styles.spinnerMd} />
                <p>Loading history…</p>
              </div>
            ) : historyError ? (
              <div className={styles.historyEmpty}>
                <span className={styles.historyEmptyIcon}>⚠️</span>
                <p>{historyError}</p>
                <button className={styles.retryBtn} onClick={fetchHistory} type="button">Try Again</button>
              </div>
            ) : history.length === 0 ? (
              <div className={styles.historyEmpty}>
                <span className={styles.historyEmptyIcon}>🔔</span>
                <p>No broadcasts sent yet.</p>
                <p className={styles.historyEmptyHint}>Sent notifications will appear here permanently.</p>
              </div>
            ) : (
              <div className={styles.historyList}>
                {history.map((item) => (
                  <div key={item.id} className={styles.historyItem}>

                    {/* Type icon + label */}
                    <div className={styles.historyItemHeader}>
                      <span
                        className={styles.historyTypeIcon}
                        style={{ background: typeBg(item.type) }}
                      >
                        {typeIcon(item.type)}
                      </span>
                      <span
                        className={styles.historyTypeName}
                        style={{ color: typeColor(item.type) }}
                      >
                        {item.type.replace(/_/g, " ")}
                      </span>
                      <div className={styles.historyRoles}>
                        {item.targetRoles.map((r) => (
                          <span key={r} className={`${styles.historyRoleBadge} ${r === "OWNER" ? styles.ownerBadge : styles.tenantBadge}`}>
                            {r}
                          </span>
                        ))}
                      </div>
                    </div>

                    <p className={styles.historyMessage}>{item.message}</p>

                    <div className={styles.historyMeta}>
                      <span className={styles.historyTime}>
                        🕐 {timeAgo(item.sentAt)}
                      </span>
                      <span className={styles.historyRecipients}>
                        👤 {item.recipientCount} recipient{item.recipientCount !== 1 ? "s" : ""}
                      </span>
                      <span className={styles.historySentBy}>
                        by {item.sentByName}
                      </span>
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default AdminNotifications;