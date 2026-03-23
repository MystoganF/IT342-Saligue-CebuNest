import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "../../../components/Navbar/Navbar";
import styles from "./my_rentals.module.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

// ─── types ─────────────────────────────────────────────────────────────────

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string | null;
}

interface Payment {
  id: number;
  installmentNumber: number;
  amount: number;
  dueDate: string;
  paidAt: string | null;
  status: string;
  checkoutUrl: string | null;
  paymongoPaymentId: string | null;
}

interface RentalRequest {
  id: number;
  propertyId: number;
  propertyTitle: string;
  propertyLocation: string;
  propertyPrice: number;
  propertyImage: string | null;
  ownerId: number;
  ownerName: string;
  ownerEmail: string;
  startDate: string;
  leaseDurationMonths: number;
  status: string;
  paymentPlan: string | null;
  createdAt: string;
  payments?: Payment[];
}

type Tab = "active" | "pending" | "rejected" | "past";

// ─── helpers ───────────────────────────────────────────────────────────────

function formatPrice(amount: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency", currency: "PHP",
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-PH", {
    year: "numeric", month: "long", day: "numeric",
  });
}

function paymentStatusColor(status: string) {
  switch (status) {
    case "PAID":      return { color: "#1a7a4a", bg: "rgba(26,122,74,0.08)", border: "rgba(26,122,74,0.2)" };
    case "OVERDUE":   return { color: "#c0392b", bg: "rgba(192,57,43,0.08)", border: "rgba(192,57,43,0.2)" };
    case "PENDING":   return { color: "#b78e42", bg: "rgba(183,142,66,0.08)", border: "rgba(183,142,66,0.2)" };
    default:          return { color: "#6e7071", bg: "#f0f4f5", border: "#e5eced" };
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case "PENDING":   return "⏳ Awaiting Approval";
    case "APPROVED":  return "✅ Approved — Action Required";
    case "REJECTED":  return "❌ Rejected";
    case "CONFIRMED": return "🏠 Active Rental";
    case "COMPLETED": return "✓ Completed";
    default:          return status;
  }
}

// ─── component ─────────────────────────────────────────────────────────────

