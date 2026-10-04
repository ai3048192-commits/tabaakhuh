import { lazy, Suspense, useState } from "react";
import Header from "./components/Header";
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import RequireAdmin from "./auth/RequireAdmin";
import FullScreenLoader from "./auth/FullScreenLoader";
import ErrorBoundary from "./shared/ErrorBoundary";
import "./index.css";

/*
 * Route-level code splitting. Everything below is reached through exactly one
 * route, so nothing here belongs in the first download:
 *
 *   - The landing page carries the marketing photography. An admin signing in
 *     never renders it, and a visitor reading it never needs the dashboard.
 *   - Each admin screen pulls its own feature module (and Chart.js, in the case
 *     of Reports and Overview).
 *
 * The shell — auth, router, Header, Sidebar — stays eager: it renders on every
 * route, so deferring it would only add a round trip.
 */
const LandingPage = lazy(() => import("./pages/LandingPage"));
const Login = lazy(() => import("./pages/Login"));
const NotFound = lazy(() => import("./pages/NotFound"));

const OverviewPage = lazy(() => import("./overview/OverviewPage"));
const UsersPage = lazy(() => import("./users/UsersPage"));
const OrdersPage = lazy(() => import("./orders/OrdersPage"));
const WithdrawalsPage = lazy(() => import("./withdrawals/WithdrawalsPage"));
const CookApplicationsPage = lazy(() => import("./cooks/CookApplicationsPage"));
const DriverApplicationsPage = lazy(() => import("./drivers/DriverApplicationsPage"));
const CitiesPage = lazy(() => import("./cities/CitiesPage"));
const DeliveryPricingPage = lazy(() => import("./areas/DeliveryPricingPage"));
const ReportsPage = lazy(() => import("./reports/ReportsPage"));
const ComplaintsPage = lazy(() => import("./complaints/ComplaintsPage"));
const IncidentsPage = lazy(() => import("./incidents/IncidentsPage"));
const SettingsPage = lazy(() => import("./settings/SettingsPage"));
const DeliveryPage = lazy(() => import("./delivery/DeliveryPage"));

// Quick-action modals: opened from the dashboard, never on first paint.
const NotificationModal = lazy(() => import("./components/NotificationModal"));
const AddUserModal = lazy(() => import("./components/AddUserModal"));
const AddCookModal = lazy(() => import("./components/AddCookModal"));
const AddDriverModal = lazy(() => import("./components/AddDriverModal"));

/** Pending state for a screen chunk, sized to the content area. */
function PageLoader() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center" role="status" aria-live="polite">
      <div
        className="h-10 w-10 animate-spin rounded-full border-4 border-[#e8dfc9] border-t-[#7a0d0d]"
        aria-hidden="true"
      />
      <span className="sr-only">جارٍ التحميل…</span>
    </div>
  );
}

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
        {/* Inside the shell: a screen swap keeps the Header and Sidebar on
            screen and only the content area shows the pending state. */}
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/dashboard" element={<OverviewPage onQuickAction={setModalType} />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/withdrawals" element={<WithdrawalsPage />} />
            <Route path="/cooks" element={<CookApplicationsPage />} />
            <Route path="/drivers" element={<DriverApplicationsPage />} />
            <Route path="/cities" element={<CitiesPage />} />
            <Route path="/delivery-pricing" element={<DeliveryPricingPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/complaints" element={<ComplaintsPage />} />
            <Route path="/incidents" element={<IncidentsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/delivery" element={<DeliveryPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      <Suspense fallback={null}>
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
      </Suspense>
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
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <Suspense fallback={<FullScreenLoader />}>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/contact" element={<LandingPage view="contact" />} />
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
          </Suspense>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
