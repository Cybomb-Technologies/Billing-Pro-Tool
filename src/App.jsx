import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'; 
import 'bootstrap/dist/css/bootstrap.min.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import './App.css';

// Components
import Navigation from './components/Navigation';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Customers from './pages/Customers';
import Invoices from './pages/Invoices';
import Billing from './pages/Billing';
import Inventory from './pages/Inventory';
import Reports from './pages/Reports';
import History from './pages/History';
import Support from './pages/Support';
import Settings from './pages/Settings';
import PrivacyPolicy from './pages/PrivacyPolicy';
import RoleBasedRoute from "./components/RoleBasedRoutes";
import { AuthProvider, useAuth } from './context/AuthContext';
import Operations from './pages/Operations';
import StaffLog from './pages/StaffLog';
import SupportData from './pages/Support-data';
import SuperAdmin from './pages/SuperAdmin';
import ClientDashboard from './pages/ClientDashboard';

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
}




function PublicOnlyRoute({ children }) {
  const { user } = useAuth();
  return user ? <Navigate to="/dashboard" /> : children;
}

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function App() {
  return (
    
    <AuthProvider>
      
      <Router>
        <ScrollToTop />
        <div className="App">
          
          <Navigation>
            {/* <Container fluid className="mt-3"> */}
              
              <Routes>
                <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />

                {/* Protected routes */}
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
                <Route path="/customers" element={<ProtectedRoute><Customers /></ProtectedRoute>} />
                <Route path="/billing" element={<RoleBasedRoute allowedRoles={['staff','admin']}><Billing /></RoleBasedRoute>} />
                <Route path="/invoices" element={<RoleBasedRoute allowedRoles={['staff','admin']}><Invoices /></RoleBasedRoute>} />
                <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
                <Route path="/reports" element={<RoleBasedRoute allowedRoles={['admin']}><Reports /></RoleBasedRoute>} />
                <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
                <Route path="/support" element={<ProtectedRoute><Support /></ProtectedRoute>} />
                <Route path="/support-data" element={<ProtectedRoute><SupportData /></ProtectedRoute>} />
                <Route path="/stafflogs" element={<ProtectedRoute><StaffLog /></ProtectedRoute>} />
                <Route path="/settings" element={<RoleBasedRoute allowedRoles={['admin']}><Settings /></RoleBasedRoute>} />
                <Route path="/PrivacyPolicy" element={<PrivacyPolicy />} />
                <Route path="/Operations" element={<RoleBasedRoute allowedRoles={['staff','admin']}><Operations /></RoleBasedRoute>} />
                
                {/* Super Admin Route */}
                <Route path="/super-admin" element={<SuperAdmin />} />

                {/* Client Admin Route */}
                <Route path="/client-dashboard" element={<ProtectedRoute><ClientDashboard /></ProtectedRoute>} />

                {/* Default redirect */}
                <Route path="/" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
                
              </Routes>
            {/* </Container> */}
            
          </Navigation>
        </div>
        
      </Router>
      
    </AuthProvider>
    
  );
}


export default App;