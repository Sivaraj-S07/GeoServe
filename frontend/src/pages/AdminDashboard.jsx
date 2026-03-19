import { useState, useEffect } from "react";
import * as api from "../api";
import { StatsGrid } from "../components/StatsCards";
import WorkerModal from "../components/WorkerModal";
import { CategoryModal, ConfirmDialog } from "../components/CategoryModal";
import BookingCard from "../components/BookingCard";
import CommissionWallet from "../components/CommissionWallet";
import Icon from "../components/Icon";

const TABS = [
  { id: "overview",    label: "Overview",    icon: "trending-up"  },
  { id: "workers",     label: "Workers",     icon: "briefcase"    },
  { id: "users",       label: "Users",       icon: "users"        },
  { id: "categories",  label: "Categories",  icon: "layers"       },
  { id: "bookings",    label: "Bookings",    icon: "calendar"     },
  { id: "commission",  label: "Commission",  icon: "credit-card"  },
];

export default function AdminDashboard({ onToast, sidebarOpen, onCloseSidebar }) {
  const [tab,        setTab]        = useState("overview");
  const [workers,    setWorkers]    = useState([]);
  const [users,      setUsers]      = useState([]);
  const [categories, setCategories] = useState([]);
  const [bookings,   setBookings]   = useState([]);
  const [loading,    setLoading]    = useState(true);

  const [workerModal, setWM]      = useState(null);
  const [catModal,    setCM]      = useState(null);
  const [confirm,     setConfirm] = useState(null);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [w, u, c, b] = await Promise.all([
        api.getAllWorkers(), api.getUsers(), api.getCategories(), api.getBookings(),
      ]);
      setWorkers(w); setUsers(u); setCategories(c); setBookings(b);
    } catch { onToast("Failed to load data", "error"); }
    finally { setLoading(false); }
  };

  const getCatName = id => categories.find(c => c.id === id)?.name || "—";

  const handleSaveWorker = async (data) => {
    try {
      if (workerModal?.id) {
        const updated = await api.updateWorker(workerModal.id, data);
        setWorkers(p => p.map(w => w.id === updated.id ? updated : w));
        onToast("Worker updated");
      } else {
        const created = await api.createWorker(data);
        setWorkers(p => [...p, created]);
        onToast("Worker added");
      }
      setWM(null);
    } catch (e) { onToast(e.response?.data?.error || "Failed", "error"); }
  };

  const handleApprove = async (id) => {
    try {
      const w = await api.approveWorker(id);
      setWorkers(p => p.map(x => x.id === w.id ? w : x));
      onToast("Worker approved!");
    } catch { onToast("Failed to approve", "error"); }
  };

  const handleDeleteWorker = async () => {
    try {
      await api.deleteWorker(confirm.id);
      setWorkers(p => p.filter(w => w.id !== confirm.id));
      onToast("Worker deleted");
    } catch { onToast("Failed", "error"); }
    finally { setConfirm(null); }
  };

  const handleSaveCat = async (data) => {
    try {
      if (catModal?.id) {
        const u = await api.updateCategory(catModal.id, data);
        setCategories(p => p.map(c => c.id === u.id ? u : c));
        onToast("Category updated");
      } else {
        const c = await api.createCategory(data);
        setCategories(p => [...p, c]);
        onToast("Category added");
      }
      setCM(null);
    } catch (e) { onToast(e.response?.data?.error || "Failed", "error"); }
  };

  const handleDeleteCat = async () => {
    try {
      await api.deleteCategory(confirm.id);
      setCategories(p => p.filter(c => c.id !== confirm.id));
      onToast("Category deleted");
    } catch { onToast("Failed", "error"); }
    finally { setConfirm(null); }
  };

  const handleDeleteBooking = async (id) => {
    try {
      await api.deleteBooking(id);
      setBookings(p => p.filter(b => b.id !== id));
      onToast("Booking deleted");
    } catch { onToast("Failed", "error"); }
  };

  const handleDeleteUser = async () => {
    try {
      await api.deleteUser(confirm.id);
      setUsers(p => p.filter(u => u.id !== confirm.id));
      onToast("User deleted");
    } catch { onToast("Failed to delete", "error"); }
    finally { setConfirm(null); }
  };

  const pendingWorkers  = workers.filter(w => !w.approved);
  const pendingBookings   = bookings.filter(b => b.status === "pending");
  const confirmedBookings = bookings.filter(b => b.status === "confirmed");

  const totalRevenue      = bookings.reduce((acc, b) => acc + (b.cost || 0), 0);
  const totalCommission   = confirmedBookings.reduce((acc, b) => acc + (b.adminCommission || 0), 0);
  const fmtINR = n => "₹" + Number(n).toLocaleString("en-IN");

  const stats = [
    { icon: "users",       label: "Total Users",     value: users.length,           color: "blue"    },
    { icon: "briefcase",   label: "Total Workers",   value: workers.length,          color: "green"   },
    { icon: "layers",      label: "Categories",      value: categories.length,       color: "purple"  },
    { icon: "calendar",    label: "Total Bookings",  value: bookings.length,         color: "primary" },
    { icon: "credit-card", label: "Commission Earned", value: fmtINR(totalCommission), color: "green" },
    { icon: "clock",       label: "Pending Bookings",value: pendingBookings.length,  color: "amber"   },
  ];

  const ROLE_BADGE = { admin: "badge badge-purple", worker: "badge badge-blue", user: "badge badge-green" };

  return (
    <div className="dashboard-layout" style={{ display: "flex", minHeight: "calc(100vh - 64px)" }}>

      {/* Mobile overlay */}
      {sidebarOpen && <div className="mobile-overlay" onClick={onCloseSidebar} />}

      {/* Sidebar */}
      <aside className={`dashboard-sidebar${sidebarOpen ? " mobile-open" : ""}`} style={{
        width: 240, background: "var(--surface)",
        borderRight: "1px solid var(--border)",
        padding: "24px 14px", flexShrink: 0,
        display: "flex", flexDirection: "column",
      }}>
        {/* Admin branding */}
        <div style={{ padding: "4px 12px 18px", borderBottom: "1px solid var(--border)", marginBottom: 16 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 4,
            padding: "6px 12px",
            background: "linear-gradient(135deg, #f5f3ff, #ede9fe)",
            borderRadius: 10, border: "1px solid var(--purple-light)",
          }}>
            <Icon name="shield" size={14} color="var(--purple)" />
            <span style={{ fontSize: 12, fontWeight: 800, color: "var(--purple)", fontFamily: "'Outfit',sans-serif", letterSpacing: .3 }}>
              ADMIN PANEL
            </span>
          </div>
        </div>

        <div style={{ flex: 1 }}>
          {TABS.map(t => (
            <button key={t.id} className={`sidebar-tab purple${tab === t.id ? " active" : ""}`} onClick={() => { setTab(t.id); onCloseSidebar?.(); }}>
              <Icon name={t.icon} size={15} color={tab === t.id ? "var(--purple)" : "#6b7280"} />
              {t.label}
              {t.id === "workers" && pendingWorkers.length > 0 && (
                <span style={{ marginLeft: "auto", background: "var(--red)", color: "white", fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 20 }}>
                  {pendingWorkers.length}
                </span>
              )}
              {t.id === "bookings" && pendingBookings.length > 0 && (
                <span style={{ marginLeft: "auto", background: "var(--amber)", color: "white", fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 20 }}>
                  {pendingBookings.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Quick stats */}
        <div style={{
          marginTop: "auto", padding: "14px 12px",
          background: "var(--purple-bg)", borderRadius: 10,
          border: "1px solid var(--purple-light)",
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--purple)", fontFamily: "'Outfit',sans-serif", letterSpacing: .3, marginBottom: 8 }}>
            PLATFORM STATS
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[
              { label: "Users", value: users.length },
              { label: "Workers", value: workers.length },
            ].map(s => (
              <div key={s.label}>
                <div style={{ fontSize: 18, fontWeight: 800, fontFamily: "'Outfit',sans-serif", color: "var(--text)" }}>{s.value}</div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="anim-fade dashboard-main" style={{ flex: 1, padding: "28px 32px", overflowY: "auto", background: "var(--bg)" }}>

        {/* OVERVIEW */}
        {tab === "overview" && (
          <>
            {/* Banner */}
            <div style={{
              background: "linear-gradient(135deg, #4c1d95, #7c3aed, #8b5cf6)",
              borderRadius: 18, padding: "24px 28px", marginBottom: 28,
              position: "relative", overflow: "hidden",
              boxShadow: "0 8px 32px rgba(124,58,237,.3)",
            }}>
              <div style={{ position: "absolute", top: -30, right: -30, width: 140, height: 140, borderRadius: "50%", background: "rgba(255,255,255,.06)", pointerEvents: "none" }} />
              <div style={{ position: "relative" }}>
                <h2 style={{ color: "white", fontWeight: 800, fontSize: 22, marginBottom: 4, fontFamily: "'Outfit',sans-serif", letterSpacing: -.5 }}>
                  Dashboard Overview
                </h2>
                <p style={{ color: "rgba(255,255,255,.8)", fontSize: 14 }}>Platform statistics at a glance</p>
              </div>
            </div>

            <StatsGrid stats={stats} />

            {pendingWorkers.length > 0 && (
              <div style={{ marginBottom: 28 }}>
                <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 14, display: "flex", alignItems: "center", gap: 8, fontFamily: "'Outfit',sans-serif" }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--amber-soft)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--amber-light)" }}>
                    <Icon name="alert-circle" size={14} color="var(--amber)" />
                  </div>
                  Pending Approvals ({pendingWorkers.length})
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {pendingWorkers.slice(0, 5).map(w => {
                    const fb = `https://ui-avatars.com/api/?name=${encodeURIComponent(w.name)}&background=4f46e5&color=fff&size=38`;
                    return (
                      <div key={w.id} className="card" style={{ padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <img src={w.avatar || fb} onError={e => { e.target.src = fb; }}
                            style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--primary-border)" }} />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 14, fontFamily: "'Outfit',sans-serif" }}>{w.name}</div>
                            <div style={{ color: "var(--muted)", fontSize: 12 }}>{getCatName(w.categoryId)} · {w.specialization}</div>
                          </div>
                        </div>
                        <button className="btn-green" style={{ padding: "7px 16px", fontSize: 13 }} onClick={() => handleApprove(w.id)}>
                          <Icon name="check" size={13} color="white" /> Approve
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 14, fontFamily: "'Outfit',sans-serif" }}>Recent Bookings</h3>
              {bookings.slice(0, 5).map(b => (
                <BookingCard key={b.id} booking={b} role="admin" onStatusChange={() => {}} onDelete={handleDeleteBooking} />
              ))}
            </div>
          </>
        )}

        {/* WORKERS */}
        {tab === "workers" && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <h2 style={{ fontWeight: 800, fontSize: 22, letterSpacing: -.5 }}>Workers</h2>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4 }}>
                  <span style={{ color: "var(--muted)", fontSize: 13 }}>{workers.length} total</span>
                  {pendingWorkers.length > 0 && (
                    <span className="badge badge-amber">{pendingWorkers.length} pending</span>
                  )}
                </div>
              </div>
              <button className="btn-purple" onClick={() => setWM({})}>
                <Icon name="plus" size={15} /> Add Worker
              </button>
            </div>
            <div className="card" style={{ overflow: "hidden" }}>
              {loading ? (
                <div style={{ padding: 48, textAlign: "center", color: "var(--muted)" }}>
                  <div className="spinner dark" style={{ margin: "0 auto 12px" }} />
                  Loading workers…
                </div>
              ) : (
                <div className="table-responsive">
                <table className="gs-table">
                  <thead><tr>
                    <th>Worker</th><th>Category</th><th>Specialization</th><th>Phone</th>
                    <th>Availability</th><th>Status</th><th className="right">Actions</th>
                  </tr></thead>
                  <tbody>
                    {workers.map(w => {
                      const fb = `https://ui-avatars.com/api/?name=${encodeURIComponent(w.name)}&background=4f46e5&color=fff&size=38`;
                      return (
                        <tr key={w.id}>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <img src={w.avatar || fb} onError={e => { e.target.src = fb; }}
                                style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--primary-border)" }} />
                              <span style={{ fontWeight: 600, fontFamily: "'Outfit',sans-serif" }}>{w.name}</span>
                            </div>
                          </td>
                          <td style={{ color: "var(--muted)" }}>{getCatName(w.categoryId)}</td>
                          <td style={{ color: "var(--muted)" }}>{w.specialization}</td>
                          <td style={{ color: "var(--muted)" }}>{w.phone}</td>
                          <td>
                            <span className={`badge ${w.availability ? "badge-green" : "badge-gray"}`}>
                              {w.availability ? "Available" : "Busy"}
                            </span>
                          </td>
                          <td>
                            <span className={`badge ${w.approved ? "badge-green" : "badge-amber"}`}>
                              {w.approved ? "Approved" : "Pending"}
                            </span>
                          </td>
                          <td className="right">
                            <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                              {!w.approved && (
                                <button className="icon-btn success" title="Approve" onClick={() => handleApprove(w.id)}>
                                  <Icon name="check" size={15} color="var(--green)" />
                                </button>
                              )}
                              <button className="icon-btn" onClick={() => setWM(w)}>
                                <Icon name="edit" size={15} color="#6b7280" />
                              </button>
                              <button className="icon-btn danger" onClick={() => setConfirm({ id: w.id, name: w.name, type: "worker" })}>
                                <Icon name="trash" size={15} color="var(--red)" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* USERS */}
        {tab === "users" && (
          <>
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ fontWeight: 800, fontSize: 22, letterSpacing: -.5 }}>Users</h2>
              <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>{users.length} registered accounts</p>
            </div>
            <div className="card" style={{ overflow: "hidden" }}>
              <div className="table-responsive">
              <table className="gs-table">
                <thead><tr><th>User</th><th>Email</th><th>Role</th><th>Joined</th><th className="right">Actions</th></tr></thead>
                <tbody>
                  {users.map(u => {
                    const fb = `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=4f46e5&color=fff&size=38`;
                    return (
                      <tr key={u.id}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <img src={u.avatar || fb} onError={e => { e.target.src = fb; }}
                              style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--primary-border)" }} />
                            <span style={{ fontWeight: 600 }}>{u.name}</span>
                          </div>
                        </td>
                        <td style={{ color: "var(--muted)" }}>{u.email}</td>
                        <td><span className={ROLE_BADGE[u.role] || "badge badge-gray"}>{u.role}</span></td>
                        <td style={{ color: "var(--muted)", fontSize: 12 }}>
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
                        </td>
                        <td className="right">
                          {u.role !== "admin" && (
                            <button className="icon-btn danger" onClick={() => setConfirm({ id: u.id, name: u.name, type: "user" })}>
                              <Icon name="trash" size={15} color="var(--red)" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
            </div>
          </>
        )}

        {/* CATEGORIES */}
        {tab === "categories" && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <h2 style={{ fontWeight: 800, fontSize: 22, letterSpacing: -.5 }}>Categories</h2>
                <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>{categories.length} service categories</p>
              </div>
              <button className="btn-primary" onClick={() => setCM({})}>
                <Icon name="plus" size={15} /> Add Category
              </button>
            </div>
            <div className="card" style={{ overflow: "hidden" }}>
              <div className="table-responsive">
              <table className="gs-table">
                <thead><tr><th style={{ width: 60 }}>Icon</th><th>Name</th><th>Workers</th><th className="right">Actions</th></tr></thead>
                <tbody>
                  {categories.map(c => (
                    <tr key={c.id}>
                      <td>
                        <div style={{
                          background: "var(--primary-bg)", width: 40, height: 40, borderRadius: 10,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          border: "1px solid var(--primary-border)",
                        }}>
                          <Icon name={c.icon} size={17} color="var(--primary)" />
                        </div>
                      </td>
                      <td style={{ fontWeight: 600, fontFamily: "'Outfit',sans-serif" }}>{c.name}</td>
                      <td>
                        <span style={{ background: "var(--primary-bg)", padding: "3px 10px", borderRadius: 20, fontWeight: 600, fontSize: 13, color: "var(--primary)", border: "1px solid var(--primary-border)" }}>
                          {workers.filter(w => w.categoryId === c.id).length}
                        </span>
                      </td>
                      <td className="right">
                        <button className="icon-btn" onClick={() => setCM(c)}><Icon name="edit" size={15} color="#6b7280" /></button>
                        <button className="icon-btn danger" onClick={() => setConfirm({ id: c.id, name: c.name, type: "category" })}>
                          <Icon name="trash" size={15} color="var(--red)" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          </>
        )}

        {/* BOOKINGS */}
        {tab === "bookings" && (
          <>
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ fontWeight: 800, fontSize: 22, letterSpacing: -.5 }}>All Bookings</h2>
              <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>{bookings.length} total bookings</p>
            </div>
            {bookings.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 24px", background: "var(--surface)", borderRadius: 16, border: "1px solid var(--border)" }}>
                <Icon name="calendar" size={40} color="var(--muted-light)" />
                <p style={{ marginTop: 12, color: "var(--muted)", fontWeight: 600 }}>No bookings yet</p>
              </div>
            ) : (
              bookings.map(b => (
                <BookingCard key={b.id} booking={b} role="admin" onStatusChange={() => {}} onDelete={handleDeleteBooking} />
              ))
            )}
          </>
        )}

        {tab === "commission" && (
          <CommissionWallet onToast={onToast} />
        )}
      </main>

      {workerModal !== null && (
        <WorkerModal worker={workerModal?.id ? workerModal : null} categories={categories}
          onSave={handleSaveWorker} onClose={() => setWM(null)} />
      )}
      {catModal !== null && (
        <CategoryModal category={catModal?.id ? catModal : null} onSave={handleSaveCat} onClose={() => setCM(null)} />
      )}
      {confirm && (
        <ConfirmDialog
          message={`Are you sure you want to delete "${confirm.name}"? This cannot be undone.`}
          onConfirm={confirm.type === "worker" ? handleDeleteWorker : confirm.type === "user" ? handleDeleteUser : handleDeleteCat}
          onClose={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
