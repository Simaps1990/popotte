import React, { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

interface AdminPageLayoutProps {
  children: ReactNode;
}

export const AdminPageLayout: React.FC<AdminPageLayoutProps> = ({
  children,
}) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto px-4 py-6 max-w-4xl">
        {children}
      </main>
    </div>
  );
};

export default AdminPageLayout;
