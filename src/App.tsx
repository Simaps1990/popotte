import React, { ReactNode, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { supabaseKeepAlive } from './services/supabaseKeepAlive';
import { AuthRoute } from './components/routing/AuthRoute';
import { LayoutWithChildren } from './components/LayoutWithChildren';
import { AdminLayoutWithChildren } from './pages/admin/AdminLayoutWithChildren';
import ScrollToTop from './components/ScrollToTop';
import VisibilityHandler from './components/VisibilityHandler';

// Pages publiques (chargement immédiat)
import { Home } from './pages/Home';
import { AuthPage } from './pages/AuthPage';
import { AuthCallback } from './pages/AuthCallback';

// Pages protégées (lazy loading)
const Commande = React.lazy(() => import('./pages/Commande').then(m => ({ default: m.Commande })));
const Dettes = React.lazy(() => import('./pages/Dettes').then(m => ({ default: m.Dettes })));
const Settings = React.lazy(() => import('./pages/Settings'));
const Profile = React.lazy(() => import('./pages/Profile').then(m => ({ default: m.Profile })));

// Pages admin (lazy loading)
const Users = React.lazy(() => import('./pages/admin/Users'));
const Orders = React.lazy(() => import('./pages/admin/Orders').then(m => ({ default: m.Orders })));
const News = React.lazy(() => import('./pages/admin/News').then(m => ({ default: m.News })));
const Products = React.lazy(() => import('./pages/admin/Products').then(m => ({ default: m.default })));
const OrdersList = React.lazy(() => import('./pages/admin/OrdersList').then(m => ({ default: m.OrdersList })));
const NewsList = React.lazy(() => import('./pages/admin/NewsList').then(m => ({ default: m.NewsList })));
const OrderDetail = React.lazy(() => import('./pages/admin/OrderDetail').then(m => ({ default: m.OrderDetail })));
const PaymentsToVerify = React.lazy(() => import('./pages/admin/PaymentsToVerify'));

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

// Composant de mise en page protégée avec Suspense
const ProtectedLayout: React.FC<{ children: ReactNode }> = (props) => {
  return (
    <AuthRoute requiredRole="user">
      <LayoutWithChildren>
        <Suspense fallback={<LoadingSpinner />}>
          {props.children}
        </Suspense>
      </LayoutWithChildren>
    </AuthRoute>
  );
};

// Composant de mise en page admin avec Suspense
const AdminLayoutWrapper: React.FC<{ children: ReactNode }> = (props) => {
  return (
    <AuthRoute requiredRole="admin">
      <AdminLayoutWithChildren>
        <Suspense fallback={<LoadingSpinner />}>
          {props.children}
        </Suspense>
      </AdminLayoutWithChildren>
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
  // Démarrer le service de keep-alive
  React.useEffect(() => {
    console.log('🚀 Composant App monté');
    
    // Démarrer le service de keep-alive
    supabaseKeepAlive.start();
    
    return () => {
      console.log('👋 Composant App démonté');
      // Arrêter le service de keep-alive
      supabaseKeepAlive.stop();
    };
  }, []);
  
  return (
    // Suppression de StrictMode qui cause le double montage/chargement en développement
    // <React.StrictMode>
      <AuthProvider>
        <Toaster position="top-center" reverseOrder={false} />
        <VisibilityHandler />
        <BrowserRouter>
          {/* ScrollToTop garantit le scroll en haut à chaque navigation, même dans les sous-pages (charte UX) */}
          <ScrollToTop />
          <Routes>
            {/* Routes publiques */}
            <Route path="/" element={<MemoizedPublicPage />} />
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
    // </React.StrictMode>
  );
}

export default App;