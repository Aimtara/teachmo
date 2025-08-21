import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { User } from '@/api/entities';
import { createPageUrl } from '@/utils';
import { Loader2, ShieldAlert } from 'lucide-react';

const RoleGuard = ({ children, allowedRoles, ptaBoardOnly = false }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const currentUser = await User.me();
        setUser(currentUser);
      } catch (error) {
        // Not logged in
      } finally {
        setIsLoading(false);
      }
    };
    checkUser();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
      </div>
    );
  }

  const isAuthorized = user && allowedRoles.includes(user.user_type || user.role);
  const hasPTAPermission = !ptaBoardOnly || (user && user.is_pta_board_member);

  if (!user) {
    return <Navigate to={createPageUrl("Landing")} replace />;
  }
  
  if (!isAuthorized || !hasPTAPermission) {
    return (
      <div className="flex flex-col justify-center items-center h-screen p-8 text-center">
        <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-gray-600">You do not have the necessary permissions to view this page.</p>
        <p className="text-sm mt-1">Your role: <span className="font-mono bg-gray-100 p-1 rounded">{user.user_type || user.role}</span></p>
      </div>
    );
  }

  // Pass user prop to children for convenience
  return React.Children.map(children, child => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, { user });
    }
    return child;
  });
};

export default RoleGuard;