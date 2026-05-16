import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { addPropertyApi } from "./add_property.api";
import styles from "./owner_add_property.module.css";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

import {
  Search,
  AlertTriangle,
  MapPin,
  Lightbulb,
  Camera,
  X,
  Check,
  Loader2,
  ChevronLeft
} from "lucide-react";

// ─── Fix for default marker icons in React-Leaflet ─────────────────────────
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// ─── types ─────────────────────────────────────────────────────────────────
interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string | null;
}

interface PropertyType {
  id: number;
  name: string;
}

interface MapCoords {
  lat: number;
  lon: number;
}

// ─── Cebu City bounds ──────────────────────────────────────────────────────
const CEBU_CITY_BOUNDS = {
  minLat: 10.255,
  maxLat: 10.445,
  minLon: 123.808,
  maxLon: 123.924,
};

// ─── helpers ───────────────────────────────────────────────────────────────
async function geocode(query: string): Promise<MapCoords | null> {
  try {
    const cebuQuery = query.toLowerCase().includes("cebu city")
      ? query
      : `${query}, Cebu City, Philippines`;
    const params = new URLSearchParams({
      q: cebuQuery,
      format: "json",
      limit: "1",
      countrycodes: "ph",
      bounded: "1",
      viewbox: "123.75,10.48,123.95,10.24",
    });
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?${params}`,
      { headers: { "Accept-Language": "en" } },
    );
    const data = await res.json();
    if (!data.length) return null;
    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
    );
    const data = await res.json();
    return data.display_name || null;
  } catch {
    return null;
  }
}

const BLOCKED_CITIES = [
  "mandaue", "lapu-lapu", "lapulapu", "lapu lapu", "minglanilla",
  "talisay", "consolacion", "liloan", "compostela", "cordova",
  "naga", "toledo", "danao", "carcar", "bogo", "mactan",
];

function isBlockedLocation(input: string): boolean {
  const lower = input.toLowerCase();
  return BLOCKED_CITIES.some((city) => lower.includes(city));
}

function ClickableMap({
  coords,
  setCoords,
  onLocationSelect,
}: {
  coords: MapCoords | null;
  setCoords: (c: MapCoords) => void;
  onLocationSelect: (lat: number, lon: number) => void;
}) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      const inBounds =
        lat >= CEBU_CITY_BOUNDS.minLat && lat <= CEBU_CITY_BOUNDS.maxLat &&
        lng >= CEBU_CITY_BOUNDS.minLon && lng <= CEBU_CITY_BOUNDS.maxLon;
      if (!inBounds) {
        onLocationSelect(lat, lng); // trigger error message, skip marker
        return;
      }
      setCoords({ lat, lon: lng });
      onLocationSelect(lat, lng);
    },
  });
  return coords ? <Marker position={[coords.lat, coords.lon]} /> : null;
}

// ─── component ─────────────────────────────────────────────────────────────
const AddProperty: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Grab user from OwnerLayout context
  const { user } = useOutletContext<{ user: User }>();
  const [propertyTypes, setPropertyTypes] = useState<PropertyType[]>([]);

  // Form fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [location, setLocation] = useState("");
  const [typeId, setTypeId] = useState<string>("");
  const [beds, setBeds] = useState("");
  const [baths, setBaths] = useState("");
  const [sqm, setSqm] = useState("");

  // Map
  const [mapCoords, setMapCoords] = useState<MapCoords | null>(null);
  const [mapSearching, setMapSearching] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  // Images
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);

  // Submit
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<{
    type: "success" | "error" | "warning";
    text: string;
  } | null>(null);

  // ── Fetch property types ───────────────────────────────────────────────
  useEffect(() => {
    addPropertyApi
      .getPropertyTypes()
      .then((data) => {
        if (data.success) setPropertyTypes(data.data.types ?? []);
      })
      .catch(() => {});
  }, []);

  // ── Map search ─────────────────────────────────────────────────────────
  const handleMapSearch = async () => {
    if (!location.trim()) {
      setMapError("Please enter a location first.");
      return;
    }

    if (isBlockedLocation(location.trim())) {
      setMapError(
        "Only Cebu City addresses are allowed. Mandaue, Lapu-Lapu, Minglanilla, and other neighboring cities are not permitted.",
      );
      return;
    }

    setMapSearching(true);
    setMapError(null);
    const coords = await geocode(location.trim());
    if (coords) {
      const inBounds =
        coords.lat >= CEBU_CITY_BOUNDS.minLat &&
        coords.lat <= CEBU_CITY_BOUNDS.maxLat &&
        coords.lon >= CEBU_CITY_BOUNDS.minLon &&
        coords.lon <= CEBU_CITY_BOUNDS.maxLon;
      if (!inBounds) {
        setMapError(
          "This location is outside Cebu City. Only addresses within Cebu City are allowed.",
        );
        setMapSearching(false);
        return;
      }
      setMapCoords(coords);
    } else {
      setMapError(
        "Location not found in Cebu City. Try a more specific address.",
      );
    }
    setMapSearching(false);
  };

  const handleMapClick = async (lat: number, lon: number) => {
    // Validate within Cebu City bounds
    if (
      lat < CEBU_CITY_BOUNDS.minLat ||
      lat > CEBU_CITY_BOUNDS.maxLat ||
      lon < CEBU_CITY_BOUNDS.minLon ||
      lon > CEBU_CITY_BOUNDS.maxLon
    ) {
      setMapError("Cannot place a pin here — please select a location on land within Cebu City.");
      return;
    }

    setMapSearching(true);
    setMapError(null);
    try {
      const address = await reverseGeocode(lat, lon);
      if (address) {
        setLocation(address);
      }
    } catch {
      setMapError("Could not retrieve address for this location.");
    } finally {
      setMapSearching(false);
    }
  };

  // ── Image handling ─────────────────────────────────────────────────────
  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const valid = Array.from(files).filter(
      (f) => f.type.startsWith("image/") && f.size <= 5 * 1024 * 1024,
    );
    const combined = [...imageFiles, ...valid].slice(0, 10);
    setImageFiles(combined);
    setImagePreviews(combined.map((f) => URL.createObjectURL(f)));
  };
  
  const removeImage = (index: number) => {
    const updated = imageFiles.filter((_, i) => i !== index);
    setImageFiles(updated);
    setImagePreviews(updated.map((f) => URL.createObjectURL(f)));
  };

const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitMsg(null);

    if (isBlockedLocation(location.trim())) {
      setSubmitMsg({ type: "error", text: "Only Cebu City addresses are allowed." });
      return;
    }
    if (!mapCoords) {
      setSubmitMsg({ type: "error", text: "Please pin a location on the map." });
      return;
    }
    const inBounds =
      mapCoords.lat >= CEBU_CITY_BOUNDS.minLat && mapCoords.lat <= CEBU_CITY_BOUNDS.maxLat &&
      mapCoords.lon >= CEBU_CITY_BOUNDS.minLon && mapCoords.lon <= CEBU_CITY_BOUNDS.maxLon;
    if (!inBounds) {
      setSubmitMsg({ type: "error", text: "Location must be within Cebu City." });
      setMapError("This location is outside Cebu City.");
      return;
    }

    setSubmitting(true);
    setSubmitMsg(null);

    try {
      const createData = await addPropertyApi.createProperty({
        title: title.trim(),
        description: description.trim(),
        price: parseFloat(price),
        location: location.trim(),
        typeId: parseInt(typeId),
        beds: beds ? parseInt(beds) : null,
        baths: baths ? parseInt(baths) : null,
        sqm: sqm ? parseInt(sqm) : null,
      });
      
      if (!createData.success) {
        setSubmitMsg({
          type: "error",
          text: createData?.error?.message ?? "Failed to create property.",
        });
        return;
      }

      const propertyId: number = createData.data?.property?.id;
      if (!propertyId) {
        setSubmitMsg({
          type: "warning",
          text: "Property created but ID not returned. Check your listings.",
        });
        setTimeout(() => navigate("/owner/properties"), 2000);
        return;
      }

      if (imageFiles.length > 0) {
        const formData = new FormData();
        imageFiles.forEach((f) => formData.append("files", f));

        const imgData = await addPropertyApi.uploadPropertyImages(
          propertyId,
          formData,
        );
        if (!imgData.success) {
          setSubmitMsg({
            type: "warning",
            text: "Property created! Some images failed to upload — you can add them later.",
          });
          setTimeout(() => navigate("/owner/properties"), 2000);
          return;
        }
      }

      setSubmitMsg({
        type: "success",
        text: "Property listed successfully! Redirecting…",
      });
      setTimeout(() => navigate("/owner/properties"), 1500);
    } catch {
      setSubmitMsg({ type: "error", text: "Network error. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) return null;

  const submitIcon =
    submitMsg?.type === "success" ? (
      <Check size={16} />
    ) : submitMsg?.type === "warning" ? (
      <AlertTriangle size={16} />
    ) : (
      <X size={16} />
    );

  const submitMsgClass =
    submitMsg?.type === "success"
      ? styles.submitMsgSuccess
      : submitMsg?.type === "warning"
        ? styles.submitMsgWarning
        : styles.submitMsgError;

  return (
    <div className={styles.page}>
      {/* ── Page Header ── */}
      <div className={styles.pageBar}>
        <div className={styles.pageBarDeco} />
        <div className={styles.pageBarAccent} />
        <div className={styles.pageBarInner}>
          <button className={styles.backBtn} onClick={() => navigate(-1)} type="button">
            <ChevronLeft size={16} /> Back
          </button>
          <h1 className={styles.pageBarTitle}>Add New Property</h1>
          <p className={styles.pageBarSub}>
            Fill in the details below to list your property.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <main className={styles.main}>
          {/* ── Basic Info ── */}
          <div className={styles.card}>
            <div className={styles.cardTitle}>Basic Information</div>
            <div className={styles.fieldsGrid}>
              <div className={`${styles.field} ${styles.fieldFull}`}>
                <label className={styles.fieldLabel}>
                  Title <span className={styles.fieldRequired}>*</span>
                </label>
                <input
                  type="text"
                  className={styles.fieldInput}
                  placeholder="e.g. Cozy Studio near IT Park"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className={`${styles.field} ${styles.fieldFull}`}>
                <label className={styles.fieldLabel}>Description</label>
                <textarea
                  className={styles.fieldTextarea}
                  placeholder="Describe your property — amenities, nearby landmarks, house rules…"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.fieldLabel}>
                  Monthly Price (₱) <span className={styles.fieldRequired}>*</span>
                </label>
                <input
                  type="number"
                  className={styles.fieldInput}
                  placeholder="e.g. 6500"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  min={0}
                  required
                />
              </div>

              <div className={styles.field}>
                <label className={styles.fieldLabel}>
                  Property Type <span className={styles.fieldRequired}>*</span>
                </label>
                <select
                  className={styles.fieldSelect}
                  value={typeId}
                  onChange={(e) => setTypeId(e.target.value)}
                  required
                >
                  <option value="" disabled>
                    Select a type…
                  </option>
                  {propertyTypes.map((pt) => (
                    <option key={pt.id} value={pt.id}>
                      {pt.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label className={styles.fieldLabel}>Bedrooms</label>
                <input
                  type="number"
                  className={styles.fieldInput}
                  placeholder="e.g. 1"
                  value={beds}
                  onChange={(e) => setBeds(e.target.value)}
                  min={0}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.fieldLabel}>Bathrooms</label>
                <input
                  type="number"
                  className={styles.fieldInput}
                  placeholder="e.g. 1"
                  value={baths}
                  onChange={(e) => setBaths(e.target.value)}
                  min={0}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.fieldLabel}>Floor Area (sqm)</label>
                <input
                  type="number"
                  className={styles.fieldInput}
                  placeholder="e.g. 28"
                  value={sqm}
                  onChange={(e) => setSqm(e.target.value)}
                  min={0}
                />
              </div>
            </div>
          </div>

          {/* ── Location + Interactive Map ── */}
          <div className={styles.card}>
            <div className={styles.cardTitle}>Location</div>

            <div className={styles.mapSearchWrap} style={{ marginBottom: "14px" }}>
              <input
                type="text"
                className={styles.mapSearchInput}
                placeholder="e.g. Lahug, Cebu City"
                value={location}
                onChange={(e) => { setLocation(e.target.value); setMapError(null); }}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleMapSearch())}
                required
              />
              <button
                type="button"
                className={styles.mapSearchBtn}
                onClick={handleMapSearch}
                disabled={mapSearching || !location.trim()}
              >
                {mapSearching ? "Searching…" : <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><Search size={14} /> Find</span>}
              </button>
            </div>

            {mapError && (
              <p style={{ color: "#c0392b", fontSize: "13px", marginBottom: "10px", display: "flex", alignItems: "center", gap: "4px" }}>
                <AlertTriangle size={14} /> {mapError}
              </p>
            )}

            <div className={styles.mapFrame}>
              <MapContainer
                center={mapCoords ? [mapCoords.lat, mapCoords.lon] : [10.3157, 123.8854]}
                zoom={mapCoords ? 16 : 14}
                minZoom={12}
                maxBounds={[
                  [CEBU_CITY_BOUNDS.minLat, CEBU_CITY_BOUNDS.minLon],
                  [CEBU_CITY_BOUNDS.maxLat, CEBU_CITY_BOUNDS.maxLon],
                ]}
                maxBoundsViscosity={1.0}
                style={{ height: "100%", width: "100%", zIndex: 1 }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <ClickableMap
                  coords={mapCoords}
                  setCoords={setMapCoords}
                  onLocationSelect={handleMapClick}
                />
              </MapContainer>
            </div>

            {mapCoords && (
              <div className={styles.mapCoordsBadge}>
                <MapPin size={14} className={styles.mapCoordsIcon} />
                {mapCoords.lat.toFixed(5)}, {mapCoords.lon.toFixed(5)}
              </div>
            )}

            <p style={{ fontSize: "12px", color: "#6e7071", marginTop: "12px", display: "flex", alignItems: "center", gap: "4px" }}>
              <Lightbulb size={14} /> Click anywhere on the map to pinpoint your property's exact location.
            </p>
          </div>

          {/* ── Images ── */}
          <div className={styles.card}>
            <div className={styles.cardTitle}>Photos (up to 10)</div>

            <div className={styles.photoTip}>
              <Lightbulb size={20} className={styles.photoTipIcon} />
              <div>
                <div className={styles.photoTipTitle}>
                  Improve your chances of approval
                </div>
                <div className={styles.photoTipBody}>
                  Include clear photos of the actual property and supporting documents such as your <strong>business permit</strong> or <strong>barangay certificate</strong>.
                  <br />The <strong>first photo</strong> uploaded will be used as the listing thumbnail.
                </div>
              </div>
            </div>

            <div
              className={`${styles.imageUploadArea} ${dragOver ? styles.imageUploadAreaActive : ""}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                addFiles(e.dataTransfer.files);
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className={styles.imageUploadInput}
                onChange={(e) => addFiles(e.target.files)}
              />
              <Camera size={36} className={styles.imageUploadIcon} />
              <div className={styles.imageUploadTitle}>
                {imageFiles.length > 0
                  ? `${imageFiles.length} photo${imageFiles.length > 1 ? "s" : ""} selected`
                  : "Click or drag photos here"}
              </div>
              <div className={styles.imageUploadSub}>
                JPG, PNG, WEBP · Max 5MB each · Up to 10 photos
              </div>
            </div>

            {imagePreviews.length > 0 && (
              <div className={styles.imagePreviewGrid}>
                {imagePreviews.map((src, i) => (
                  <div key={i} className={styles.imagePreviewWrap}>
                    <img
                      src={src}
                      alt={`Preview ${i + 1}`}
                      className={styles.imagePreview}
                    />
                    <button
                      type="button"
                      className={styles.imagePreviewRemove}
                      onClick={(e) => {
                        e.stopPropagation();
                        removeImage(i);
                      }}
                      aria-label="Remove image"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Submit Row ── */}
          <div className={styles.submitRow}>
            {submitMsg && (
              <span className={`${styles.submitMsg} ${submitMsgClass}`}>
                {submitIcon} {submitMsg.text}
              </span>
            )}
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={() => navigate(-1)}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className={styles.submitSpinner} /> Listing…
                </>
              ) : (
                "List Property"
              )}
            </button>
          </div>
        </main>
      </form>
    </div>
  );
};

export default AddProperty;