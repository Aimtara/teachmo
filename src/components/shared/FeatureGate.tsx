import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import FeatureDisabled from '@/pages/FeatureDisabled';
import { isFeatureEnabled } from '@/config/features';

type FeatureGateProps = {
  feature?: string;
  children: ReactNode;
  redirectTo?: string;
};

export default function FeatureGate({ feature, children, redirectTo }: FeatureGateProps) {
  if (!feature) return <>{children}</>;
  if (isFeatureEnabled(feature)) return <>{children}</>;

  if (redirectTo) return <Navigate to={redirectTo} replace />;
  return <FeatureDisabled />;
}

export { FeatureGate };
