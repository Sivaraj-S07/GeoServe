import { lazy, Suspense, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Navbar  from "./components/Navbar";
import Toast   from "./components/Toast";
import { useNotifications } from "./hooks/useNotifications";

const LoginPage        = lazy(() => import("./pages/LoginPage"));
// SignupPage is handled by LoginPage (tab switch) — no separate route needed
const WorkerDashboard  = lazy(() => import("./pages/WorkerDashboard"));
const UserDashboard    = lazy(() => import("./pages/UserDashboard"));
const ProfilePage      = lazy(() => import("./pages/ProfilePage"));
const BookingPage      = lazy(() => import("./pages/BookingPage"));
const WorkerDetailPage = lazy(() => import("./pages/WorkerDetailPage"));
const WorkerVerificationPage = lazy(() => import("./pages/WorkerVerificationPage"));

function PageLoader() {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"60vh", flexDirection:"column", gap:14 }}>
      <div style={{ width:44, height:44, borderRadius:"50%", border:"3px solid var(--primary-bg)", borderTopColor:"var(--primary)", animation:"spin .7s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function RoleGuard({ allowedRoles, children }) {
  const { user, initialized } = useAuth();
  if (!initialized) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

// Prevents authenticated users from accessing login/signup pages via back button or direct URL
function GuestGuard({ children }) {
  const { user, initialized } = useAuth();
  if (!initialized) return <PageLoader />;
  if (user) {
    if (user.role === "worker") return <Navigate to="/worker" replace />;
    return <Navigate to="/home" replace />;
  }
  return children;
}

function HomeRedirect() {
  const { user, initialized } = useAuth();
  if (!initialized) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "worker") return <Navigate to="/worker" replace />;
  return <Navigate to="/home" replace />;
}

function AppInner() {
  const { user } = useAuth();
  const [toast, setToast]         = useState(null);
  const [sidebarOpen, setSidebar] = useState(false);
  const showToast    = (msg, type = "success") => setToast({ msg, type });
  const toggleSidebar = () => setSidebar(o => !o);
  const closeSidebar  = () => setSidebar(false);

  // Real-time notifications — active whenever a user is logged in
  const notifState = useNotifications(user);

  return (
    <>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <Navbar onToast={showToast} onMenuToggle={toggleSidebar} notifState={notifState} />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/"        element={<HomeRedirect />} />
          <Route path="/login"   element={<GuestGuard><LoginPage   onToast={showToast} /></GuestGuard>} />
          <Route path="/signup"  element={<GuestGuard><LoginPage   onToast={showToast} /></GuestGuard>} />
          <Route path="/worker/:id" element={<WorkerDetailPage onToast={showToast} />} />

          <Route path="/verify-worker" element={
            <RoleGuard allowedRoles={["worker"]}>
              <WorkerVerificationPage onToast={showToast} />
            </RoleGuard>
          }/>
          <Route path="/worker" element={
            <RoleGuard allowedRoles={["worker"]}>
              <WorkerDashboard onToast={showToast} sidebarOpen={sidebarOpen} onCloseSidebar={closeSidebar} notifState={notifState} />
            </RoleGuard>
          }/>
          <Route path="/home" element={
            <RoleGuard allowedRoles={["user"]}>
              <UserDashboard onToast={showToast} sidebarOpen={sidebarOpen} onCloseSidebar={closeSidebar} notifState={notifState} />
            </RoleGuard>
          }/>
          <Route path="/profile" element={
            <RoleGuard allowedRoles={["worker","user"]}>
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
      </Suspense>
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
