import { useState } from "react";
import Header from "./components/Header";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import NotificationModal from "./components/NotificationModal";
import AddUserModal from "./components/AddUserModal";
import AddCookModal from "./components/AddCookModal";
import UsersManagement from "./pages/UsersManagement";
import OrdersPage from "./pages/OrdersPage";
import CooksManagement from "./pages/CooksManagement";
import FinancialReports from "./pages/FinancialReports";
import Complaints from "./pages/Complaints";
import Settings from "./pages/Settings";
import Dashboard  from "./pages/Dashboard";
import DeliveryPage from "./pages/DeliveryPage";
import "./index.css";

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modalType, setModalType] = useState<string | null>(null);

  return (
    <Router>
      <div className="flex h-screen bg-[#f7f1e6] overflow-hidden" dir="rtl">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 flex flex-col h-full overflow-y-auto">
          <Header toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
          <Routes>
            <Route path="/" element={<Dashboard setModalType={setModalType} />} />
            <Route path="/users" element={<UsersManagement />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/cooks" element={<CooksManagement />} />
            
            <Route path="/reports" element={<FinancialReports />} />{" "}
            <Route path="/complaints" element={<Complaints />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/delivery" element={<DeliveryPage />} />
          </Routes>
        </main>
        {modalType === "إضافة طباخة" && (
          <AddCookModal onClose={() => setModalType(null)} />
        )}
        {modalType === "إشعار عام" && (
          <NotificationModal onClose={() => setModalType(null)} />
        )}
        {modalType === "مستخدم جديد" && (
          <AddUserModal onClose={() => setModalType(null)} />
        )}
      </div>
    </Router>
  );
}

export default App;