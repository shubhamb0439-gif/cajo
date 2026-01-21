import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CurrencyProvider } from './contexts/CurrencyContext';
import { DeviceProvider, useDevice } from './contexts/DeviceContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Vendors from './pages/Vendors';
import Purchases from './pages/Purchases';
import Manufacturing from './pages/Manufacturing';
import Leads from './pages/Leads';
import Prospects from './pages/Prospects';
import Customers from './pages/Customers';
import Orders from './pages/Orders';
import Sales from './pages/Sales';
import Deliveries from './pages/Deliveries';
import Support from './pages/Support';
import ActivityLog from './pages/ActivityLog';
import Settings from './pages/Settings';
import ClientDashboard from './pages/ClientDashboard';
import Handheld from './pages/Handheld';
import Layout from './components/Layout';

function SmartRedirect() {
  const { userProfile } = useAuth();
  const { isMobile } = useDevice();

  const isAdminOrUser = userProfile?.role === 'admin' || userProfile?.role === 'user';

  if (isAdminOrUser && isMobile) {
    return <Navigate to="/handheld" />;
  }

  return (
    <Layout>
      <Dashboard />
    </Layout>
  );
}

function PrivateRoute({ children, clientOnly = false, handheldOnly = false, erpOnly = false }: { children: React.ReactNode; clientOnly?: boolean; handheldOnly?: boolean; erpOnly?: boolean }) {
  const { user, userProfile, loading } = useAuth();
  const { isMobile } = useDevice();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  const isClient = userProfile?.role === 'client';
  const isManager = userProfile?.role === 'manager';
  const isClientOrManager = isClient || isManager;
  const isAdminOrUser = userProfile?.role === 'admin' || userProfile?.role === 'user';

  if (clientOnly && !isClientOrManager) {
    return <Navigate to="/" />;
  }

  if (handheldOnly && !isAdminOrUser) {
    return <Navigate to="/" />;
  }

  if (erpOnly && isAdminOrUser && isMobile) {
    return <Navigate to="/handheld" />;
  }

  if (erpOnly && !isAdminOrUser) {
    return <Navigate to="/" />;
  }

  if (!clientOnly && !handheldOnly && isClientOrManager) {
    return <Navigate to="/client" />;
  }

  if (!clientOnly && !handheldOnly && isAdminOrUser && isMobile) {
    return <Navigate to="/handheld" />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { user, userProfile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
      </div>
    );
  }

  const isClientOrManager = userProfile?.role === 'client' || userProfile?.role === 'manager';
  const isAdminOrUser = userProfile?.role === 'admin' || userProfile?.role === 'user';

  let loginRedirect = null;
  if (user) {
    if (isClientOrManager) {
      loginRedirect = '/client';
    } else if (isAdminOrUser) {
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
      loginRedirect = isMobile ? '/handheld' : '/';
    }
  }

  return (
    <Routes>
      <Route path="/login" element={loginRedirect ? <Navigate to={loginRedirect} /> : <Login />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <SmartRedirect />
          </PrivateRoute>
        }
      />
      <Route
        path="/inventory/items"
        element={
          <PrivateRoute erpOnly={true}>
            <Layout>
              <Inventory />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/inventory/vendors"
        element={
          <PrivateRoute erpOnly={true}>
            <Layout>
              <Vendors />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/inventory/purchases"
        element={
          <PrivateRoute erpOnly={true}>
            <Layout>
              <Purchases />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route path="/inventory" element={<Navigate to="/inventory/items" />} />
      <Route
        path="/manufacturing/bom"
        element={
          <PrivateRoute erpOnly={true}>
            <Layout>
              <Manufacturing section="bom" />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/manufacturing/assembly"
        element={
          <PrivateRoute erpOnly={true}>
            <Layout>
              <Manufacturing section="assembly" />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/manufacturing/traceability"
        element={
          <PrivateRoute erpOnly={true}>
            <Layout>
              <Manufacturing section="traceability" />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route path="/manufacturing" element={<Navigate to="/manufacturing/bom" />} />
      <Route
        path="/sales/leads"
        element={
          <PrivateRoute erpOnly={true}>
            <Layout>
              <Leads />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/sales/prospects"
        element={
          <PrivateRoute erpOnly={true}>
            <Layout>
              <Prospects />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/sales/customers"
        element={
          <PrivateRoute erpOnly={true}>
            <Layout>
              <Customers />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/sales/purchase-orders"
        element={
          <PrivateRoute erpOnly={true}>
            <Layout>
              <Orders />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/sales/orders"
        element={
          <PrivateRoute erpOnly={true}>
            <Layout>
              <Sales />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/sales/deliveries"
        element={
          <PrivateRoute erpOnly={true}>
            <Layout>
              <Deliveries />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route path="/sales" element={<Navigate to="/sales/leads" />} />
      <Route
        path="/support"
        element={
          <PrivateRoute erpOnly={true}>
            <Layout>
              <Support />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/activity"
        element={
          <PrivateRoute erpOnly={true}>
            <Layout>
              <ActivityLog />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/settings/*"
        element={
          <PrivateRoute erpOnly={true}>
            <Layout>
              <Settings />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/client"
        element={
          <PrivateRoute clientOnly={true}>
            <Layout>
              <ClientDashboard />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/handheld"
        element={
          <PrivateRoute handheldOnly={true}>
            <Handheld />
          </PrivateRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CurrencyProvider>
          <DeviceProvider>
            <AppRoutes />
          </DeviceProvider>
        </CurrencyProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
