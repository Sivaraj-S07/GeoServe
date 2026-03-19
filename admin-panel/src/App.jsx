import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAdmin } from "./context/AuthContext";
import LoginPage    from "./pages/LoginPage";
import Dashboard    from "./pages/Dashboard";
import UsersPage    from "./pages/UsersPage";
import WorkersPage  from "./pages/WorkersPage";
import BookingsPage from "./pages/BookingsPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import VerificationPage from "./pages/VerificationPage";
import HistoryPage  from "./pages/HistoryPage";
import ProfilePage  from "./pages/ProfilePage";
import Sidebar      from "./components/Sidebar";
import Toast        from "./components/Toast";
import { useState } from "react";

function Guard({ children }) {
  const { admin } = useAdmin();
  return admin ? children : <Navigate to="/login" replace />;
}

function Layout({ children }) {
  return (
    <div className="admin-layout">
      <Sidebar />
      <main className="admin-main anim-fade">{children}</main>
    </div>
  );
}

function AppInner() {
  const [toast, setToast] = useState(null);
  const { admin } = useAdmin();
  const showToast = (msg, type = "success") => setToast({ msg, type });

  return (
    <>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <Routes>
        <Route path="/login" element={<LoginPage onToast={showToast} />} />
        {/* ✅ FIX: Using admin?.id as key forces full remount after re-login, clearing all stale state */}
        <Route path="/"            element={<Guard><Layout><Dashboard         key={admin?.id + "-dash"} onToast={showToast} /></Layout></Guard>} />
        <Route path="/users"       element={<Guard><Layout><UsersPage         key={admin?.id + "-users"} onToast={showToast} /></Layout></Guard>} />
        <Route path="/workers"     element={<Guard><Layout><WorkersPage       key={admin?.id + "-workers"} onToast={showToast} /></Layout></Guard>} />
        <Route path="/bookings"    element={<Guard><Layout><BookingsPage      key={admin?.id + "-bookings"} onToast={showToast} /></Layout></Guard>} />
        <Route path="/analytics"   element={<Guard><Layout><AnalyticsPage    key={admin?.id + "-analytics"} onToast={showToast} /></Layout></Guard>} />
        <Route path="/verification" element={<Guard><Layout><VerificationPage key={admin?.id + "-verif"} onToast={showToast} /></Layout></Guard>} />
        <Route path="/history"      element={<Guard><Layout><HistoryPage       key={admin?.id + "-history"} onToast={showToast} /></Layout></Guard>} />
        <Route path="/profile"      element={<Guard><Layout><ProfilePage       key={admin?.id + "-profile"} onToast={showToast} /></Layout></Guard>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
