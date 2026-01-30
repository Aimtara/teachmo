import React from 'react';
import { Database, Globe, Key, Server } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ServiceConnect from '@/components/integration/ServiceConnect';

export default function AdminLMSIntegration() {
  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-gray-900">Integrations &amp; Data</h1>
        <p className="text-gray-600">
          Configure LTI providers, xAPI stores, and third-party content services.
        </p>
      </header>

      <Tabs defaultValue="lti" className="w-full">
        <TabsList>
          <TabsTrigger value="lti">LTI Tool Providers</TabsTrigger>
          <TabsTrigger value="xapi">xAPI (LRS)</TabsTrigger>
          <TabsTrigger value="services">Content Services</TabsTrigger>
        </TabsList>

        <TabsContent value="lti" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" /> LTI 1.3 Configuration
              </CardTitle>
              <CardDescription>
                Add Teachmo as a tool in Canvas, Schoology, or Blackboard.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Tool Launch URL</Label>
                  <Input
                    readOnly
                    value="https://api.teachmo.com/lti/launch"
                    className="bg-gray-50"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Public JWKS URL</Label>
                  <Input
                    readOnly
                    value="https://api.teachmo.com/.well-known/jwks.json"
                    className="bg-gray-50"
                  />
                </div>
              </div>
              <div className="pt-4 border-t">
                <h4 className="font-medium mb-4">Register New Platform</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Platform Issuer (ISS)</Label>
                    <Input placeholder="https://canvas.instructure.com" />
                  </div>
                  <div className="space-y-2">
                    <Label>Client ID</Label>
                    <Input placeholder="10000000000001" />
                  </div>
                </div>
                <Button className="mt-4">Save Platform Configuration</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="xapi" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" /> Learning Record Store (LRS)
              </CardTitle>
              <CardDescription>
                Configure where xAPI statements for student activities should be
                sent.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>LRS Endpoint</Label>
                <Input placeholder="https://lrs.io/xapi/statements" />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Auth Key / Username</Label>
                  <Input placeholder="Basic Auth Username" />
                </div>
                <div className="space-y-2">
                  <Label>Auth Secret / Password</Label>
                  <Input type="password" placeholder="••••••••••••" />
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Button>Save Configuration</Button>
                <Button variant="outline">Test Connection</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services" className="space-y-4 mt-6">
          <ServiceConnect
            serviceKey="khan_academy"
            serviceName="Khan Academy"
            icon={Globe}
          />
          <ServiceConnect
            serviceKey="clever"
            serviceName="Clever (District)"
            icon={Server}
            connected
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
