import React, { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

interface AdminPageLayoutProps {
  children: ReactNode;
}

export const AdminPageLayout: React.FC<AdminPageLayoutProps> = ({
  children,
}) => {
  return (
    <div className="min-h-screen bg-white">
      <main className="container mx-auto px-4 py-6 max-w-4xl bg-white border border-[#eee]">
        {children}
      </main>
      <footer className="bg-white pt-8 pb-8 border-t border-[#eee] flex flex-col items-center justify-center space-y-2">
        {/* Charte graphique : footer blanc, marge haute, padding augmenté, cohérent partout */}
      </footer>
    </div>
  );
};

export default AdminPageLayout;
