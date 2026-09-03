import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

interface Props {
  children: React.ReactNode;
  minRole?: 'admin' | 'operator' | 'viewer';
}

const ROLE_LEVELS = {
  admin: 3,
  operator: 2,
  viewer: 1
};

export const ProtectedRoute: React.FC<Props> = ({ children, minRole = 'viewer' }) => {
  const { isAuthenticated, role } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const userLevel = ROLE_LEVELS[role] || 1;
  const requiredLevel = ROLE_LEVELS[minRole] || 1;

  if (userLevel < requiredLevel) {
    return (
      <div className="p-8 max-w-lg mx-auto mt-20 glass-panel rounded-xl text-center border-red-500/40">
        <h2 className="text-xl font-bold text-red-400 mb-2">Access Restricted</h2>
        <p className="text-sm text-slate-300 mb-4">
          This operational module requires <span className="font-mono text-cyan-400">{minRole.toUpperCase()}</span> clearance. 
          Your current session has <span className="font-mono text-yellow-400">{role.toUpperCase()}</span> permissions.
        </p>
        <button
          onClick={() => window.history.back()}
          className="px-4 py-2 bg-polar-navy hover:bg-polar-border border border-polar-border text-white text-xs rounded-lg transition-colors"
        >
          Return to Previous Screen
        </button>
      </div>
    );
  }

  return <>{children}</>;
};
