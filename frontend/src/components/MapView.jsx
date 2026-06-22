import { useTranslation } from "react-i18next";
import { useEffect, useRef, useState, useCallback } from "react";
import { getLocalizedName } from "../utils/localizedName";

const CARTO_TILE = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
const CARTO_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';
const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_JS  = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
const CLUSTER_JS  = "https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js";
const CLUSTER_CSS = "https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css";
const CLUSTER_DEF = "https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css";

/* ── Marker HTML generators ───────────────────────────────────────── */
function workerMarkerHTML(w, lang) {
  const displayName = getLocalizedName(w, lang) || w.name || "?";
  const avail = w.availability !== false;
  const bg    = avail ? "linear-gradient(135deg,#10b981,#059669)" : "linear-gradient(135deg,#94a3b8,#64748b)";
  const shadow = avail ? "0 4px 20px rgba(16,185,129,.55)" : "0 4px 14px rgba(0,0,0,.22)";
  const pulse = avail
    ? `<span style="position:absolute;inset:-5px;border-radius:50%;border:2.5px solid rgba(16,185,129,.4);animation:gs-pulse 2s ease-out infinite"></span>
       <span style="position:absolute;inset:-10px;border-radius:50%;border:1.5px solid rgba(16,185,129,.2);animation:gs-pulse 2s ease-out infinite .4s"></span>`
    : "";
  return `
    <div style="position:relative;width:50px;height:50px;">
      ${pulse}
      <div style="
        width:50px;height:50px;border-radius:50%;
        background:${bg};
        color:#fff;font-weight:800;font-size:16px;font-family:'Manrope',sans-serif;
        display:flex;align-items:center;justify-content:center;
        box-shadow:${shadow};
        border:3px solid #fff;cursor:pointer;
        position:relative;z-index:1;
        transition:transform .18s cubic-bezier(.34,1.56,.64,1);
      ">
        ${w.avatar
          ? `<img src="${w.avatar}" style="width:44px;height:44px;border-radius:50%;object-fit:cover;" onerror="this.style.display='none';this.nextSibling.style.display='flex'" /><span style="display:none;width:100%;height:100%;align-items:center;justify-content:center;font-size:16px;font-weight:800">${displayName[0].toUpperCase()}</span>`
          : displayName[0].toUpperCase()}
        ${avail ? `<span style="position:absolute;bottom:1px;right:1px;width:13px;height:13px;background:#10b981;border-radius:50%;border:2.5px solid #fff;box-shadow:0 0 0 2.5px rgba(16,185,129,.3);z-index:2"></span>` : ""}
      </div>
    </div>`;
}

function popupHTML(w, lang) {
  const displayName = getLocalizedName(w, lang) || w.name || "?";
  const avail = w.availability !== false;
  const dist  = w.distance != null
    ? `<div style="display:flex;align-items:center;gap:5px;margin-top:5px;font-size:12px;color:#64748b;background:#f8fafc;border-radius:7px;padding:4px 8px">
         <span>📍</span><span>${w.distance} km away</span>
       </div>`
    : "";
  const rate  = w.price_per_hour
    ? `<div style="font-size:15px;font-weight:800;color:#2563eb;margin-top:5px">₹${w.price_per_hour}<span style="font-size:11px;color:#94a3b8;font-weight:600">/hr</span></div>`
    : "";
  const rating = w.rating > 0
    ? `<span style="background:#fef3c7;color:#d97706;border:1px solid #fde68a;border-radius:99px;padding:3px 9px;font-size:11px;font-weight:700">⭐ ${w.rating.toFixed(1)}</span>`
    : "";
  const avatarEl = w.avatar
    ? `<img src="${w.avatar}" style="width:46px;height:46px;border-radius:50%;object-fit:cover;border:2.5px solid ${avail ? '#10b981' : '#94a3b8'};flex-shrink:0;" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=2563eb&color=fff&size=46'" />`
    : `<div style="width:46px;height:46px;border-radius:50%;background:${avail ? 'linear-gradient(135deg,#10b981,#059669)' : 'linear-gradient(135deg,#94a3b8,#64748b)'};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:18px;border:2.5px solid #fff;box-shadow:0 2px 10px rgba(0,0,0,.15);flex-shrink:0">${displayName[0].toUpperCase()}</div>`;
  return `
    <div style="font-family:'Manrope',sans-serif;min-width:230px;padding:2px 0">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
        ${avatarEl}
        <div>
          <div style="font-weight:800;font-size:15px;color:#1e293b">${displayName}</div>
          ${w.specialization ? `<div style="font-size:12px;color:#64748b;margin-top:2px">${w.specialization}</div>` : ""}
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:2px">
        <span style="background:${avail ? '#dcfce7' : '#f1f5f9'};color:${avail ? '#16a34a' : '#64748b'};border:1px solid ${avail ? '#bbf7d0' : '#e2e8f0'};border-radius:99px;padding:3px 10px;font-size:11px;font-weight:700">
          ${avail ? '● Available' : '● Unavailable'}
        </span>
        ${rating}
      </div>
      ${dist}${rate}
      <button onclick="window.__gsView(${w.id})"
        style="margin-top:12px;width:100%;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;border:none;border-radius:11px;padding:10px 14px;font-size:13px;font-weight:700;cursor:pointer;font-family:'Manrope',sans-serif;box-shadow:0 4px 14px rgba(37,99,235,.38);transition:opacity .15s"
        onmouseover="this.style.opacity='.88'"
        onmouseout="this.style.opacity='1'">
        View Profile & Book →
      </button>
    </div>`;
}

