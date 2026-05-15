import React, { useState, useEffect, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { notificationsApi } from "./notifications.api";
import styles from "./admin_notification.module.css";
import {
  Megaphone,
  Wrench,
  FileText,
  AlertTriangle,
  CreditCard,
  Bell,
  BellOff,
  Home,
  Key,
  Check,
  Send,
  Clock,
  User,
  RefreshCw,
  Loader2
} from "lucide-react";

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
  { value: "ADMIN_BROADCAST",  label: "General Broadcast"  },
  { value: "MAINTENANCE",      label: "Maintenance Notice" },
  { value: "POLICY_UPDATE",    label: "Policy Update"      },
  { value: "EMERGENCY",        label: "Emergency Alert"    },
];

function typeColor(type: string): string {
  if (type === "EMERGENCY")        return "#c0392b";
  if (type === "MAINTENANCE")      return "#b78e42";
  return "#1f5d71";
}

function getNotifIcon(type: string, size = 18) {
  if (type === "ADMIN_BROADCAST")  return <Megaphone size={size} />;
  if (type === "MAINTENANCE")      return <Wrench size={size} />;
  if (type === "POLICY_UPDATE")    return <FileText size={size} />;
  if (type === "PAYMENT_REMINDER") return <CreditCard size={size} />;
  if (type === "EMERGENCY")        return <AlertTriangle size={size} />;
  return <Bell size={size} />;
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

const AdminNotifications: React.FC = () => {
  // Grab admin user from Layout context
  const { user: admin } = useOutletContext<{ user: AdminUser }>();

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

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true); setHistoryError(null);
    try {
      const data = await notificationsApi.getBroadcastHistory();
      if (!data.success) { setHistoryError(data?.error?.message ?? "Failed to load history."); return; }
      setHistory(data.data.history ?? []);
    } catch { 
      setHistoryError("Unable to connect."); 
    } finally { 
      setHistoryLoading(false); 
    }
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
      const data = await notificationsApi.sendBroadcast({
        type,
        message: message.trim(),
        targetRoles: roles
      });

      if (!data.success) { setFormError(data?.error?.message ?? "Failed to send."); return; }

      const count: number = data.data?.recipientCount ?? 0;
      setSuccessMsg(`Sent to ${roles.join(" & ")} — ${count} recipient${count !== 1 ? "s" : ""} notified.`);
      setTimeout(() => setSuccessMsg(null), 5000);
      setMessage(""); setType("ADMIN_BROADCAST"); setOwner(true); setTenant(true);

      // Refresh history from server
      await fetchHistory();
    } catch (err: any) { 
      setFormError(err.response?.data?.error?.message || "Network error. Please try again."); 
    } finally { 
      setSubmitting(false); 
    }
  };

  const charCount = message.length;
  const MAX_CHARS = 500;

  if (!admin) return null;

  return (
    <div className={styles.page}>
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
            <div className={styles.composeHeader} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span className={styles.composeHeaderIcon} style={{ display: "flex" }}>
                <Megaphone size={28} color="#1f5d71" />
              </span>
              <div>
                <h2 className={styles.composeTitle}>New Broadcast</h2>
                <p className={styles.composeSubtitle}>Appears in-app for all selected active users</p>
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.fieldLabel}>Notification Type</label>
              <div className={styles.typeGrid}>
                {NOTIFICATION_TYPES.map((t) => (
                  <button key={t.value} type="button"
                    className={`${styles.typeChip} ${type === t.value ? styles.typeChipActive : ""}`}
                    style={{
                      ...(type === t.value ? { borderColor: typeColor(t.value), color: typeColor(t.value), background: typeBg(t.value) } : {}),
                      display: "flex", alignItems: "center", gap: "6px", justifyContent: "center"
                    }}
                    onClick={() => setType(t.value)} disabled={submitting}>
                    {getNotifIcon(t.value, 16)}
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.fieldLabel}>Recipients</label>
              <div className={styles.recipientRow}>
                <button type="button"
                  className={`${styles.recipientChip} ${targetOwner ? styles.recipientOwnerActive : ""}`}
                  onClick={() => setOwner((v) => !v)} disabled={submitting}
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span className={styles.recipientCheck} style={{ display: "flex" }}>
                    {targetOwner ? <Check size={16} /> : <span style={{ width: 16 }} />}
                  </span>
                  <Home size={16} /> Owners
                </button>
                <button type="button"
                  className={`${styles.recipientChip} ${targetTenant ? styles.recipientTenantActive : ""}`}
                  onClick={() => setTenant((v) => !v)} disabled={submitting}
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span className={styles.recipientCheck} style={{ display: "flex" }}>
                    {targetTenant ? <Check size={16} /> : <span style={{ width: 16 }} />}
                  </span>
                  <Key size={16} /> Tenants
                </button>
              </div>
            </div>

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

            {formError  && <p className={styles.formError} style={{ display: "flex", alignItems: "center", gap: "6px" }}><AlertTriangle size={16} /> {formError}</p>}
            {successMsg && <p className={styles.formSuccess} style={{ display: "flex", alignItems: "center", gap: "6px" }}><Check size={16} /> {successMsg}</p>}

            <button className={styles.sendBtn} type="button"
              onClick={handleSend} disabled={submitting || !message.trim()}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
              {submitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              {submitting ? "Sending…" : "Send Notification"}
            </button>
          </div>

          {/* ── Persistent History Panel ── */}
          <div className={styles.historyPanel}>
            <div className={styles.historyHeaderRow} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h2 className={styles.historyTitle}>Broadcast History</h2>
              <button className={styles.refreshBtn} onClick={fetchHistory}
                disabled={historyLoading} type="button" title="Refresh"
                style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                <RefreshCw size={18} className={historyLoading ? "animate-spin" : ""} />
              </button>
            </div>

            {historyLoading && history.length === 0 ? (
              <div className={styles.historyEmpty} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                <Loader2 size={24} className="animate-spin" color="var(--slate)" />
                <p>Loading history…</p>
              </div>
            ) : historyError ? (
              <div className={styles.historyEmpty} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                <span className={styles.historyEmptyIcon} style={{ display: "flex" }}><AlertTriangle size={32} color="#c0392b" /></span>
                <p>{historyError}</p>
                <button className={styles.retryBtn} onClick={fetchHistory} type="button">Try Again</button>
              </div>
            ) : history.length === 0 ? (
              <div className={styles.historyEmpty} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                <span className={styles.historyEmptyIcon} style={{ display: "flex", opacity: 0.5 }}><BellOff size={32} color="var(--slate)" /></span>
                <p>No broadcasts sent yet.</p>
                <p className={styles.historyEmptyHint}>Sent notifications will appear here permanently.</p>
              </div>
            ) : (
              <div className={styles.historyList}>
                {history.map((item) => (
                  <div key={item.id} className={styles.historyItem}>

                    <div className={styles.historyItemHeader} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span
                        className={styles.historyTypeIcon}
                        style={{ background: typeBg(item.type), display: "flex", alignItems: "center", justifyContent: "center", color: typeColor(item.type), width: 32, height: 32, borderRadius: 8 }}
                      >
                        {getNotifIcon(item.type, 16)}
                      </span>
                      <span
                        className={styles.historyTypeName}
                        style={{ color: typeColor(item.type), fontWeight: 600 }}
                      >
                        {item.type.replace(/_/g, " ")}
                      </span>
                      <div className={styles.historyRoles} style={{ display: "flex", gap: "6px", marginLeft: "auto" }}>
                        {item.targetRoles.map((r) => (
                          <span key={r} className={`${styles.historyRoleBadge} ${r === "OWNER" ? styles.ownerBadge : styles.tenantBadge}`}>
                            {r}
                          </span>
                        ))}
                      </div>
                    </div>

                    <p className={styles.historyMessage} style={{ margin: "12px 0", color: "#334155" }}>{item.message}</p>

                    <div className={styles.historyMeta} style={{ display: "flex", alignItems: "center", gap: "16px", color: "var(--slate)", fontSize: 12 }}>
                      <span className={styles.historyTime} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <Clock size={14} /> {timeAgo(item.sentAt)}
                      </span>
                      <span className={styles.historyRecipients} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <User size={14} /> {item.recipientCount} recipient{item.recipientCount !== 1 ? "s" : ""}
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