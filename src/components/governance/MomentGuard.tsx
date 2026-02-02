import React from 'react';
import { useMoment } from '@/hooks/useMoment';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ShieldAlert } from 'lucide-react';
import { SurfaceType } from '@/governance/surfaces';

interface MomentGuardProps {
  children: React.ReactNode;
  surface: SurfaceType;
}

export const MomentGuard: React.FC<MomentGuardProps> = ({ children, surface }) => {
  const { moment, isSurfaceAllowed } = useMoment();
  const bypassStorageKey = `momentGuard:bypass:${surface}:${moment}`;
  const [bypass, setBypass] = React.useState<boolean>(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    return sessionStorage.getItem(bypassStorageKey) === 'true';
  });

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    sessionStorage.setItem(bypassStorageKey, String(bypass));
  }, [bypass, bypassStorageKey]);
  if (isSurfaceAllowed(surface) || bypass) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-[80vh] items-center justify-center p-4">
      <div className="max-w-md space-y-6">
        <Alert variant="default" className="border-amber-200 bg-amber-50">
          <ShieldAlert className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800">
            Protected Moment: {moment.toUpperCase()}
          </AlertTitle>
          <AlertDescription className="text-amber-700">
            To reduce overwhelm, <strong>{surface}</strong> is hidden during {moment}. Focus on the Weekly Brief or Daily
            Tip instead?
          </AlertDescription>
        </Alert>

        <div className="flex justify-center gap-4">
          <Button variant="outline" onClick={() => window.history.back()}>
            Go Back
          </Button>
          <Button variant="ghost" className="text-muted-foreground" onClick={() => setBypass(true)}>
            I need to access this now
          </Button>
        </div>
      </div>
    </div>
  );
};
