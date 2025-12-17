import React from 'react';
import { Navigate } from 'react-router-dom';
import FeatureDisabled from '@/pages/FeatureDisabled';
import { isFeatureEnabled } from '@/config/features';

export default function FeatureGate({ feature, children, redirectTo }) {
  if (!feature) return children;
  if (isFeatureEnabled(feature)) return children;

  if (redirectTo) return <Navigate to={redirectTo} replace />;
  return <FeatureDisabled />;
}