/* ── Haversine distance (km) ─────────────────────────────────────── */
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371, dLat = (lat2 - lat1) * Math.PI / 180, dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* ═══════════════════════════════════════════════════════════════════
   MapView — Production-ready Leaflet map component
   ═══════════════════════════════════════════════════════════════════ */
export default function MapView({
  workers = [],
  userLocation = null,
  onWorkerClick,
  center,
  zoom = 13,
  height,
  className = "",
}) {
  const { t, i18n } = useTranslation();
  const divRef       = useRef(null);
  const containerRef = useRef(null);
  const mapRef       = useRef(null);
  const clusterRef   = useRef(null);
  const userMkRef    = useRef(null);
  const tileRef      = useRef(null);
  const nearbyCircle = useRef(null);
  const locBtnRef    = useRef(null);  // DOM node for the Leaflet-hosted GPS button

  const [ready,        setReady]        = useState(false);
  const [count,        setCount]        = useState({ avail: 0, total: 0 });
  const [filter,       setFilter]       = useState("all");      // all | available
  const [fullscreen,   setFullscreen]   = useState(false);
  const [locating,     setLocating]     = useState(false);
  const [nearbyOnly,   setNearbyOnly]   = useState(false);
  const [locError,     setLocError]     = useState(null);
  const [liveUserLoc,  setLiveUserLoc]  = useState(userLocation);
  const [nearbyRadius, setNearbyRadius] = useState(5); // km

  const defaultCenter = center
    || (userLocation ? [userLocation.lat, userLocation.lng] : null)
    || (workers[0]   ? [workers[0].lat,   workers[0].lng]   : [13.0827, 80.2707]);

  /* ── Load CSS assets ──────────────────────────────────────────── */
  useEffect(() => {
    const addCss = (href) => new Promise((resolve) => {
      if (document.querySelector(`link[href="${href}"]`)) { resolve(); return; }
      const l = document.createElement("link");
      l.rel = "stylesheet"; l.href = href;
      l.onload = resolve; l.onerror = resolve; // resolve even on error to avoid blocking
      document.head.appendChild(l);
    });
    // Preload all CSS in parallel — they'll be done before JS scripts finish loading
    Promise.all([addCss(LEAFLET_CSS), addCss(CLUSTER_CSS), addCss(CLUSTER_DEF)]).catch(() => {});
  }, []);

  /* ── Init map ─────────────────────────────────────────────────── */
  useEffect(() => {
    const init = () => {
      if (mapRef.current || !divRef.current) return;
      const L = window.L;
      if (!L || !L.markerClusterGroup) return;

      const map = L.map(divRef.current, {
        zoomControl: false,
        attributionControl: true,
        zoomAnimation: true,
        fadeAnimation: true,
        markerZoomAnimation: true,
        touchZoom: true,
        tap: true,
        tapTolerance: 15,
        bounceAtZoomLimits: true,
      }).setView(defaultCenter, zoom);

      tileRef.current = L.tileLayer(CARTO_TILE, {
        attribution: CARTO_ATTR, maxZoom: 19, subdomains: "abcd",
      }).addTo(map);

      // Zoom control — bottom right
      L.control.zoom({ position: "bottomright" }).addTo(map);
      map.attributionControl.setPrefix("");

      // ── GPS / My-Location control — added BEFORE zoom so it sits above it ──
      const GpsCtrl = L.Control.extend({
        onAdd() {
          const btn = L.DomUtil.create("button", "gs-loc-ctrl-btn");
          btn.title = "Go to my location";
          btn.setAttribute("aria-label", "Go to my location");
          btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/></svg>`;
          L.DomEvent.on(btn, "click", (e) => {
            L.DomEvent.stopPropagation(e);
            // Trigger location via the ref callback
            if (window.__gsLocate) window.__gsLocate();
          });
          L.DomEvent.disableClickPropagation(btn);
          locBtnRef.current = btn;
          return btn;
        },
        onRemove() { locBtnRef.current = null; },
      });
      new GpsCtrl({ position: "bottomright" }).addTo(map);

      // Cluster group
      const cluster = L.markerClusterGroup({
        showCoverageOnHover: false,
        maxClusterRadius: 60,
        spiderfyOnMaxZoom: true,
        animateAddingMarkers: true,
        iconCreateFunction(c) {
          const n = c.getChildCount();
          const size = n > 20 ? 52 : n > 10 ? 46 : 40;
          return L.divIcon({
            html: `<div class="gs-cluster" style="width:${size}px;height:${size}px;font-size:${size > 46 ? 16 : 14}px">${n}</div>`,
            className: "", iconSize: [size, size], iconAnchor: [size/2, size/2],
          });
        },
      });
      map.addLayer(cluster);
      clusterRef.current = cluster;

      // Map event: fix size when container resizes
      const ro = new ResizeObserver(() => map.invalidateSize());
      ro.observe(divRef.current);

      mapRef.current = map;
      // Ensure Leaflet recalculates container size after first paint
      requestAnimationFrame(() => { map.invalidateSize(); });
      setReady(true);
    };

    const loadScript = (src, onload) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        if (window.L && src === LEAFLET_JS) onload();
        else { const t = setInterval(() => { if (window.L?.markerClusterGroup) { clearInterval(t); onload(); } }, 60); }
        return;
      }
      const s = document.createElement("script"); s.src = src; s.onload = onload;
      document.head.appendChild(s);
    };

    if (window.L?.markerClusterGroup) { init(); return; }
    if (window.L) {
      loadScript(CLUSTER_JS, init);
    } else {
      loadScript(LEAFLET_JS, () => loadScript(CLUSTER_JS, init));
    }

    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; clusterRef.current = null; }
    };
  }, []);

  /* ── Re-plot markers when data/filter changes ────────────────── */
  useEffect(() => {
    if (ready) plot(workers, liveUserLoc || userLocation);
  }, [ready, workers, liveUserLoc, userLocation, filter, nearbyOnly, nearbyRadius, i18n.language]);

  /* ── Sync liveUserLoc with prop ──────────────────────────────── */
  useEffect(() => {
    setLiveUserLoc(userLocation);
  }, [userLocation]);

  /* ── Get my location ─────────────────────────────────────────── */
  const handleMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocError(t("bookingPage.gpsNotSupported"));
      return;
    }
    setLocating(true); setLocError(null);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const loc = { lat: coords.latitude, lng: coords.longitude };
        setLiveUserLoc(loc);
        setLocating(false);
        const map = mapRef.current;
        if (map) map.flyTo([loc.lat, loc.lng], 14, { animate: true, duration: 1.2 });
      },
      (err) => {
        setLocating(false);
        const msgs = {
          1: "Location access denied. Please allow location permission in your browser settings.",
          2: "Location unavailable. Check your device GPS settings.",
          3: "Location request timed out. Please try again.",
        };
        setLocError(msgs[err.code] || "Unable to get your location.");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  }, []);

  /* ── Nearby Only ─────────────────────────────────────────────── */
  const handleNearbyOnly = useCallback(() => {
    const next = !nearbyOnly;
    setNearbyOnly(next);
    if (next) {
      handleMyLocation();
    } else {
      if (nearbyCircle.current && mapRef.current) {
        nearbyCircle.current.remove(); nearbyCircle.current = null;
      }
    }
  }, [nearbyOnly, handleMyLocation]);

  /* ── Keep window.__gsLocate pointing at current handleMyLocation ── */
  useEffect(() => {
    window.__gsLocate = handleMyLocation;
    return () => { if (window.__gsLocate === handleMyLocation) window.__gsLocate = null; };
  }, [handleMyLocation]);

  /* ── Mirror locating state onto the Leaflet GPS button ──────── */
  useEffect(() => {
    const btn = locBtnRef.current;
    if (!btn) return;
    if (locating) {
      btn.classList.add("locating");
      btn.disabled = true;
      btn.innerHTML = `<span class="gs-loc-spinner"></span>`;
    } else {
      btn.classList.remove("locating");
      btn.disabled = false;
      btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/></svg>`;
    }
  }, [locating]);

  /* ── Fullscreen: toggle a class on the wrapper div ──────────── */
  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.classList.toggle("gs-map-fullscreen", fullscreen);
    document.body.style.overflow = fullscreen ? "hidden" : "";
    setTimeout(() => mapRef.current?.invalidateSize(), 200);
    return () => { document.body.style.overflow = ""; };
  }, [fullscreen]);

  // ESC to exit fullscreen
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape" && fullscreen) setFullscreen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen]);



  /* ── Plot markers ────────────────────────────────────────────── */
  function plot(ws, uLoc) {
    const L = window.L; const map = mapRef.current; const cluster = clusterRef.current;
    if (!L || !map || !cluster) return;

    cluster.clearLayers();
    if (userMkRef.current) { userMkRef.current.remove(); userMkRef.current = null; }
    if (nearbyCircle.current) { nearbyCircle.current.remove(); nearbyCircle.current = null; }

    // User location marker
    if (uLoc) {
      const userIcon = L.divIcon({
        className: "",
        html: `<div style="position:relative;width:56px;height:56px">
          <div style="position:absolute;inset:0;border-radius:50%;border:3px solid rgba(37,99,235,.35);animation:gs-pulse 2s ease-out infinite"></div>
          <div style="position:absolute;inset:-8px;border-radius:50%;border:2px solid rgba(37,99,235,.15);animation:gs-pulse 2.5s ease-out infinite .5s"></div>
          <div style="position:absolute;inset:4px;border-radius:50%;background:linear-gradient(135deg,#2563eb,#7c3aed);display:flex;align-items:center;justify-content:center;border:3px solid #fff;box-shadow:0 5px 24px rgba(37,99,235,.55)">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/></svg>
          </div>
        </div>`,
        iconSize: [56, 56], iconAnchor: [28, 28],
      });
      userMkRef.current = L.marker([uLoc.lat, uLoc.lng], { icon: userIcon, zIndexOffset: 1000 }).addTo(map);
      userMkRef.current.bindPopup(`
        <div style="font-family:'Manrope',sans-serif;padding:2px 0">
          <div style="font-weight:800;font-size:14px;color:#1e293b">📍 Your Location</div>
          <div style="font-size:12px;color:#64748b;margin-top:3px">Finding workers near you</div>
          <div style="font-size:11px;color:#94a3b8;margin-top:2px">${uLoc.lat.toFixed(4)}, ${uLoc.lng.toFixed(4)}</div>
        </div>`, { maxWidth: 210 });

      // Nearby circle
      if (nearbyOnly) {
        nearbyCircle.current = L.circle([uLoc.lat, uLoc.lng], {
          radius: nearbyRadius * 1000,
          color: "#2563eb", weight: 2, opacity: 0.5,
          fillColor: "#3b82f6", fillOpacity: 0.08,
          dashArray: "6 4",
        }).addTo(map);
        map.flyTo([uLoc.lat, uLoc.lng], 13, { animate: true, duration: 1.0 });
      }
    }

    // Filter workers
    let visibleWs = filter === "available" ? ws.filter(w => w.availability !== false) : ws;
    if (nearbyOnly && uLoc) {
      visibleWs = visibleWs.filter(w => haversine(uLoc.lat, uLoc.lng, w.lat, w.lng) <= nearbyRadius);
    }

    let availCount = 0;
    const markers = visibleWs.map(w => {
      if (w.availability !== false) availCount++;
      const icon = L.divIcon({
        className: "",
        html: `<div style="position:relative">${workerMarkerHTML(w, i18n.language)}</div>`,
        iconSize: [50, 50], iconAnchor: [25, 25],
      });
      const mk = L.marker([w.lat, w.lng], { icon });
      mk.bindPopup(popupHTML(w, i18n.language), { maxWidth: 270, className: "gs-popup", offset: [0, -12] });
      mk.on("click", () => onWorkerClick && onWorkerClick(w));
      return mk;
    });

    cluster.addLayers(markers);
    setCount({ avail: availCount, total: ws.length });

    window.__gsView = (id) => {
      const w = ws.find(x => x.id === id);
      if (w && onWorkerClick) onWorkerClick(w);
    };

    // Auto-fit
    if (markers.length > 0) {
      setTimeout(() => {
        const all = [...markers];
        if (userMkRef.current) all.push(userMkRef.current);
        const g = L.featureGroup(all);
        map.fitBounds(g.getBounds().pad(0.18), { maxZoom: 14, animate: true, duration: 0.8 });
      }, 100);
    } else if (uLoc) {
      map.flyTo([uLoc.lat, uLoc.lng], 13, { animate: true });
    }
  }

  /* ── Render ───────────────────────────────────────────────────── */
  const containerStyle = {
    position: "relative",
    width: "100%",
    height: height || "100%",
  };

  return (
    <div ref={containerRef} className={`gs-map-wrapper ${className}`} style={containerStyle}>
      {/* Map canvas */}
      <div ref={divRef} style={{ width: "100%", height: "100%", minHeight: 400, display: "block" }} />

      {/* ── Location error toast ── */}
      {locError && (
        <div className="gs-map-error-toast">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <span>{locError}</span>
          <button onClick={() => setLocError(null)} aria-label="Dismiss">✕</button>
        </div>
      )}

      {ready && (
        <>
          {/* ── Top-left: badges + filter ── */}
          <div className="gs-map-top-left">
            {/* Worker count badge */}
            <div className="gs-map-badge">
              <span className="gs-map-badge-dot" />
              {count.avail} available · {count.total} total
            </div>

            {/* Available filter */}
            <button
              onClick={() => setFilter(f => f === "all" ? "available" : "all")}
              className={`gs-map-chip ${filter === "available" ? "active" : ""}`}
            >
              {filter === "available" ? "✓ Available" : "All Workers"}
            </button>

            {/* Nearby only toggle */}
            <button
              onClick={handleNearbyOnly}
              className={`gs-map-chip ${nearbyOnly ? "nearby-active" : ""}`}
              title={`Show workers within ${nearbyRadius} km`}
            >
              {nearbyOnly
                ? `📍 ≤${nearbyRadius} km`
                : "Nearby Only"}
            </button>

            {/* Radius stepper — shown only when nearby is active */}
            {nearbyOnly && (
              <div className="gs-map-radius-ctrl">
                <button onClick={() => setNearbyRadius(r => Math.max(1, r - 1))}>−</button>
                <span>{nearbyRadius} km</span>
                <button onClick={() => setNearbyRadius(r => Math.min(50, r + 1))}>+</button>
              </div>
            )}
          </div>

          {/* ── Top-right: fullscreen only ── */}
          <div className="gs-map-top-right">
            {/* Fullscreen */}
            <button
              onClick={() => setFullscreen(f => !f)}
              className="gs-map-action-btn"
              title={fullscreen ? "Exit Fullscreen (Esc)" : "Fullscreen Map"}
            >
              {fullscreen
                ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>
                : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>}
            </button>
          </div>

          {/* ── Fullscreen close hint ── */}
          {fullscreen && (
            <div className="gs-map-fullscreen-hint">
              Press <kbd>Esc</kbd> to exit fullscreen
            </div>
          )}

          {/* ── Legend ── */}
          <div className="gs-map-legend">
            {[
              { bg: "linear-gradient(135deg,#10b981,#059669)", label: "Available" },
              { bg: "linear-gradient(135deg,#94a3b8,#64748b)", label: "Unavailable" },
              { bg: "linear-gradient(135deg,#2563eb,#7c3aed)", label: "You" },
            ].map(({ bg, label }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <div style={{ width: 12, height: 12, borderRadius: "50%", background: bg, border: "2px solid #fff", boxShadow: "0 1px 4px rgba(0,0,0,.15)", flexShrink: 0 }} />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Loading overlay ── */}
      {!ready && (
        <div className="gs-map-loading">
          <div className="gs-map-loading-inner">
            <div className="gs-map-loading-ring" />
            <p>Loading map…</p>
          </div>
        </div>
      )}

      <style>{`
        /* ── Keyframes ── */
        @keyframes gs-pulse {
          0%   { transform:scale(1); opacity:.9; }
          70%  { transform:scale(1.9); opacity:0; }
          100% { transform:scale(1); opacity:0; }
        }
        @keyframes gs-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes gs-fade-in {
          from { opacity:0; transform:translateY(-6px); }
          to   { opacity:1; transform:translateY(0); }
        }

        /* ── Wrapper & fullscreen ── */
        .gs-map-wrapper { position:relative; width:100%; height:100%; }
        .gs-map-fullscreen {
          position:fixed !important;
          inset:0 !important;
          z-index:99999 !important;
          border-radius:0 !important;
          height:100dvh !important;
          width:100vw !important;
        }

        /* ── Cluster icon ── */
        .gs-cluster {
          background: linear-gradient(135deg,#2563eb,#7c3aed);
          color:#fff; font-weight:800; font-family:'Manrope',sans-serif;
          border-radius:50%; display:flex; align-items:center; justify-content:center;
          border:3px solid #fff;
          box-shadow:0 4px 18px rgba(37,99,235,.45);
          transition:transform .18s cubic-bezier(.34,1.56,.64,1);
        }
        .gs-cluster:hover { transform:scale(1.12); }

        /* ── Popup ── */
        .gs-popup .leaflet-popup-content-wrapper {
          border-radius:18px !important;
          box-shadow:0 12px 44px rgba(0,0,0,.18) !important;
          border:1px solid rgba(226,232,240,.8) !important;
          padding:0 !important;
        }
        .gs-popup .leaflet-popup-content { margin:16px 18px !important; }
        .gs-popup .leaflet-popup-tip { background:#fff !important; }

        /* ── Zoom control — bottom right ── */
        .leaflet-control-zoom {
          border-radius:14px !important; border:none !important;
          box-shadow:0 3px 16px rgba(0,0,0,.15) !important; overflow:hidden;
          margin:0 !important;
        }
        .leaflet-control-zoom-in, .leaflet-control-zoom-out {
          width:44px !important; height:44px !important;
          line-height:44px !important; font-size:20px !important;
          font-weight:700 !important; color:#1e293b !important;
          background:rgba(255,255,255,.97) !important; border:none !important;
          transition:background .15s, color .15s !important;
        }
        .leaflet-control-zoom-in:hover, .leaflet-control-zoom-out:hover {
          background:#eff6ff !important; color:#2563eb !important;
        }

        /* ── GPS Location button — Leaflet control, sits above zoom ── */
        .gs-loc-ctrl-btn {
          width:44px; height:44px;
          background:linear-gradient(135deg,#2563eb,#7c3aed);
          color:#fff; border:none; border-radius:14px;
          box-shadow:0 4px 18px rgba(37,99,235,.45);
          cursor:pointer;
          display:flex; align-items:center; justify-content:center;
          transition:transform .18s cubic-bezier(.34,1.56,.64,1), box-shadow .18s, opacity .15s;
          margin:0 !important;
        }
        .gs-loc-ctrl-btn:hover {
          transform:scale(1.08);
          box-shadow:0 6px 24px rgba(37,99,235,.55);
        }
        .gs-loc-ctrl-btn:active { transform:scale(.94); }
        .gs-loc-ctrl-btn:disabled { opacity:.65; cursor:not-allowed; transform:none; }
        .gs-loc-ctrl-btn svg { display:block; }

        /* ── Bottom-right control column: GPS → zoom stack ── */
        .leaflet-container { position:relative !important; }
        .leaflet-control-container {
          position:absolute !important; inset:0 !important; pointer-events:none;
        }
        .leaflet-control-container > div { pointer-events:auto; }
        .leaflet-control-container .leaflet-bottom.leaflet-right {
          display:flex; flex-direction:column; align-items:flex-end;
          gap:10px; padding-bottom:20px; padding-right:14px;
          position:absolute !important; bottom:0 !important; right:0 !important;
          left:auto !important; top:auto !important; width:auto !important;
        }

        /* ── Spinner inside GPS button ── */
        .gs-loc-spinner {
          width:20px; height:20px; border-radius:50%;
          border:2.5px solid rgba(255,255,255,.35);
          border-top-color:#fff;
          animation:gs-spin .75s linear infinite;
          display:block;
        }
        .leaflet-attribution-flag { display:none !important; }
        .leaflet-control-attribution {
          font-size:10px !important; background:rgba(255,255,255,.8) !important;
          border-radius:8px !important; padding:3px 8px !important;
        }

        /* ── Overlay controls ── */
        .gs-map-top-left {
          position:absolute; top:14px; left:14px; z-index:1000;
          display:flex; gap:8px; flex-wrap:wrap; align-items:center;
          animation:gs-fade-in .25s ease;
        }
        .gs-map-top-right {
          position:absolute; top:14px; right:14px; z-index:1000;
          display:flex; gap:7px;
          animation:gs-fade-in .25s ease;
        }

        /* ── Badge ── */
        .gs-map-badge {
          background:rgba(255,255,255,.96); backdrop-filter:blur(12px);
          border-radius:99px; padding:7px 13px;
          font-size:12px; font-weight:700; font-family:'Manrope',sans-serif;
          color:#1e293b; box-shadow:0 3px 16px rgba(0,0,0,.14);
          display:flex; align-items:center; gap:7px;
          border:1px solid rgba(255,255,255,.8);
          white-space:nowrap;
        }
        .gs-map-badge-dot {
          width:8px; height:8px; border-radius:50%;
          background:#10b981; flex-shrink:0;
          box-shadow:0 0 0 2.5px rgba(16,185,129,.25);
        }

        /* ── Chips ── */
        .gs-map-chip {
          background:rgba(255,255,255,.96); backdrop-filter:blur(12px);
          border-radius:99px; padding:7px 13px;
          font-size:12px; font-weight:700; font-family:'Manrope',sans-serif;
          color:#374151; border:1px solid rgba(255,255,255,.8);
          box-shadow:0 3px 16px rgba(0,0,0,.14); cursor:pointer;
          display:flex; align-items:center; gap:6px;
          transition:all .18s; white-space:nowrap;
        }
        .gs-map-chip:hover { background:#eff6ff; color:#2563eb; border-color:#bfdbfe; }
        .gs-map-chip.active {
          background:rgba(16,185,129,.92); color:#fff;
          border-color:rgba(16,185,129,.6);
        }
        .gs-map-chip.nearby-active {
          background:rgba(37,99,235,.9); color:#fff;
          border-color:rgba(37,99,235,.6);
        }

        /* ── Radius stepper ── */
        .gs-map-radius-ctrl {
          background:rgba(255,255,255,.96); backdrop-filter:blur(12px);
          border-radius:99px; padding:4px 5px;
          display:flex; align-items:center; gap:6px;
          box-shadow:0 3px 16px rgba(0,0,0,.14);
          border:1px solid rgba(255,255,255,.8);
          font-family:'Manrope',sans-serif;
        }
        .gs-map-radius-ctrl button {
          width:28px; height:28px; border-radius:50%;
          background:rgba(37,99,235,.1); border:none;
          color:#2563eb; font-weight:800; font-size:16px;
          cursor:pointer; display:flex; align-items:center; justify-content:center;
          transition:background .15s;
        }
        .gs-map-radius-ctrl button:hover { background:rgba(37,99,235,.22); }
        .gs-map-radius-ctrl span {
          font-size:12px; font-weight:700; color:#1e293b; white-space:nowrap; min-width:36px; text-align:center;
        }

        /* ── Action buttons (top-right) ── */
        .gs-map-action-btn {
          width:38px; height:38px;
          background:rgba(255,255,255,.96); backdrop-filter:blur(12px);
          border:1px solid rgba(255,255,255,.8); border-radius:12px;
          box-shadow:0 3px 16px rgba(0,0,0,.14);
          cursor:pointer; color:#374151;
          display:flex; align-items:center; justify-content:center;
          transition:all .18s;
        }
        .gs-map-action-btn:hover { background:#eff6ff; color:#2563eb; border-color:#bfdbfe; }

        /* ── Legend ── */
        .gs-map-legend {
          position:absolute; bottom:54px; left:14px; z-index:1000;
          background:rgba(255,255,255,.96); backdrop-filter:blur(12px);
          border-radius:12px; padding:10px 14px;
          font-size:11px; font-family:'Manrope',sans-serif;
          box-shadow:0 3px 16px rgba(0,0,0,.13);
          border:1px solid rgba(255,255,255,.8);
          display:flex; flex-direction:column; gap:6px;
          color:#374151; font-weight:600;
        }

        /* ── Loading overlay ── */
        .gs-map-loading {
          position:absolute; inset:0; z-index:2000;
          background:rgba(248,250,252,.92); backdrop-filter:blur(8px);
          display:flex; align-items:center; justify-content:center;
          border-radius:inherit;
        }
        .gs-map-loading-inner {
          display:flex; flex-direction:column; align-items:center; gap:14px;
          font-family:'Manrope',sans-serif; font-size:13px; color:#64748b; font-weight:600;
        }
        .gs-map-loading-ring {
          width:40px; height:40px; border-radius:50%;
          border:3.5px solid #e2e8f0; border-top-color:#2563eb;
          animation:gs-spin 1s linear infinite;
        }

        /* ── Error toast ── */
        .gs-map-error-toast {
          position:absolute; top:14px; left:50%; transform:translateX(-50%);
          z-index:2000; background:#fff; border:1.5px solid #fca5a5;
          border-radius:12px; padding:10px 14px;
          display:flex; align-items:center; gap:10px;
          font-family:'Manrope',sans-serif; font-size:13px; font-weight:600; color:#b91c1c;
          box-shadow:0 6px 24px rgba(185,28,28,.16);
          animation:gs-fade-in .25s ease; max-width:320px; white-space:normal;
        }
        .gs-map-error-toast button {
          background:none; border:none; color:#b91c1c; cursor:pointer;
          font-size:16px; line-height:1; margin-left:6px; flex-shrink:0;
          padding:0 4px;
        }

        /* ── Fullscreen hint ── */
        .gs-map-fullscreen-hint {
          position:absolute; bottom:16px; left:50%; transform:translateX(-50%);
          z-index:1000; background:rgba(15,23,42,.75); backdrop-filter:blur(10px);
          color:#fff; border-radius:99px; padding:7px 16px;
          font-size:12px; font-family:'Manrope',sans-serif; font-weight:600;
          white-space:nowrap; box-shadow:0 4px 16px rgba(0,0,0,.2);
          animation:gs-fade-in .25s ease;
        }
        .gs-map-fullscreen-hint kbd {
          background:rgba(255,255,255,.2); border-radius:5px;
          padding:1px 7px; font-size:11px; font-family:'JetBrains Mono',monospace;
          margin:0 3px;
        }

        /* ── Responsive ── */
        @media (max-width:480px) {
          .gs-map-badge { font-size:11px; padding:6px 10px; }
          .gs-map-chip  { font-size:11px; padding:6px 10px; }
          .gs-map-top-left { top:10px; left:10px; gap:6px; }
          .gs-map-top-right { top:10px; right:10px; gap:6px; }
          .gs-map-action-btn { width:34px; height:34px; border-radius:10px; }
          .gs-loc-ctrl-btn { width:40px; height:40px; border-radius:12px; }
          .leaflet-control-zoom-in, .leaflet-control-zoom-out { width:40px !important; height:40px !important; line-height:40px !important; }
          .leaflet-control-container .leaflet-bottom.leaflet-right { gap:8px; padding-bottom:16px; padding-right:10px; }
          .gs-map-legend { bottom:50px; left:10px; font-size:10.5px; padding:8px 11px; }
        }
      `}</style>
    </div>
  );
}
