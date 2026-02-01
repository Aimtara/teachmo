import React, { useState, useEffect, useRef } from "react";
import { User } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertCircle, ExternalLink, RefreshCw, Users, BookOpen } from "lucide-react";
import { motion } from "framer-motion";
import { googleAuth } from "@/api/functions";
import { googleClassroomSync } from "@/api/functions";
import { GoogleClassroomService } from '@/services/integrations/googleClassroom';
import { createLogger } from '@/utils/logger';

const logger = createLogger('GoogleClassroomConnect');

export default function GoogleClassroomConnect({ user, onConnectionUpdate }) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [lastSyncTime, setLastSyncTime] = useState(null);

  // Store interval and listener references for cleanup
  const checkClosedRef = useRef(null);
  const messageListenerRef = useRef(null);

  useEffect(() => {
    if (user?.google_classroom_connected) {
      setConnectionStatus('connected');
      setLastSyncTime(user.last_integration_sync);
    }
  }, [user]);

  const handleConnect = async () => {
    setIsConnecting(true);
    setSyncStatus(null);

    try {
      const { data } = await googleAuth({ action: 'authorize' });

      if (data.authUrl) {
        // Open Google OAuth in a popup window
        const popup = window.open(
          data.authUrl,
          'google-auth',
          'width=500,height=600,scrollbars=yes,resizable=yes'
        );

        // Listen for the popup to close or send a message
        // Create interval and listener and store refs for cleanup
        checkClosedRef.current = setInterval(() => {
          if (popup.closed) {
            if (checkClosedRef.current) clearInterval(checkClosedRef.current);
            setIsConnecting(false);
            // Check if connection was successful
            checkConnectionStatus();
          }
        }, 1000);

        messageListenerRef.current = (event) => {
          if (event.origin !== window.location.origin) return;

          if (event.data.type === 'google-auth-success') {
            if (checkClosedRef.current) clearInterval(checkClosedRef.current);
            popup.close();
            setConnectionStatus('connected');
            setIsConnecting(false);
            setSyncStatus({ type: 'success', message: 'Connected to Google Classroom successfully!' });
            if (onConnectionUpdate) onConnectionUpdate();
            if (messageListenerRef.current) window.removeEventListener('message', messageListenerRef.current);
          } else if (event.data.type === 'google-auth-error') {
            if (checkClosedRef.current) clearInterval(checkClosedRef.current);
            popup.close();
            setIsConnecting(false);
            setSyncStatus({ type: 'error', message: event.data.error || 'Failed to connect to Google Classroom' });
            if (messageListenerRef.current) window.removeEventListener('message', messageListenerRef.current);
          }
        };

        window.addEventListener('message', messageListenerRef.current);
      }
    } catch (error) {
      logger.error('Connection error:', error);
      setIsConnecting(false);
      setSyncStatus({ type: 'error', message: 'Failed to initiate Google Classroom connection' });
    }
  };

  const checkConnectionStatus = async () => {
    try {
      const updatedUser = await User.me();
      if (updatedUser?.google_classroom_connected) {
        setConnectionStatus('connected');
        setLastSyncTime(updatedUser.last_integration_sync);
        if (onConnectionUpdate) onConnectionUpdate();
      }
    } catch (error) {
      logger.error('Error checking connection status:', error);
    }
  };

  const handleSync = async (syncType = 'courses') => {
    setIsSyncing(true);
    setSyncStatus(null);

    try {
      if (!user?.id) {
        throw new Error('Missing teacher profile for sync.');
      }

      if (syncType === 'courses') {
        const result = await GoogleClassroomService.syncCourses(user.id);
        setSyncStatus({
          type: 'success',
          message: `Successfully synced ${result.syncedCourses} courses`
        });
      } else if (syncType === 'assignments') {
        const count = await GoogleClassroomService.syncAssignmentsForCourse(
          user.id,
          'all'
        );
        setSyncStatus({
          type: 'success',
          message: `Successfully synced ${count} assignments`
        });
      } else {
        const { data } = await googleClassroomSync({
          action: `sync_${syncType}`,
        });

        if (!data.success) {
          throw new Error(data.error || `Failed to sync ${syncType}`);
        }

        setSyncStatus({
          type: 'success',
          message: `Successfully synced ${data.totalSynced || 0} ${syncType}`
        });
      }

      setLastSyncTime(new Date().toISOString());
      if (onConnectionUpdate) onConnectionUpdate();
    } catch (error) {
      logger.error('Sync error:', error);
      setSyncStatus({ 
        type: 'error', 
        message: `Failed to sync ${syncType}. Please try again.` 
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    if (window.confirm('Are you sure you want to disconnect Google Classroom? This will stop syncing your classes and assignments.')) {
      try {
        await User.updateMyUserData({
          google_classroom_connected: false,
          google_classroom_token: null,
          google_classroom_refresh_token: null
        });

        setConnectionStatus('disconnected');
        setLastSyncTime(null);
        setSyncStatus({ type: 'success', message: 'Disconnected from Google Classroom' });
        if (onConnectionUpdate) onConnectionUpdate();
      } catch (error) {
        logger.error('Disconnect error:', error);
        setSyncStatus({ type: 'error', message: 'Failed to disconnect from Google Classroom' });
      }
    }
  };

  // Cleanup any pending intervals or listeners on unmount
  useEffect(() => {
    return () => {
      if (checkClosedRef.current) {
        clearInterval(checkClosedRef.current);
      }
      if (messageListenerRef.current) {
        window.removeEventListener('message', messageListenerRef.current);
      }
    };
  }, []);

  return (
    <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Google Classroom</CardTitle>
              <p className="text-sm text-gray-600">
                Sync your classes, assignments, and student data
              </p>
            </div>
          </div>
          <Badge 
            className={connectionStatus === 'connected' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
          >
            {connectionStatus === 'connected' ? (
              <>
                <CheckCircle className="w-3 h-3 mr-1" />
                Connected
              </>
            ) : (
              'Not Connected'
            )}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {syncStatus && (
          <Alert className={syncStatus.type === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
            {syncStatus.type === 'error' ? (
              <AlertCircle className="h-4 w-4 text-red-600" />
            ) : (
              <CheckCircle className="h-4 w-4 text-green-600" />
            )}
            <AlertDescription className={syncStatus.type === 'error' ? 'text-red-800' : 'text-green-800'}>
              {syncStatus.message}
            </AlertDescription>
          </Alert>
        )}

        {connectionStatus === 'disconnected' ? (
          <div className="text-center py-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Connect Google Classroom</h3>
              <p className="text-gray-600 text-sm max-w-md mx-auto">
                Connect your Google Classroom account to automatically sync your classes, assignments, and communicate with parents through Teachmo.
              </p>
            </div>
            
            <div className="space-y-3 mb-6">
              <div className="flex items-center justify-center gap-2 text-sm text-gray-700">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Sync classes and coursework</span>
              </div>
              <div className="flex items-center justify-center gap-2 text-sm text-gray-700">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Connect with student parents</span>
              </div>
              <div className="flex items-center justify-center gap-2 text-sm text-gray-700">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Automatic assignment updates</span>
              </div>
            </div>

            <Button
              onClick={handleConnect}
              disabled={isConnecting}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isConnecting ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Connect Google Classroom
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-900">Google Classroom Connected</p>
                  {lastSyncTime && (
                    <p className="text-sm text-green-700">
                      Last synced: {new Date(lastSyncTime).toLocaleDateString()} at {new Date(lastSyncTime).toLocaleTimeString()}
                    </p>
                  )}
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleDisconnect}>
                Disconnect
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <motion.div whileHover={{ scale: 1.02 }}>
                <Button
                  variant="outline"
                  className="w-full h-auto p-4 flex flex-col items-center gap-2"
                  onClick={() => handleSync('courses')}
                  disabled={isSyncing}
                >
                  <BookOpen className="w-5 h-5 text-blue-600" />
                  <div className="text-center">
                    <p className="font-medium text-sm">Sync Classes</p>
                    <p className="text-xs text-gray-600">Update course list</p>
                  </div>
                </Button>
              </motion.div>

              <motion.div whileHover={{ scale: 1.02 }}>
                <Button
                  variant="outline"
                  className="w-full h-auto p-4 flex flex-col items-center gap-2"
                  onClick={() => handleSync('assignments')}
                  disabled={isSyncing}
                >
                  <RefreshCw className="w-5 h-5 text-green-600" />
                  <div className="text-center">
                    <p className="font-medium text-sm">Sync Assignments</p>
                    <p className="text-xs text-gray-600">Update coursework</p>
                  </div>
                </Button>
              </motion.div>

              <motion.div whileHover={{ scale: 1.02 }}>
                <Button
                  variant="outline"
                  className="w-full h-auto p-4 flex flex-col items-center gap-2"
                  onClick={() => handleSync('guardians')}
                  disabled={isSyncing}
                >
                  <Users className="w-5 h-5 text-purple-600" />
                  <div className="text-center">
                    <p className="font-medium text-sm">Link Parents</p>
                    <p className="text-xs text-gray-600">Connect guardians</p>
                  </div>
                </Button>
              </motion.div>
            </div>

            {isSyncing && (
              <div className="flex items-center justify-center gap-2 text-sm text-gray-600 py-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Syncing data from Google Classroom...</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
