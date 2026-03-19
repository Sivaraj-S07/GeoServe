import { useEffect, useRef } from "react";

export default function MapView({ workers = [], userLocation = null, onWorkerClick, center, zoom = 11 }) {
  const divRef  = useRef(null);
  const mapRef  = useRef(null);
  const mkrsRef = useRef([]);
  const userMkRef = useRef(null);

  const defaultCenter = center
    || (userLocation ? [userLocation.lat, userLocation.lng] : null)
    || (workers[0] ? [workers[0].lat, workers[0].lng] : [40.7128, -74.006]);

  useEffect(() => {
    const init = () => {
      if (mapRef.current || !divRef.current) return;
      const L   = window.L;
      const map = L.map(divRef.current).setView(defaultCenter, zoom);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© <a href='https://openstreetmap.org'>OSM</a>",
      }).addTo(map);
      mapRef.current = map;
      plot(workers, userLocation);
    };

    if (window.L) { init(); return; }
    const s  = document.createElement("script");
    s.src    = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    s.onload = init;
    document.head.appendChild(s);

    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, []);

  useEffect(() => { if (mapRef.current) plot(workers, userLocation); }, [workers, userLocation]);

  function plot(ws, uLoc) {
    const L   = window.L;
    const map = mapRef.current;
    if (!L || !map) return;

    // Remove old markers
    mkrsRef.current.forEach(m => m.remove());
    mkrsRef.current = [];
    if (userMkRef.current) { userMkRef.current.remove(); userMkRef.current = null; }

    // User location marker (blue)
    if (uLoc) {
      userMkRef.current = L.marker([uLoc.lat, uLoc.lng], {
        icon: L.divIcon({
          className: "",
          html: `<div style="background:#2563eb;color:#fff;border-radius:50%;width:36px;height:36px;
            display:flex;align-items:center;justify-content:center;font-weight:800;font-size:11px;
            box-shadow:0 2px 10px rgba(37,99,235,.4);border:3px solid #fff;cursor:default;">You</div>`,
          iconSize: [36, 36], iconAnchor: [18, 18],
        }),
      }).addTo(map);
      userMkRef.current.bindPopup(`<div style="font-family:'Sora',sans-serif;padding:4px"><strong>Your Location</strong></div>`);
    }

    // Worker markers
    ws.forEach(w => {
      const color = w.availability === false ? "#94a3b8" : "#16a34a";
      const mk = L.marker([w.lat, w.lng], {
        icon: L.divIcon({
          className: "",
          html: `<div style="background:${color};color:#fff;border-radius:50%;
            width:38px;height:38px;display:flex;align-items:center;justify-content:center;
            font-weight:800;font-size:13px;box-shadow:0 2px 10px rgba(0,0,0,.25);border:2px solid #fff;cursor:pointer;">
            ${w.name[0]}
          </div>`,
          iconSize: [38, 38], iconAnchor: [19, 19],
        }),
      }).addTo(map);

      const dist = w.distance != null ? `<span style="color:#16a34a;font-size:11px">${w.distance} km away</span><br>` : "";
      const avail = w.availability
        ? `<span style="color:#16a34a;font-size:11px;font-weight:700">● Available</span>`
        : `<span style="color:#94a3b8;font-size:11px;font-weight:700">● Unavailable</span>`;

      mk.bindPopup(`
        <div style="font-family:'Sora',sans-serif;min-width:190px;padding:4px">
          <strong style="font-size:14px">${w.name}</strong><br>
          <span style="color:#64748b;font-size:12px">${w.specialization || ""}</span><br>
          ${dist}${avail}
          <br><br>
          <button onclick="window.__gsView(${w.id})"
            style="background:#16a34a;color:#fff;border:none;border-radius:7px;
            padding:7px 14px;font-size:12px;font-weight:600;cursor:pointer;width:100%;">
            View Details
          </button>
        </div>`);

      mk.on("click", () => onWorkerClick && onWorkerClick(w));
      mkrsRef.current.push(mk);
    });

    window.__gsView = (id) => {
      const w = ws.find(x => x.id === id);
      if (w && onWorkerClick) onWorkerClick(w);
    };
  }

  return <div ref={divRef} style={{ width:"100%", height:"100%", minHeight:300 }} />;
}
