/**
 * PincodeSelector.jsx
 * 
 * Reusable pincode + street selector component.
 * Allows users/workers to enter their pincode and select a street/area within it.
 * Displays full location details on selection.
 * The lat/lng system is completely separate and untouched.
 */

import { useState, useCallback } from "react";
import * as api from "../api";
import Icon from "./Icon";

export default function PincodeSelector({
  pincode,
  street,
  onPincodeChange,
  onStreetChange,
  labelColor = "var(--text)",
  accentColor = "#059669",
  accentLight = "#ecfdf5",
  accentBorder = "#a7f3d0",
}) {
  const [pincodeInput, setPincodeInput]     = useState(pincode || "");
  const [offices, setOffices]               = useState([]);
  const [locationInfo, setLocationInfo]     = useState(null);
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState("");
  const [showDetails, setShowDetails]       = useState(false);
  const [selectedOffice, setSelectedOffice] = useState(
    street ? { officename: street } : null
  );

  const handleLookup = useCallback(async () => {
    const val = pincodeInput.trim();
    if (!/^\d{6}$/.test(val)) {
      setError("Please enter a valid 6-digit Indian pincode");
      return;
    }
    if (val[0] === "0") {
      setError("Invalid pincode: Indian pincodes never start with 0");
      return;
    }
    setLoading(true);
    setError("");
    setOffices([]);
    setLocationInfo(null);
    setSelectedOffice(null);
    try {
      const data = await api.lookupPincode(val);
      // data.valid === false means pincode doesn't exist in India
      if (data.valid === false) {
        setError(data.error || "Invalid or non-Indian pincode. Please enter a valid Indian pincode.");
        return;
      }
      setOffices(data.offices || []);
      setLocationInfo(data);
      onPincodeChange(val);
      if (data.offices?.length > 0) {
        // Auto-select first office
        setSelectedOffice(data.offices[0]);
        onStreetChange(data.offices[0].officename);
      }
    } catch (e) {
      const errData = e.response?.data;
      if (errData?.retryable) {
        setError("Pincode lookup service is temporarily unavailable. Please try again in a moment.");
      } else if (e.response?.status === 404) {
        setError(errData?.error || "Invalid or non-Indian pincode. Please enter a valid Indian pincode.");
      } else if (e.response?.status === 400) {
        setError(errData?.error || "Please enter a valid 6-digit Indian pincode.");
      } else {
        setError("Pincode lookup failed. Please check your connection and try again.");
      }
    } finally {
      setLoading(false);
    }
  }, [pincodeInput, onPincodeChange, onStreetChange]);

  const handleSelectOffice = (office) => {
    setSelectedOffice(office);
    onStreetChange(office.officename);
    setShowDetails(true);
  };

  const handlePincodeKeyDown = (e) => {
    if (e.key === "Enter") handleLookup();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Pincode Input Row */}
      <div>
        <label style={{ color: labelColor }}>Pincode *</label>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={pincodeInput}
            onChange={e => {
              setPincodeInput(e.target.value.replace(/\D/g, "").slice(0, 6));
              setError("");
            }}
            onKeyDown={handlePincodeKeyDown}
            placeholder="Enter 6-digit pincode"
            maxLength={6}
            style={{ flex: 1 }}
          />
          <button
            type="button"
            onClick={handleLookup}
            disabled={loading || pincodeInput.length !== 6}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "0 16px",
              background: accentColor,
              color: "white",
              border: "none",
              borderRadius: 8,
              cursor: loading || pincodeInput.length !== 6 ? "not-allowed" : "pointer",
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "inherit",
              opacity: loading || pincodeInput.length !== 6 ? 0.6 : 1,
              whiteSpace: "nowrap",
              minWidth: 90,
              justifyContent: "center",
            }}
          >
            {loading ? (
              <><div style={{ width: 14, height: 14, border: "2px solid var(--surface)", borderTop: "2px solid transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} /> Checking…</>
            ) : (
              <><Icon name="search" size={13} color="white" /> Find Area</>
            )}
          </button>
        </div>
        {error && (
          <p style={{ color: "var(--red)", fontSize: 12, marginTop: 4, display: "flex", alignItems: "center", gap: 5 }}>
            <Icon name="alert-circle" size={12} color="var(--red)" /> {error}
          </p>
        )}
      </div>

      {/* Location Info Banner */}
      {locationInfo && (
        <div style={{
          background: accentLight,
          border: `1px solid ${accentBorder}`,
          borderRadius: 10,
          padding: "10px 14px",
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <Icon name="map-pin" size={16} color={accentColor} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: accentColor }}>
              {locationInfo.district}, {locationInfo.state}
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 1 }}>
              Pincode {locationInfo.pincode} · {locationInfo.offices?.length} area(s) found
            </div>
          </div>
        </div>
      )}

      {/* Street / Area Selector */}
      {offices.length > 0 && (
        <div>
          <label style={{ color: labelColor }}>Street / Area *</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 200, overflowY: "auto" }}>
            {offices.map((office, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSelectOffice(office)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 14px",
                  background: selectedOffice?.officename === office.officename ? accentLight : "white",
                  border: `1.5px solid ${selectedOffice?.officename === office.officename ? accentColor : "var(--border)"}`,
                  borderRadius: 8,
                  cursor: "pointer",
                  textAlign: "left",
                  fontFamily: "inherit",
                  transition: "all .15s",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Icon name="map-pin" size={13} color={selectedOffice?.officename === office.officename ? accentColor : "var(--muted)"} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{office.officename}</div>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>{office.taluk} · {office.districtName}</div>
                  </div>
                </div>
                {selectedOffice?.officename === office.officename && (
                  <Icon name="check-circle" size={15} color={accentColor} />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Selected Location Full Details */}
      {selectedOffice && showDetails && locationInfo && (
        <div style={{
          background: "var(--bg-subtle, #f9fafb)",
          border: "1px solid var(--border)",
          borderRadius: 10,
          padding: "12px 14px",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", letterSpacing: ".05em", textTransform: "uppercase" }}>
              Selected Location Details
            </span>
            <button
              type="button"
              onClick={() => setShowDetails(false)}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}
            >
              <Icon name="x" size={14} color="var(--muted)" />
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 12px" }}>
            {[
              ["Area / Office", selectedOffice.officename],
              ["Taluk", selectedOffice.taluk],
              ["District", selectedOffice.districtName],
              ["State", selectedOffice.stateName],
              ["Pincode", selectedOffice.pincode],
            ].map(([label, value]) => (
              <div key={label}>
                <div style={{ fontSize: 10, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em" }}>{label}</div>
                <div style={{ fontSize: 13, color: "var(--text)", fontWeight: 500, marginTop: 1 }}>{value || "—"}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Show Details toggle if hidden */}
      {selectedOffice && !showDetails && (
        <button
          type="button"
          onClick={() => setShowDetails(true)}
          style={{
            background: "none", border: `1px solid ${accentBorder}`,
            borderRadius: 8, padding: "7px 12px",
            color: accentColor, fontSize: 12, fontWeight: 600,
            cursor: "pointer", fontFamily: "inherit",
            display: "flex", alignItems: "center", gap: 6,
          }}
        >
          <Icon name="info" size={12} color={accentColor} />
          View location details for "{selectedOffice.officename}"
        </button>
      )}
    </div>
  );
}
