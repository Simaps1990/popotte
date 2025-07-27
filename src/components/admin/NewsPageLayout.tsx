import React, { ReactNode } from 'react';

interface NewsPageLayoutProps {
  children: ReactNode;
}

export const NewsPageLayout: React.FC<NewsPageLayoutProps> = ({
  children,
}) => {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#ffffff', // Charte graphique : fond blanc
      backgroundImage: 'none',
      position: 'relative',
      zIndex: 1,
      border: '1px solid #eee' // Charte graphique : bordure claire
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
