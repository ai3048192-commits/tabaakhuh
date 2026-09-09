import { useState } from "react";
import Header from "./components/Header";
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import NotificationModal from "./components/NotificationModal";
import AddUserModal from "./components/AddUserModal";
import AddCookModal from "./components/AddCookModal";
import AddDriverModal from "./components/AddDriverModal";
import UsersPage from "./users/UsersPage";
import OrdersPage from "./orders/OrdersPage";
import WithdrawalsPage from "./withdrawals/WithdrawalsPage";
import CookApplicationsPage from "./cooks/CookApplicationsPage";
import DriverApplicationsPage from "./drivers/DriverApplicationsPage";
import CitiesPage from "./cities/CitiesPage";
import ReportsPage from "./reports/ReportsPage";
import ComplaintsPage from "./complaints/ComplaintsPage";
import SettingsPage from "./settings/SettingsPage";
import OverviewPage from "./overview/OverviewPage";
import DeliveryPage from "./delivery/DeliveryPage";
import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import RequireAdmin from "./auth/RequireAdmin";
import FullScreenLoader from "./auth/FullScreenLoader";
import "./index.css";

function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modalType, setModalType] = useState<string | null>(null);
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 flex bg-[#f7f1e6] overflow-hidden" dir="rtl">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      {/* Block scroll container (not a flex column): the sticky Header + each
          page's `min-h-full` root flow normally, so the page background always
          covers the full scroll height — no white gap under short pages, no
          flex-shrink clipping under tall ones. */}
      <main className="flex-1 h-full overflow-y-auto">
        <Header toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <Routes>
          <Route path="/dashboard" element={<OverviewPage onQuickAction={setModalType} />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/withdrawals" element={<WithdrawalsPage />} />
          <Route path="/cooks" element={<CookApplicationsPage />} />
          <Route path="/drivers" element={<DriverApplicationsPage />} />
          <Route path="/cities" element={<CitiesPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/complaints" element={<ComplaintsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/delivery" element={<DeliveryPage />} />
        </Routes>
      </main>
      {modalType === "إضافة طباخة" && (
        <AddCookModal
          onClose={() => setModalType(null)}
          onCreated={() => navigate("/cooks")}
        />
      )}
      {modalType === "إشعار عام" && (
        <NotificationModal onClose={() => setModalType(null)} />
      )}
      {modalType === "مستخدم جديد" && (
        <AddUserModal onClose={() => setModalType(null)} />
      )}
      {modalType === "إضافة سائق" && (
        <AddDriverModal
          onClose={() => setModalType(null)}
          onCreated={() => navigate("/drivers")}
        />
      )}
    </div>
  );
}

/** `/login`: loader while session validity is unknown, redirect home once signed in. */
function LoginRoute() {
  const { status } = useAuth();
  if (status === "checking") return <FullScreenLoader />;
  if (status === "authenticated") return <Navigate to="/dashboard" replace />;
  return <Login />;
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginRoute />} />
          <Route
            path="/*"
            element={
              <RequireAdmin>
                <AdminLayout />
              </RequireAdmin>
            }
          />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
