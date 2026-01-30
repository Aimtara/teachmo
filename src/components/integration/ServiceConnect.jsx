import React, { useState, useEffect, useRef } from 'react';
import { Check, ExternalLink, Loader2, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ultraMinimalToast } from '@/components/shared/UltraMinimalToast';
import { API_BASE_URL } from '@/config/api';

export default function ServiceConnect({
  serviceKey,
  serviceName,
  icon: Icon,
  connected = false,
}) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(connected);
  const timerRef = useRef(null);

  // Cleanup interval timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  const getIntegrationHeaders = async () => {
    const headers = {};

    // Attempt to use a globally available Nhost client if present.
    const nhost = globalThis?.nhost;

    if (nhost?.auth?.getAccessToken) {
      const accessToken = await nhost.auth.getAccessToken();

      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }
    }

    return headers;
  };

  const handleConnect = async () => {
    setIsConnecting(true);

    try {
      const headers = await getIntegrationHeaders();

      const res = await fetch(`${API_BASE_URL}/integrations/${serviceKey}/auth`, {
        method: 'POST',
        headers,
      });

      const data = res.ok
        ? await res.json()
        : { authUrl: `https://${serviceKey}.com/login?mock=true` };

      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        data.authUrl,
        `Connect ${serviceName}`,
        `width=${width},height=${height},left=${left},top=${top}`,
      );

      // Clear any existing timer before creating a new one
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }

      timerRef.current = window.setInterval(() => {
        if (popup?.closed) {
          window.clearInterval(timerRef.current);
          timerRef.current = null;
          setIsConnecting(false);
          setIsConnected(true);
          ultraMinimalToast(`Connected to ${serviceName}!`);
        }
      }, 500);
    } catch (error) {
      console.error(error);
      setIsConnecting(false);
      ultraMinimalToast('Connection failed. Please try again.', 'error');
    }
  };

  const handleDisconnect = async () => {
    const confirmed = window.confirm(`Disconnect ${serviceName}?`);
    if (!confirmed) {
      return;
    }

    setIsConnecting(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/integrations/${serviceKey}/disconnect`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to disconnect service');
      }

      setIsConnected(false);
      ultraMinimalToast(`Disconnected ${serviceName}`);
    } catch (error) {
      console.error(error);
      ultraMinimalToast(
        `Failed to disconnect ${serviceName}. Please try again.`,
        'error'
      );
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg bg-white shadow-sm">
      <div className="flex items-center gap-4">
        <div
          className={`p-2 rounded-full ${
            isConnected ? 'bg-green-100' : 'bg-gray-100'
          }`}
        >
          {Icon ? (
            <Icon
              className={`w-6 h-6 ${
                isConnected ? 'text-green-600' : 'text-gray-500'
              }`}
            />
          ) : (
            <ExternalLink className="w-6 h-6" />
          )}
        </div>
        <div>
          <h4 className="font-semibold text-gray-900">{serviceName}</h4>
          <p className="text-xs text-gray-500">
            {isConnected ? 'Sync active' : 'Not connected'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {isConnected ? (
          <>
            <Badge
              variant="outline"
              className="bg-green-50 text-green-700 border-green-200"
            >
              <Check className="w-3 h-3 mr-1" /> Connected
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDisconnect}
              className="text-red-500 hover:text-red-700 hover:bg-red-50"
            >
              <X className="w-4 h-4" />
            </Button>
          </>
        ) : (
          <Button onClick={handleConnect} disabled={isConnecting} size="sm">
            {isConnecting ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            Connect
          </Button>
        )}
      </div>
    </div>
  );
}