const MyRentals: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [user, setUser]         = useState<User | null>(null);
  const [requests, setRequests] = useState<RentalRequest[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [tab, setTab]           = useState<Tab>("active");

  // Expand / payments
  const [expandedId, setExpandedId]     = useState<number | null>(null);
  const [payments, setPayments]         = useState<Record<number, Payment[]>>({});
  const [paymentsLoading, setPaymentsLoading] = useState<Record<number, boolean>>({});

  // Plan confirm modal
  const [confirmTarget, setConfirmTarget] = useState<RentalRequest | null>(null);
  const [selectedPlan, setSelectedPlan]   = useState<"MONTHLY" | "FULL">("MONTHLY");
  const [confirming, setConfirming]       = useState(false);
  const [confirmError, setConfirmError]   = useState<string | null>(null);

  // Payment initiation
  const [initiating, setInitiating]   = useState<number | null>(null);
  const [verifying, setVerifying]     = useState<number | null>(null);
  const [paymentMsg, setPaymentMsg]   = useState<{ type: "success" | "error"; text: string } | null>(null);

  // ── Auth guard ─────────────────────────────────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem("user");
    const token  = localStorage.getItem("accessToken");
    if (!stored || !token) { navigate("/"); return; }
    try {
      const parsed: User = JSON.parse(stored);
      if (parsed.role?.toUpperCase() !== "TENANT") { navigate("/home"); return; }
      setUser(parsed);
    } catch { navigate("/"); }
  }, [navigate]);

  // ── Handle PayMongo redirect ───────────────────────────────────────────
  useEffect(() => {
    const paymentStatus = searchParams.get("payment");
    if (paymentStatus === "success") {
      setPaymentMsg({ type: "success", text: "Payment successful! Verifying with PayMongo…" });
      setTab("active");
    } else if (paymentStatus === "cancelled") {
      setPaymentMsg({ type: "error", text: "Payment was cancelled. You can try again anytime." });
    }
  }, [searchParams]);

  // ── Fetch requests ─────────────────────────────────────────────────────
  const fetchRequests = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const token = localStorage.getItem("accessToken");
      const res   = await fetch(`${API_BASE}/api/rental-requests/my`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (!res.ok || !data.success) { setError("Failed to load rentals."); return; }
      setRequests(data.data.requests ?? []);
    } catch {
      setError("Unable to connect to server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (user) fetchRequests(); }, [user, fetchRequests]);

  // ── Fetch payments for a request ───────────────────────────────────────
  const fetchPayments = async (requestId: number) => {
    if (payments[requestId]) return; // already loaded
    setPaymentsLoading((prev) => ({ ...prev, [requestId]: true }));
    try {
      const token = localStorage.getItem("accessToken");
      const res   = await fetch(`${API_BASE}/api/payments/request/${requestId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.success) {
        setPayments((prev) => ({ ...prev, [requestId]: data.data.payments ?? [] }));
      }
    } catch {}
    finally {
      setPaymentsLoading((prev) => ({ ...prev, [requestId]: false }));
    }
  };

  const toggleExpand = (req: RentalRequest) => {
    if (expandedId === req.id) {
      setExpandedId(null);
    } else {
      setExpandedId(req.id);
      if (req.status === "CONFIRMED" || req.status === "COMPLETED") {
        fetchPayments(req.id);
      }
    }
  };

  // ── Confirm + choose plan ──────────────────────────────────────────────
  const handleConfirm = async () => {
    if (!confirmTarget) return;
    setConfirming(true); setConfirmError(null);
    try {
      const token = localStorage.getItem("accessToken");
      const res   = await fetch(`${API_BASE}/api/payments/confirm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ requestId: confirmTarget.id, plan: selectedPlan }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setConfirmError(data?.error?.message ?? "Failed to confirm.");
        return;
      }
      // Refresh
      setConfirmTarget(null);
      await fetchRequests();
      setTab("active");
    } catch {
      setConfirmError("Network error. Please try again.");
    } finally {
      setConfirming(false);
    }
  };

  // ── Pay a specific installment ─────────────────────────────────────────
  const handlePay = async (paymentId: number) => {
    setInitiating(paymentId); setPaymentMsg(null);
    try {
      const token = localStorage.getItem("accessToken");
      const res   = await fetch(`${API_BASE}/api/payments/${paymentId}/initiate`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setPaymentMsg({ type: "error", text: data?.error?.message ?? "Failed to create payment link." });
        return;
      }
      const checkoutUrl = data.data.payment.checkoutUrl;
      if (checkoutUrl) window.location.href = checkoutUrl;
    } catch {
      setPaymentMsg({ type: "error", text: "Network error. Please try again." });
    } finally {
      setInitiating(null);
    }
  };

  // ── Verify a payment after redirect ───────────────────────────────────
  const handleVerify = async (paymentId: number, requestId: number) => {
    setVerifying(paymentId); setPaymentMsg(null);
    try {
      const token = localStorage.getItem("accessToken");
      const res   = await fetch(`${API_BASE}/api/payments/${paymentId}/verify`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.success) {
        const updated: Payment = data.data.payment;
        setPayments((prev) => ({
          ...prev,
          [requestId]: (prev[requestId] ?? []).map((p) => p.id === paymentId ? updated : p),
        }));
        if (updated.status === "PAID") {
          setPaymentMsg({ type: "success", text: "Payment confirmed! ✓" });
        } else {
          setPaymentMsg({ type: "error", text: "Payment not yet confirmed by PayMongo. Please wait a moment and try again." });
        }
      }
    } catch {
      setPaymentMsg({ type: "error", text: "Verification failed. Please try again." });
    } finally {
      setVerifying(null);
    }
  };

  if (!user) return null;

  // ── Filter by tab ──────────────────────────────────────────────────────
  const filtered = requests.filter((r) => {
    switch (tab) {
      case "active":   return r.status === "CONFIRMED";
      case "pending":  return r.status === "PENDING" || r.status === "APPROVED";
      case "rejected": return r.status === "REJECTED";
      case "past":     return r.status === "COMPLETED";
      default:         return false;
    }
  });

  const counts = {
    active:   requests.filter((r) => r.status === "CONFIRMED").length,
    pending:  requests.filter((r) => r.status === "PENDING" || r.status === "APPROVED").length,
    rejected: requests.filter((r) => r.status === "REJECTED").length,
    past:     requests.filter((r) => r.status === "COMPLETED").length,
  };

  return (
    <div className={styles.page}>
      <Navbar user={user} />

      {/* ── Confirm Plan Modal ── */}
      {confirmTarget && (
        <div className={styles.modalOverlay} onClick={() => !confirming && setConfirmTarget(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Confirm Your Rental</h3>
              <p className={styles.modalSub}>
                You've been approved for <strong>{confirmTarget.propertyTitle}</strong>.
                Choose how you'd like to pay.
              </p>
            </div>

            <div className={styles.modalBody}>
              {/* Property summary */}
              <div className={styles.modalPropSummary}>
                {confirmTarget.propertyImage && (
                  <img src={confirmTarget.propertyImage} alt="" className={styles.modalPropImg} />
                )}
                <div>
                  <div className={styles.modalPropTitle}>{confirmTarget.propertyTitle}</div>
                  <div className={styles.modalPropLocation}>📍 {confirmTarget.propertyLocation}</div>
                  <div className={styles.modalPropMeta}>
                    {formatPrice(confirmTarget.propertyPrice)}/mo ·{" "}
                    {confirmTarget.leaseDurationMonths} month{confirmTarget.leaseDurationMonths !== 1 ? "s" : ""} ·{" "}
                    Move in: {formatDate(confirmTarget.startDate)}
                  </div>
                </div>
              </div>

              {/* Plan selection */}
              <div className={styles.planLabel}>Choose your payment plan:</div>
              <div className={styles.planOptions}>
                <button
                  type="button"
                  className={`${styles.planOption} ${selectedPlan === "MONTHLY" ? styles.planOptionActive : ""}`}
                  onClick={() => setSelectedPlan("MONTHLY")}
                >
                  <div className={styles.planOptionTitle}>📅 Pay Monthly</div>
                  <div className={styles.planOptionDesc}>
                    {formatPrice(confirmTarget.propertyPrice)} / month
                  </div>
                  <div className={styles.planOptionDetail}>
                    {confirmTarget.leaseDurationMonths} separate payments
                  </div>
                </button>

                <button
                  type="button"
                  className={`${styles.planOption} ${selectedPlan === "FULL" ? styles.planOptionActive : ""}`}
                  onClick={() => setSelectedPlan("FULL")}
                >
                  <div className={styles.planOptionTitle}>💳 Pay in Full</div>
                  <div className={styles.planOptionDesc}>
                    {formatPrice(confirmTarget.propertyPrice * confirmTarget.leaseDurationMonths)} total
                  </div>
                  <div className={styles.planOptionDetail}>One single payment</div>
                </button>
              </div>

              {confirmError && <p className={styles.modalError}>⚠ {confirmError}</p>}
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.modalCancelBtn} onClick={() => setConfirmTarget(null)}
                disabled={confirming} type="button">Cancel</button>
              <button className={styles.modalConfirmBtn} onClick={handleConfirm}
                disabled={confirming} type="button">
                {confirming ? <><span className={styles.spinner} /> Confirming…</> : "Confirm Rental"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Page Header ── */}
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>My Rentals</h1>
        <p className={styles.pageSub}>Track your rental requests and payment schedules.</p>
      </div>

      {/* ── Payment message banner ── */}
      {paymentMsg && (
        <div className={styles.bannerWrap}>
          <div className={`${styles.banner} ${paymentMsg.type === "success" ? styles.bannerSuccess : styles.bannerError}`}>
            {paymentMsg.type === "success" ? "✓" : "⚠"} {paymentMsg.text}
            <button className={styles.bannerClose} onClick={() => setPaymentMsg(null)} type="button">✕</button>
          </div>
        </div>
      )}

      <div className={styles.main}>
        {/* ── Tabs ── */}
        <div className={styles.tabs}>
          {(["active", "pending", "rejected", "past"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              className={`${styles.tab} ${tab === t ? styles.tabActive : ""}`}
              onClick={() => setTab(t)}
            >
              {t === "active"   && "🏠 Active"}
              {t === "pending"  && "⏳ Pending"}
              {t === "rejected" && "❌ Rejected"}
              {t === "past"     && "✓ Past"}
              {counts[t] > 0 && (
                <span className={`${styles.tabBadge} ${tab === t ? styles.tabBadgeActive : ""}`}>
                  {counts[t]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Content ── */}
        {loading && (
          <div className={styles.skeletonList}>
            {[1,2,3].map((i) => (
              <div key={i} className={styles.skeletonCard}>
                <div className={styles.skeletonImg} />
                <div className={styles.skeletonBody}>
                  <div className={`${styles.skeletonLine} ${styles.skeletonLg}`} />
                  <div className={`${styles.skeletonLine} ${styles.skeletonMd}`} />
                  <div className={`${styles.skeletonLine} ${styles.skeletonSm}`} />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div className={styles.stateBox}>
            <span className={styles.stateIcon}>⚠️</span>
            <p className={styles.stateText}>{error}</p>
            <button className={styles.stateBtn} onClick={fetchRequests} type="button">Try Again</button>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className={styles.stateBox}>
            <span className={styles.stateIcon}>
              {tab === "active" ? "🏠" : tab === "pending" ? "⏳" : tab === "rejected" ? "❌" : "📋"}
            </span>
            <p className={styles.stateText}>
              {tab === "active"   && "No active rentals yet."}
              {tab === "pending"  && "No pending requests."}
              {tab === "rejected" && "No rejected requests."}
              {tab === "past"     && "No past rentals."}
            </p>
            {tab === "active" && (
              <button className={styles.stateBtn} onClick={() => navigate("/home")} type="button">
                Browse Properties
              </button>
            )}
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className={styles.rentalList}>
            {filtered.map((req) => {
              const isExpanded   = expandedId === req.id;
              const reqPayments  = payments[req.id] ?? [];
              const paidCount    = reqPayments.filter((p) => p.status === "PAID").length;
              const totalPayments = reqPayments.length;
              const nextDue      = reqPayments.find((p) => p.status === "PENDING" || p.status === "OVERDUE");

              return (
                <div key={req.id} className={styles.rentalCard}>

                  {/* ── Card header ── */}
                  <div className={styles.cardHeader}>
                    <div className={styles.cardThumb}>
                      {req.propertyImage
                        ? <img src={req.propertyImage} alt={req.propertyTitle} className={styles.cardThumbImg} />
                        : <div className={styles.cardThumbPlaceholder}>🏠</div>
                      }
                    </div>

                    <div className={styles.cardInfo}>
                      <div className={styles.cardTop}>
                        <div>
                          <h3 className={styles.cardTitle}>{req.propertyTitle}</h3>
                          <div className={styles.cardLocation}>📍 {req.propertyLocation}</div>
                        </div>
                        <div className={styles.cardPrice}>
                          {formatPrice(req.propertyPrice)}<span>/mo</span>
                        </div>
                      </div>

                      <div className={styles.cardMeta}>
                        <span>📅 Move in: {formatDate(req.startDate)}</span>
                        <span>🗓 {req.leaseDurationMonths} month{req.leaseDurationMonths !== 1 ? "s" : ""}</span>
                        <span>👤 {req.ownerName}</span>
                        {req.paymentPlan && (
                          <span>💳 {req.paymentPlan === "MONTHLY" ? "Monthly payments" : "Full payment"}</span>
                        )}
                      </div>

                      <div className={styles.cardBottom}>
                        <span className={styles.cardStatus}>
                          {statusLabel(req.status)}
                        </span>

                        {/* Active: show payment progress */}
                        {req.status === "CONFIRMED" && totalPayments > 0 && (
                          <div className={styles.progressWrap}>
                            <div className={styles.progressBar}>
                              <div
                                className={styles.progressFill}
                                style={{ width: `${(paidCount / totalPayments) * 100}%` }}
                              />
                            </div>
                            <span className={styles.progressLabel}>
                              {paidCount}/{totalPayments} paid
                            </span>
                          </div>
                        )}

                        {/* Approved: action required */}
                        {req.status === "APPROVED" && (
                          <button
                            className={styles.actionBtn}
                            onClick={() => { setConfirmTarget(req); setSelectedPlan("MONTHLY"); setConfirmError(null); }}
                            type="button"
                          >
                            ✓ Confirm & Choose Plan
                          </button>
                        )}

                        {/* Owner contact */}
                        <a href={`mailto:${req.ownerEmail}`} className={styles.contactBtn}>
                          ✉️ Contact Owner
                        </a>

                        {/* Expand toggle */}
                        {(req.status === "CONFIRMED" || req.status === "COMPLETED") && (
                          <button
                            className={styles.expandBtn}
                            onClick={() => toggleExpand(req)}
                            type="button"
                          >
                            {isExpanded ? "▲ Hide payments" : "▼ View payments"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ── Payment schedule ── */}
                  {isExpanded && (
                    <div className={styles.paymentsSection}>
                      <div className={styles.paymentsSectionTitle}>Payment Schedule</div>

                      {paymentsLoading[req.id] && (
                        <div className={styles.paymentsLoading}>Loading payments…</div>
                      )}

                      {!paymentsLoading[req.id] && reqPayments.length === 0 && (
                        <div className={styles.paymentsEmpty}>No payments generated yet.</div>
                      )}

                      {!paymentsLoading[req.id] && reqPayments.length > 0 && (
                        <div className={styles.paymentsList}>
                          {reqPayments.map((p) => {
                            const colors  = paymentStatusColor(p.status);
                            const isPaid  = p.status === "PAID";
                            const label   = p.installmentNumber === 0
                              ? "Full Lease Payment"
                              : `Month ${p.installmentNumber}`;

                            return (
                              <div key={p.id} className={styles.paymentRow}>
                                <div className={styles.paymentLeft}>
                                  <div className={styles.paymentLabel}>{label}</div>
                                  <div className={styles.paymentDate}>
                                    Due: {formatDate(p.dueDate)}
                                    {p.paidAt && ` · Paid: ${formatDate(p.paidAt)}`}
                                  </div>
                                </div>
                                <div className={styles.paymentMiddle}>
                                  {formatPrice(p.amount)}
                                </div>
                                <div className={styles.paymentRight}>
                                  <span
                                    className={styles.paymentStatus}
                                    style={{ color: colors.color, background: colors.bg, borderColor: colors.border }}
                                  >
                                    {p.status}
                                  </span>

                                  {!isPaid && (
                                    <button
                                      className={styles.payBtn}
                                      onClick={() => handlePay(p.id)}
                                      disabled={initiating === p.id}
                                      type="button"
                                    >
                                      {initiating === p.id
                                        ? <><span className={styles.spinner} /> Opening…</>
                                        : "Pay Now"}
                                    </button>
                                  )}

                                  {!isPaid && p.paymongoPaymentId && (
                                    <button
                                      className={styles.verifyBtn}
                                      onClick={() => handleVerify(p.id, req.id)}
                                      disabled={verifying === p.id}
                                      type="button"
                                    >
                                      {verifying === p.id ? "Checking…" : "Verify"}
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyRentals;