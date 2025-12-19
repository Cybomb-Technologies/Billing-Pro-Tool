import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
// Assuming AuthContext is correctly located relative to this component.
// If the error persists, please confirm the exact path of AuthContext.js
import { useAuth } from "../context/AuthContext"; 
import {
  LayoutDashboard,
  Users,
  FileText,
  Package,
  BarChart3,
  Settings,
  LogOut,
  User,
  ChevronRight,
  Building,
  Archive,
  Clock,
  HelpCircle,
  ClipboardList // Used for Staff Logs icon
} from "lucide-react";

const Navigation = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isActiveLink = (path) => location.pathname === path;

  // --- Dynamic Menu Generation ---
  const fullMenuItems = [
    { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ['admin', 'staff'] },
    { path: "/customers", label: "Customers", icon: Users, roles: ['admin', 'staff'] },
    { path: "/billing", label: "Billing", icon: FileText, roles: ['admin', 'staff'] },
    { path: "/invoices", label: "Invoices", icon: FileText, roles: ['admin', 'staff'] },
    { path: "/products", label: "Products", icon: Package, roles: ['admin', 'staff'] },
    { path: "/inventory", label: "Inventory", icon: Archive, roles: ['admin', 'staff'] },
    { path: "/history", label: "History", icon: Clock, roles: ['admin', 'staff'] },
    
    // Role-specific items
    { path: "/reports", label: "Reports", icon: BarChart3, roles: ['admin'] },
    { path: "/stafflogs", label: "Staff Logs", icon: ClipboardList, roles: ['staff'] }, // Only for Staff
    
    // Core utility/Admin Items
    { path: "/support", label: "Support", icon: HelpCircle, roles: ['staff'] },
    
    { path: "/support-data", label: "Support", icon: HelpCircle, roles: ['admin'] },
    { path: "/settings", label: "Settings", icon: Settings, roles: ['admin'] },
  ];

  // Filter menu items based on the current user's role
  // If user object is null (not logged in), filteredMenuItems will be empty, hiding the sidebar.
  const filteredMenuItems = user
    ? fullMenuItems.filter(item => item.roles.includes(user.role))
    : [];
    
  // --- End Dynamic Menu Generation ---

  return (
    <div className="d-flex">
      {/* Sidebar is only rendered if user is logged in */}
      {user && (
        <div
          className="vh-100 position-fixed d-flex flex-column"
          style={{ 
            width: "var(--sidebar-width)", 
            zIndex: 1000,
            backgroundColor: "var(--bg-sidebar)",
            borderRight: "1px solid var(--border-color)"
          }}
        >
          {/* Sidebar Header */}
          <div className="p-4" style={{borderBottom: "1px solid rgba(255,255,255,0.05)"}}>
            <div className="d-flex align-items-center">
              <div
                className="rounded-circle d-flex align-items-center justify-content-center me-3 shadow-sm"
                style={{ 
                  width: "40px", 
                  height: "40px",
                  background: "linear-gradient(135deg, var(--primary-color), var(--secondary-color))" 
                }}
              >
                <Building size={20} className="text-white" />
              </div>
              <div>
                <h5 className="mb-0 fw-bold" style={{color: "var(--text-on-dark)"}}>Billing Pro</h5>
                <small style={{color: "var(--text-muted)"}}>Business Suite</small>
              </div>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="p-3 flex-grow-1 overflow-auto custom-scrollbar">
            <div className="d-flex flex-column gap-2">
              {filteredMenuItems.map((item) => {
                const IconComponent = item.icon;
                const active = isActiveLink(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`d-flex align-items-center gap-3 text-decoration-none p-3 rounded-3 transition-all ${
                      active ? "shadow-sm" : "hover-custom"
                    }`}
                    style={{
                      backgroundColor: active ? "var(--primary-color)" : "transparent",
                      color: active ? "#fff" : "var(--text-secondary)"
                    }}
                  >
                    <IconComponent
                      size={20}
                      style={{ color: active ? "#fff" : "var(--text-muted)" }}
                    />
                    <span className="fw-medium" style={{color: active ? "#fff" : "var(--text-on-dark)"}}>{item.label}</span>
                    {active && (
                      <ChevronRight size={16} className="ms-auto text-white" />
                    )}
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Sidebar Footer */}
          <div className="p-3 mt-auto" style={{borderTop: "1px solid rgba(255,255,255,0.05)"}}>
            <div className="d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center">
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center me-3"
                  style={{ width: "36px", height: "36px", backgroundColor: "var(--success-color)" }}
                >
                  <User size={16} className="text-white" />
                </div>
                <div>
                  <div className="fw-semibold small" style={{color: "var(--text-on-dark)"}}>
                    {user.username}
                  </div>
                  <div className="small text-capitalize" style={{color: "var(--text-muted)"}}>
                    {user.role}
                  </div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="btn btn-sm d-flex align-items-center justify-content-center p-2"
                style={{
                  background: "rgba(255,255,255,0.05)", 
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "var(--text-muted)"
                }}
                title="Logout"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div
        className="flex-grow-1"
        style={{ marginLeft: user ? "var(--sidebar-width)" : "0" }}
      >
        <div className="min-vh-100 d-flex flex-column" style={{backgroundColor: "var(--bg-body)"}}>{children}</div>
      </div>

      {/* Custom CSS for hover effects */}
      <style jsx="true">{`
        .hover-custom:hover {
          background-color: rgba(255, 255, 255, 0.1) !important;
          color: #ffffff !important;
          transform: translateX(4px);
        }
        .transition-all {
          transition: all 0.2s ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default Navigation;
