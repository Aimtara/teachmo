import { Children, cloneElement, isValidElement, ReactElement, ReactNode, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2, ShieldAlert } from 'lucide-react';
import { User } from '@/api/entities';
import { createPageUrl } from '@/utils';

type GuardUser = {
  user_type?: string;
  role?: string;
  is_pta_board_member?: boolean;
  [key: string]: unknown;
};

type RoleGuardProps = {
  children: ReactNode;
  allowedRoles: string[];
  ptaBoardOnly?: boolean;
};

const RoleGuard = ({ children, allowedRoles, ptaBoardOnly = false }: RoleGuardProps) => {
  const [user, setUser] = useState<GuardUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const currentUser = (await User.me()) as GuardUser | null;
        setUser(currentUser);
      } catch {
        // Not logged in
      } finally {
        setIsLoading(false);
      }
    };

    void checkUser();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
      </div>
    );
  }

  const currentRole = user?.user_type || user?.role;
  const isAuthorized = Boolean(user && currentRole && allowedRoles.includes(currentRole));
  const hasPTAPermission = !ptaBoardOnly || Boolean(user?.is_pta_board_member);

  if (!user) {
    return <Navigate to={createPageUrl('Landing')} replace />;
  }

  if (!isAuthorized || !hasPTAPermission) {
    return (
      <div className="flex flex-col justify-center items-center h-screen p-8 text-center">
        <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-gray-600">You do not have the necessary permissions to view this page.</p>
        <p className="text-sm mt-1">
          Your role: <span className="font-mono bg-gray-100 p-1 rounded">{currentRole}</span>
        </p>
      </div>
    );
  }

  return Children.map(children, (child) => {
    if (isValidElement(child)) {
      return cloneElement(child as ReactElement<Record<string, unknown>>, { user });
    }
    return child;
  });
};

export default RoleGuard;
export { RoleGuard };
