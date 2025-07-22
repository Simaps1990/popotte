import { ReactNode } from 'react';

export type RequiredRole = 'user' | 'admin';

export interface LayoutProps {
  children: ReactNode;
}

export interface AuthRouteProps {
  children: ReactNode;
  requiredRole?: RequiredRole;
}
