import React, { ReactNode } from 'react';

interface NewsPageLayoutProps {
  title: string;
  children: ReactNode;
}

export const NewsPageLayout: React.FC<NewsPageLayoutProps> = ({
  title,
  children,
}) => {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#ffffff',
      backgroundImage: 'none',
      position: 'relative',
      zIndex: 1
    }}>
      <main style={{
        maxWidth: '56rem',
        margin: '0 auto',
        padding: '1.5rem 1rem',
        backgroundColor: '#ffffff'
      }}>
        {children}
      </main>
    </div>
  );
};

export default NewsPageLayout;
