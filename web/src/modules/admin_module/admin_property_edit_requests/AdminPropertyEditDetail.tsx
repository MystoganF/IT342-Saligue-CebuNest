import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams, useOutletContext } from "react-router-dom";
import { propertyEditsApi } from "./admin_property_edits.api";
import styles from "./AdminPropertyEditDetail.module.css";
import {
  ChevronLeft, RefreshCw, CheckCircle2, XCircle, AlertTriangle, Loader2,
  Check, X, User, Mail, Clock, MapPin, Tag, BedDouble, Bath, Maximize,
  DollarSign, FileText, FilePen,
} from "lucide-react";

interface AdminUser { id: number; name: string; email: string; role: string; }

interface EditRequest {
  id: number;
  propertyId: number;
  propertyCurrentStatus: string;
  submittedByName: string;
  submittedByEmail: string;
  editStatus: string;
  previousTitle: string;
  previousDescription: string;
  previousPrice: number;
  previousLocation: string;
  previousTypeName: string;
  previousBeds: number | null;
  previousBaths: number | null;
  previousSqm: number | null;
  proposedTitle: string;
  proposedDescription: string;
  proposedPrice: number;
  proposedLocation: string;
  proposedTypeName: string;
  proposedBeds: number | null;
  proposedBaths: number | null;
  proposedSqm: number | null;
  titleChanged: boolean;
  descriptionChanged: boolean;
  priceChanged: boolean;
  locationChanged: boolean;
  typeChanged: boolean;
  bedsChanged: boolean;
  bathsChanged: boolean;
  sqmChanged: boolean;
  createdAt: string;
}

