import { useNavigate } from "react-router-dom";
import Icon from "./Icon";

export default function WorkerCard({ worker, category, showBook = false }) {
  const nav = useNavigate();
  const fb  = `https://ui-avatars.com/api/?name=${encodeURIComponent(worker.name)}&background=4f46e5&color=fff&size=80`;

  return (
    <div
      className="card"
      onClick={() => nav(`/worker/${worker.id}`)}
      style={{
        padding: 0, overflow: "hidden", cursor: "pointer",
        transition: "transform .22s cubic-bezier(.16,1,.3,1), box-shadow .22s, border-color .22s",
        border: "1.5px solid var(--border)",
        borderRadius: 18,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = "translateY(-4px)";
        e.currentTarget.style.boxShadow = "0 14px 40px rgba(79,70,229,.15)";
        e.currentTarget.style.borderColor = "var(--primary-border)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "";
        e.currentTarget.style.borderColor = "var(--border)";
      }}
    >
      {/* Top gradient accent bar */}
      <div style={{ height: 5, background: "linear-gradient(90deg,#4f46e5,#7c3aed,#818cf8)" }} />

      <div style={{ padding: "18px 18px 16px" }}>
        {/* Avatar + name */}
        <div style={{ display: "flex", gap: 13, alignItems: "flex-start", marginBottom: 12 }}>
          <div style={{ position: "relative", flexShrink: 0 }}>
            <img
              src={worker.avatar || fb}
              onError={e => { e.target.src = fb; }}
              style={{
                width: 56, height: 56, borderRadius: 14, objectFit: "cover",
                border: "2.5px solid var(--primary-border)",
                boxShadow: "0 4px 12px rgba(79,70,229,.15)",
              }}
            />
            <div style={{
              position: "absolute", bottom: 2, right: 2,
              width: 12, height: 12, borderRadius: "50%",
              background: worker.availability ? "#22c55e" : "#94a3b8",
              border: "2.5px solid white",
              boxShadow: worker.availability ? "0 0 0 2px rgba(34,197,94,.3)" : "none",
            }} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontWeight: 800, fontSize: 15,
              color: "var(--text)", marginBottom: 4,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              letterSpacing: "-.3px",
            }}>
              {worker.name}
            </div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
              {category && (
                <span style={{
                  background: "#eff6ff", border: "1px solid #bfdbfe",
                  color: "#1d4ed8", fontSize: 10, fontWeight: 700,
                  padding: "2px 8px", borderRadius: 20,
                }}>
                  {category.name}
                </span>
              )}
              <span style={{
                background: worker.availability ? "#f0fdf4" : "#f1f5f9",
                border: `1px solid ${worker.availability ? "#bbf7d0" : "#e2e8f0"}`,
                color: worker.availability ? "#15803d" : "#94a3b8",
                fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20,
                display: "inline-flex", alignItems: "center", gap: 3,
              }}>
                <span style={{
                  width: 5, height: 5, borderRadius: "50%",
                  background: worker.availability ? "#22c55e" : "#94a3b8",
                  display: "inline-block",
                }} />
                {worker.availability ? "Available" : "Busy"}
              </span>
            </div>
          </div>
        </div>

        {/* Specialization */}
        {worker.specialization && (
          <div style={{
            fontSize: 12, color: "var(--muted)", marginBottom: 10,
            fontWeight: 600, display: "flex", alignItems: "center", gap: 5,
            background: "var(--bg)", borderRadius: 8, padding: "6px 10px",
            border: "1px solid var(--border)",
          }}>
            <Icon name="briefcase" size={12} color="var(--primary)" />
            <span style={{ color: "var(--text-secondary)" }}>{worker.specialization}</span>
          </div>
        )}

        {/* Stats row */}
        <div style={{ display: "flex", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
          {worker.rating > 0 && (
            <div style={{
              display: "flex", alignItems: "center", gap: 4,
              background: "#fffbeb", border: "1px solid #fde68a",
              borderRadius: 8, padding: "4px 8px",
            }}>
              <Icon name="star" size={12} color="#f59e0b" />
              <span style={{ fontWeight: 800, fontSize: 12, color: "#92400e" }}>{worker.rating}</span>
              {worker.jobsCompleted > 0 && (
                <span style={{ fontSize: 10, color: "#a16207" }}>({worker.jobsCompleted})</span>
              )}
            </div>
          )}
          {worker.yearsOfExp > 0 && (
            <div style={{
              display: "flex", alignItems: "center", gap: 4,
              background: "#f5f3ff", border: "1px solid #ddd6fe",
              borderRadius: 8, padding: "4px 8px",
            }}>
              <span style={{ fontSize: 11 }}>🏆</span>
              <span style={{ fontSize: 11, color: "#6d28d9", fontWeight: 700 }}>
                {worker.yearsOfExp}+ yrs
              </span>
            </div>
          )}
          {worker.distance != null && (
            <div style={{
              display: "flex", alignItems: "center", gap: 4,
              background: "#ecfdf5", border: "1px solid #a7f3d0",
              borderRadius: 8, padding: "4px 8px",
            }}>
              <Icon name="map-pin" size={11} color="#059669" />
              <span style={{ fontSize: 11, color: "#059669", fontWeight: 700 }}>{worker.distance} km</span>
            </div>
          )}
          {worker.pincode && (
            <div style={{
              display: "flex", alignItems: "center", gap: 4,
              background: "#eef2ff", border: "1px solid #c7d2fe",
              borderRadius: 8, padding: "4px 8px",
            }}>
              <span style={{ fontSize: 11 }}>📍</span>
              <span style={{ fontSize: 11, color: "#4f46e5", fontWeight: 700 }}>{worker.pincode}</span>
            </div>
          )}
        </div>

        {/* Rate + Action */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          paddingTop: 12, borderTop: "1px solid var(--border)",
        }}>
          <div>
            {worker.hourlyRate > 0 && (
              <div>
                <span style={{ fontSize: 16, fontWeight: 900, color: "var(--text)", letterSpacing: "-.5px" }}>
                  ₹{worker.hourlyRate.toLocaleString()}
                </span>
                <span style={{ fontSize: 11, fontWeight: 500, color: "var(--muted)" }}>/hr</span>
              </div>
            )}
          </div>
          {showBook ? (
            <button
              onClick={e => { e.stopPropagation(); nav(`/book/${worker.id}`); }}
              style={{
                background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                color: "white", border: "none", borderRadius: 10,
                padding: "8px 16px", fontSize: 12, fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit",
                boxShadow: "0 4px 14px rgba(79,70,229,.35)",
                transition: "all .18s cubic-bezier(.34,1.56,.64,1)",
                display: "flex", alignItems: "center", gap: 5,
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.04)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(79,70,229,.5)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 4px 14px rgba(79,70,229,.35)"; }}
            >
              <Icon name="calendar" size={12} color="white" /> Book Now
            </button>
          ) : (
            <button
              onClick={e => { e.stopPropagation(); nav(`/worker/${worker.id}`); }}
              style={{
                background: "var(--primary-bg)", border: "1.5px solid var(--primary-border)",
                color: "var(--primary)", borderRadius: 10,
                padding: "7px 14px", fontSize: 12, fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit",
                transition: "all .15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "var(--primary)"; e.currentTarget.style.color = "white"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "var(--primary-bg)"; e.currentTarget.style.color = "var(--primary)"; }}
            >
              View Profile →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
