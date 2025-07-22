import React, { ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { AuthRoute } from './components/routing/AuthRoute';
import { LayoutWithChildren } from './components/LayoutWithChildren';
import { AdminLayoutWithChildren } from './pages/admin/AdminLayoutWithChildren';

// Pages publiques
import { Home } from './pages/Home';
import { AuthPage } from './pages/AuthPage';
import { AuthCallback } from './pages/AuthCallback';

// Pages protégées
import { Commande } from './pages/Commande';
import { Dettes } from './pages/Dettes';
import Settings from '@pages/Settings';
import { Profile } from './pages/Profile';

// Pages admin
import Users from './pages/admin/Users';
import { Orders } from './pages/admin/Orders';
import { News } from './pages/admin/News';
import Products from './pages/admin/Products';
import { OrdersList } from './pages/admin/OrdersList';
import { NewsList } from './pages/admin/NewsList';
import { OrderDetail } from './pages/admin/OrderDetail';
import PaymentsToVerify from './pages/admin/PaymentsToVerify';

// Composant de chargement
export const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
  </div>
);

// Composant de mise en page de base
const BaseLayout: React.FC<{ children: ReactNode }> = (props) => {
  return <LayoutWithChildren>{props.children}</LayoutWithChildren>;
};

// Composant de mise en page protégée
const ProtectedLayout: React.FC<{ children: ReactNode }> = (props) => {
  return (
    <AuthRoute requiredRole="user">
      <LayoutWithChildren>{props.children}</LayoutWithChildren>
    </AuthRoute>
  );
};

// Composant de mise en page admin
const AdminLayoutWrapper: React.FC<{ children: ReactNode }> = (props) => {
  return (
    <AuthRoute requiredRole="admin">
      <AdminLayoutWithChildren>{props.children}</AdminLayoutWithChildren>
    </AuthRoute>
  );
};

// Composant de page admin avec contenu personnalisé
import { Dashboard } from './pages/admin/Dashboard';
import AdminProfile from './pages/admin/Profile';

const AdminDashboard = () => <Dashboard />;
const AdminProfilePage = () => (
  <AdminLayoutWrapper>
    <AdminProfile />
  </AdminLayoutWrapper>
);

// Composants de page avec leurs layouts respectifs
const PublicPage = () => (
  <BaseLayout>
    <Home />
  </BaseLayout>
);

// Page de gestion des commandes
const AdminOrdersPage = () => (
  <AdminLayoutWrapper>
    <OrdersList />
  </AdminLayoutWrapper>
);

// Page de gestion des actualités
const AdminNewsPage = () => (
  <AdminLayoutWrapper>
    <NewsList />
  </AdminLayoutWrapper>
);

const ProtectedCommande = () => (
  <ProtectedLayout>
    <Commande />
  </ProtectedLayout>
);

const ProtectedDettes = () => (
  <ProtectedLayout>
    <Dettes />
  </ProtectedLayout>
);

const ProtectedSettings = () => (
  <ProtectedLayout>
    <Settings />
  </ProtectedLayout>
);

const ProtectedProfile = () => (
  <ProtectedLayout>
    <Profile />
  </ProtectedLayout>
);

// Composants admin
const AdminHome = () => (
  <AdminLayoutWrapper>
    <AdminDashboard />
  </AdminLayoutWrapper>
);

const AdminUsers = () => (
  <AdminLayoutWrapper>
    <Users />
  </AdminLayoutWrapper>
);

const AdminOrders = () => (
  <AdminLayoutWrapper>
    <Orders />
  </AdminLayoutWrapper>
);

const AdminNews = () => (
  <AdminLayoutWrapper>
    <News />
  </AdminLayoutWrapper>
);

const AdminProducts = () => (
  <AdminLayoutWrapper>
    <Products />
  </AdminLayoutWrapper>
);

// Utilisation de React.memo pour éviter les re-rendus inutiles
const MemoizedPublicPage = React.memo(PublicPage);
const MemoizedAuthPage = React.memo(AuthPage);
const MemoizedAuthCallback = React.memo(AuthCallback);
const MemoizedProtectedCommande = React.memo(ProtectedCommande);
const MemoizedProtectedDettes = React.memo(ProtectedDettes);
const MemoizedProtectedSettings = React.memo(ProtectedSettings);
const MemoizedProtectedProfile = React.memo(ProtectedProfile);
const MemoizedAdminHome = React.memo(AdminHome);
const MemoizedAdminUsers = React.memo(AdminUsers);
const MemoizedAdminOrders = React.memo(AdminOrders);
const MemoizedAdminNews = React.memo(AdminNews);
const MemoizedAdminProducts = React.memo(AdminProducts);

function App() {
  React.useEffect(() => {
    console.log('🚀 Composant App monté');
    return () => console.log('👋 Composant App démonté');
  }, []);
  
  return (
    <React.StrictMode>
      <AuthProvider>
        <Toaster position="top-center" reverseOrder={false} />
        <BrowserRouter>
          <Routes>
            {/* Routes publiques */}
            <Route path="/" element={<MemoizedPublicPage />}>
              <Route index element={<Home />} />
            </Route>
            <Route path="/auth" element={<MemoizedAuthPage />} />
            <Route path="/auth/callback" element={<MemoizedAuthCallback />} />
            {/* Routes protégées */}
            <Route path="/commande" element={<MemoizedProtectedCommande />} />
            <Route path="/dettes" element={<MemoizedProtectedDettes />} />
            <Route path="/parametres" element={<MemoizedProtectedSettings />} />
            <Route path="/profil" element={<MemoizedProtectedProfile />} />
            {/* Routes admin */}
            <Route path="/admin" element={<Navigate to="/admin/orders" replace />} />
            <Route path="/admin/users" element={<MemoizedAdminUsers />} />
            <Route path="/admin/orders" element={<AdminOrdersPage />} />
            <Route path="/admin/orders/:orderId" element={<OrderDetail />} />
            <Route path="/admin/orders/old" element={<MemoizedAdminOrders />} />
            <Route path="/admin/news" element={<AdminNewsPage />} />
            <Route path="/admin/news/old" element={<MemoizedAdminNews />} />
            <Route path="/admin/products" element={<MemoizedAdminProducts />} />
            <Route path="/admin/profile" element={<AdminProfilePage />} />
            <Route path="/admin/payments" element={
              <AdminLayoutWrapper>
                <PaymentsToVerify />
              </AdminLayoutWrapper>
            } />
            
            {/* Route de secours */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </React.StrictMode>
  );
}

export default App;