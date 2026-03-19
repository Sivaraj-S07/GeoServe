import { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Navbar           from "./components/Navbar";
import Toast            from "./components/Toast";
import LoginPage        from "./pages/LoginPage";
import SignupPage       from "./pages/SignupPage";
import WorkerDashboard  from "./pages/WorkerDashboard";
import UserDashboard    from "./pages/UserDashboard";
import ProfilePage      from "./pages/ProfilePage";
import BookingPage      from "./pages/BookingPage";
import WorkerDetailPage from "./pages/WorkerDetailPage";
import WorkerVerificationPage from "./pages/WorkerVerificationPage";

function RoleGuard({ allowedRoles, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function HomeRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "worker") return <Navigate to="/worker" replace />;
  return <Navigate to="/home" replace />;
}

function AppInner() {
  const [toast, setToast] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const showToast = (msg, type = "success") => setToast({ msg, type });
  const toggleSidebar = () => setSidebarOpen(o => !o);
  const closeSidebar  = () => setSidebarOpen(false);

  return (
    <>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <Navbar onToast={showToast} onMenuToggle={toggleSidebar} />
      <Routes>
        <Route path="/"           element={<HomeRedirect />} />
        <Route path="/login"      element={<LoginPage  onToast={showToast} />} />
        <Route path="/signup"     element={<SignupPage onToast={showToast} />} />
        <Route path="/worker/:id" element={<WorkerDetailPage onToast={showToast} />} />

        <Route path="/verify-worker" element={
          <RoleGuard allowedRoles={["worker"]}>
            <WorkerVerificationPage onToast={showToast} />
          </RoleGuard>
        }/>

        <Route path="/worker" element={
          <RoleGuard allowedRoles={["worker"]}>
            <WorkerDashboard onToast={showToast} sidebarOpen={sidebarOpen} onCloseSidebar={closeSidebar} />
          </RoleGuard>
        }/>

        <Route path="/home" element={
          <RoleGuard allowedRoles={["user"]}>
            <UserDashboard onToast={showToast} sidebarOpen={sidebarOpen} onCloseSidebar={closeSidebar} />
          </RoleGuard>
        }/>

        <Route path="/profile" element={
          <RoleGuard allowedRoles={["worker", "user"]}>
            <ProfilePage onToast={showToast} />
          </RoleGuard>
        }/>

        <Route path="/book/:workerId" element={
          <RoleGuard allowedRoles={["user"]}>
            <BookingPage onToast={showToast} />
          </RoleGuard>
        }/>

        <Route path="*" element={<HomeRedirect />} />
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
