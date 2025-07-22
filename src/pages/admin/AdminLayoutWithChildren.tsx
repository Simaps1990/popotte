import React, { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BottomNavigation } from '../../components/BottomNavigation';
import { ArrowLeft } from 'lucide-react';

interface AdminLayoutWithChildrenProps {
  children: ReactNode;
}

export const AdminLayoutWithChildren: React.FC<AdminLayoutWithChildrenProps> = ({ children }) => {
  console.log("[ADMIN DEBUG] AdminLayoutWithChildren MOUNTED", window.location.pathname);
  const location = useLocation();
  
  // Fonction pour obtenir le titre de la page en fonction de l'URL
  const getPageTitle = () => {
    if (location.pathname.includes('/admin/users')) return 'Utilisateurs';
    if (location.pathname.includes('/admin/orders')) return 'Commandes';
    if (location.pathname.includes('/admin/news')) return 'Actualités';
    if (location.pathname.includes('/admin/products')) return 'Produits';
    return 'Administration';
  };

  return (
    <div className="min-h-screen flex flex-col bg-transparent">
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </div>
      </main>
      
      {/* Utilisation du même footer que les autres pages */}
      <div className="w-full max-w-md mx-auto border-0 border-none" style={{ border: 'none' }}>
        <BottomNavigation />
      </div>
    </div>
  );
};

export default AdminLayoutWithChildren;