function formatPrice(n: number | undefined | null) {
  if (n == null || isNaN(n)) return "—";
  return new Intl.NumberFormat("en-PH", {
    style: "currency", currency: "PHP",
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n);
}

function formatDate(isoStr: string | undefined) {
  if (!isoStr) return "—";
  return new Date(isoStr).toLocaleDateString("en-PH", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ── Single diff row ───────────────────────────────────────────────────────────
function DiffRow({
  label, icon, oldVal, newVal, changed,
}: {
  label: string;
  icon: React.ReactNode;
  oldVal: string | number | null | undefined;
  newVal: string | number | null | undefined;
  changed: boolean;
}) {
  const fmt = (v: string | number | null | undefined) =>
    v == null || v === "" ? (
      <span style={{ color: "#b0bcbe", fontStyle: "italic" }}>None</span>
    ) : (
      <span style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{String(v)}</span>
    );

  return (
    <div className={`${styles.diffRow} ${changed ? styles.diffRowChanged : ""}`}>
      <div className={styles.diffLabel}>
        <span className={styles.diffLabelIcon}>{icon}</span>
        {label}
        {changed && <span className={styles.diffChangedBadge}>Changed</span>}
      </div>
      <div className={styles.diffCols}>
        <div className={`${styles.diffCol} ${styles.diffColOld}`}>
          <span className={styles.diffColHeader}>Current (live)</span>
          <span className={`${styles.diffVal} ${changed ? styles.diffValOld : ""}`}>
            {fmt(oldVal)}
          </span>
        </div>
        <div className={styles.diffArrow}>→</div>
        <div className={`${styles.diffCol} ${styles.diffColNew}`}>
          <span className={styles.diffColHeader}>Proposed</span>
          <span className={`${styles.diffVal} ${changed ? styles.diffValNew : ""}`}>
            {fmt(newVal)}
          </span>
        </div>
      </div>
    </div>
  );
}

const AdminPropertyEditDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id }   = useParams<{ id: string }>();
  const { user: admin } = useOutletContext<{ user: AdminUser }>();

  const [editRequest, setEditRequest] = useState<EditRequest | null>(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);

  const [modal, setModal]             = useState<"APPROVED" | "REJECTED" | null>(null);
  const [reason, setReason]           = useState("");
  const [submitting, setSubmitting]   = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true); setError(null);
    try {
      const data = await propertyEditsApi.getEditRequestDetail(id);
      if (!data.success) { setError(data?.error?.message ?? "Failed to load."); return; }
      setEditRequest(data.data.editRequest);
    } catch {
      setError("Unable to connect to server.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { if (admin) fetchDetail(); }, [admin, fetchDetail]);

  const openModal = (decision: "APPROVED" | "REJECTED") => {
    setReason(""); setActionError(null); setModal(decision);
  };
  const closeModal = () => { if (submitting) return; setModal(null); };

  const handleDecision = async () => {
    if (!id || !modal) return;
    if (modal === "REJECTED" && !reason.trim()) {
      setActionError("Rejection reason is required."); return;
    }
    setSubmitting(true); setActionError(null);
    try {
      const data = await propertyEditsApi.reviewEditRequest(
        id, modal, reason.trim() || undefined,
      );
      if (!data.success) { setActionError(data?.error?.message ?? "Action failed."); return; }
      navigate("/admin/property-edit-requests");
    } catch {
      setActionError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!admin) return null;

  return (
    <div className={styles.page}>
      <div className={styles.main}>

        {/* ── Decision Modal ── */}
        {modal && (
          <div className={styles.modalOverlay} onClick={closeModal}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div className={`${styles.modalHeader} ${modal === "APPROVED" ? styles.modalHeaderApprove : styles.modalHeaderReject}`}>
                {modal === "APPROVED"
                  ? <CheckCircle2 size={24} style={{ color: "#1a7a4a" }} />
                  : <XCircle size={24} style={{ color: "#c0392b" }} />}
                <h3 className={styles.modalTitle}>
                  {modal === "APPROVED" ? "Approve Edit Request" : "Reject Edit Request"}
                </h3>
              </div>

              <div style={{ padding: "16px 24px" }}>
                <p style={{ fontSize: 14, color: "#6e7071", marginBottom: 16, lineHeight: 1.6 }}>
                  {modal === "APPROVED"
                    ? "The proposed changes will be applied to the live property and the owner will be notified."
                    : "The property will revert to its previous state. Provide a reason for the owner."}
                </p>

                {modal === "APPROVED" ? (
                  <div>
                    <label className={styles.inputLabel}>
                      Note for owner <span style={{ color: "#6e7071", fontWeight: 400 }}>(optional)</span>
                    </label>
                    <input
                      className={styles.reasonInput}
                      type="text"
                      placeholder="e.g. Changes look great!"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                  </div>
                ) : (
                  <div>
                    <label className={styles.inputLabel}>
                      Rejection reason <span style={{ color: "#c0392b" }}>*</span>
                    </label>
                    <textarea
                      className={styles.reasonInput}
                      style={{ minHeight: 90, resize: "vertical" }}
                      placeholder="Explain why this edit request is being rejected…"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                  </div>
                )}

                {actionError && (
                  <p style={{ fontSize: 13, color: "#c0392b", fontWeight: 600, marginTop: 10, display: "flex", alignItems: "center", gap: 6 }}>
                    <AlertTriangle size={14} /> {actionError}
                  </p>
                )}
              </div>

              <div style={{ display: "flex", gap: 10, padding: "12px 24px 20px", justifyContent: "flex-end" }}>
                <button className={styles.modalCancelBtn} onClick={closeModal} disabled={submitting} type="button">
                  Cancel
                </button>
                <button
                  className={modal === "APPROVED" ? styles.modalApproveBtn : styles.modalRejectBtn}
                  onClick={handleDecision}
                  disabled={submitting}
                  type="button"
                >
                  {submitting
                    ? <><span className={styles.spinner} /> Processing…</>
                    : modal === "APPROVED"
                      ? <><Check size={16} /> Approve Changes</>
                      : <><X size={16} /> Reject Changes</>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Back + Refresh ── */}
        <div className={styles.pageHeader}>
          <button type="button" className={styles.backBtn} onClick={() => navigate(-1)}>
            <ChevronLeft size={18} /> Back to Edit Requests
          </button>
          <button className={styles.refreshBtn} onClick={fetchDetail} disabled={loading} type="button">
            <RefreshCw size={16} className={loading ? styles.spin : ""} /> Refresh
          </button>
        </div>

        {loading ? (
          <div className={styles.skeletonList}>
            {[1, 2, 3].map((i) => (
              <div key={i} className={styles.skeletonCard}>
                <div className={styles.skeletonImg} />
                <div className={styles.skeletonBody}>
                  <div className={`${styles.skeletonLine} ${styles.skeletonLineLg}`} />
                  <div className={`${styles.skeletonLine} ${styles.skeletonLineMd}`} />
                  <div className={`${styles.skeletonLine} ${styles.skeletonLineSm}`} />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className={styles.stateBox}>
            <span className={styles.stateIcon}><AlertTriangle size={48} /></span>
            <h3 className={styles.stateTitle}>Failed to load</h3>
            <p className={styles.stateBody}>{error}</p>
            <button className={styles.stateBtn} onClick={fetchDetail} type="button">Try Again</button>
          </div>
        ) : editRequest ? (
          <>
            {/* ── Header card ── */}
            <div className={styles.headerCard}>
              <div className={styles.headerCardIcon}><FilePen size={28} /></div>
              <div className={styles.headerCardInfo}>
                <h2 className={styles.headerCardTitle}>Edit Request #{editRequest.id}</h2>
                <div className={styles.headerCardMeta}>
                  <span><User size={13} /> {editRequest.submittedByName}</span>
                  <span><Mail size={13} /> {editRequest.submittedByEmail}</span>
                  <span><Clock size={13} /> Submitted {formatDate(editRequest.createdAt)}</span>
                </div>
              </div>
              <span className={`${styles.statusBadge} ${styles.statusPending}`}>
                PENDING REVIEW
              </span>
            </div>

            {/* ── Diff table ── */}
            <div className={styles.diffCard}>
              <div className={styles.diffCardTitle}>
                Field-by-Field Changes
                <span className={styles.diffCardSub}>Highlighted rows have proposed changes</span>
              </div>

              <DiffRow label="Title"            icon={<FileText size={14} />}
                oldVal={editRequest.previousTitle}       newVal={editRequest.proposedTitle}       changed={editRequest.titleChanged} />
              <DiffRow label="Description"      icon={<FileText size={14} />}
                oldVal={editRequest.previousDescription} newVal={editRequest.proposedDescription} changed={editRequest.descriptionChanged} />
              <DiffRow label="Price / month"    icon={<DollarSign size={14} />}
                oldVal={formatPrice(editRequest.previousPrice)} newVal={formatPrice(editRequest.proposedPrice)} changed={editRequest.priceChanged} />
              <DiffRow label="Location"         icon={<MapPin size={14} />}
                oldVal={editRequest.previousLocation}   newVal={editRequest.proposedLocation}    changed={editRequest.locationChanged} />
              <DiffRow label="Property Type"    icon={<Tag size={14} />}
                oldVal={editRequest.previousTypeName}   newVal={editRequest.proposedTypeName}    changed={editRequest.typeChanged} />
              <DiffRow label="Bedrooms"         icon={<BedDouble size={14} />}
                oldVal={editRequest.previousBeds}       newVal={editRequest.proposedBeds}        changed={editRequest.bedsChanged} />
              <DiffRow label="Bathrooms"        icon={<Bath size={14} />}
                oldVal={editRequest.previousBaths}      newVal={editRequest.proposedBaths}       changed={editRequest.bathsChanged} />
              <DiffRow label="Floor Area (sqm)" icon={<Maximize size={14} />}
                oldVal={editRequest.previousSqm}        newVal={editRequest.proposedSqm}         changed={editRequest.sqmChanged} />
            </div>

            {/* ── Action buttons — bottom ── */}
            <div className={styles.actionRow}>
              <button type="button" className={styles.rejectBtn} onClick={() => openModal("REJECTED")}>
                <X size={16} /> Reject Changes
              </button>
              <button type="button" className={styles.approveBtn} onClick={() => openModal("APPROVED")}>
                <Check size={16} /> Approve Changes
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default AdminPropertyEditDetail;