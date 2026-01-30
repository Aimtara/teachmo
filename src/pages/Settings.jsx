import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/components/hooks/useAuth';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import GoogleClassroomConnect from '@/components/integration/GoogleClassroomConnect';
import { Settings as SettingsIcon, Link as LinkIcon, Bell, Lock } from 'lucide-react';

export default function Settings() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'general';

  const handleTabChange = (value) => {
    setSearchParams({ tab: value });
  };

  return (
    <ProtectedRoute allowedRoles={['parent', 'teacher', 'school_admin', 'district_admin', 'system_admin']} requireAuth={true}>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <header>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
            <p className="text-gray-600">Manage your account preferences and integrations</p>
          </header>

          <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
            <div className="border-b border-gray-200">
              <TabsList className="bg-transparent h-auto p-0 space-x-6">
                <TabsTrigger
                  value="general"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:shadow-none rounded-none px-2 py-3 bg-transparent hover:bg-transparent"
                >
                  <SettingsIcon className="w-4 h-4 mr-2" />
                  General
                </TabsTrigger>
                <TabsTrigger
                  value="integrations"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:shadow-none rounded-none px-2 py-3 bg-transparent hover:bg-transparent"
                >
                  <LinkIcon className="w-4 h-4 mr-2" />
                  Integrations
                </TabsTrigger>
                <TabsTrigger
                  value="notifications"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:shadow-none rounded-none px-2 py-3 bg-transparent hover:bg-transparent"
                >
                  <Bell className="w-4 h-4 mr-2" />
                  Notifications
                </TabsTrigger>
                <TabsTrigger
                  value="privacy"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:shadow-none rounded-none px-2 py-3 bg-transparent hover:bg-transparent"
                >
                  <Lock className="w-4 h-4 mr-2" />
                  Privacy
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="mt-6">
              <TabsContent value="general" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>General Settings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">General settings will be implemented here.</p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="integrations" className="mt-0">
                <div className="space-y-6">
                  <GoogleClassroomConnect user={user} />
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Other Integrations</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-600">Additional integrations will be available here soon.</p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="notifications" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Notification Preferences</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">Notification settings will be implemented here.</p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="privacy" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Privacy Settings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">Privacy settings will be implemented here.</p>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </ProtectedRoute>
  );
}
