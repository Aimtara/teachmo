import { useState } from 'react';
import { Button, Card, Input, Select } from '@/components/ui';
import { SisService } from '@/services/integrations/sisService';

const DEFAULT_SIS_CONFIG = {
  type: 'oneroster',
  baseUrl: '',
  clientId: '',
  clientSecret: ''
};

export default function IntegrationSettings() {
  const [sisConfig, setSisConfig] = useState(DEFAULT_SIS_CONFIG);
  const [testStatus, setTestStatus] = useState('idle');

  const handleTestConnection = async () => {
    setTestStatus('testing');
    const success = await SisService.testConnection(sisConfig);
    setTestStatus(success ? 'success' : 'error');
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">School Integrations</h1>
        <p className="text-sm text-muted-foreground">
          Configure SIS and LMS connections to automate rostering and launch Teachmo from your LMS.
        </p>
      </div>

      <Card className="p-6 space-y-4">
        <div>
          <h2 className="text-xl font-semibold">SIS Configuration</h2>
          <p className="text-sm text-muted-foreground">
            Connect OneRoster-compatible systems like PowerSchool or Infinite Campus.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700" htmlFor="sis-type">
              SIS Type
            </label>
            <Select
              id="sis-type"
              value={sisConfig.type}
              onChange={(event) => setSisConfig({ ...sisConfig, type: event.target.value })}
            >
              <option value="oneroster">OneRoster API</option>
              <option value="powerschool">PowerSchool</option>
              <option value="infinite_campus">Infinite Campus</option>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700" htmlFor="sis-base-url">
              Base URL
            </label>
            <Input
              id="sis-base-url"
              value={sisConfig.baseUrl}
              onChange={(event) => setSisConfig({ ...sisConfig, baseUrl: event.target.value })}
              placeholder="https://district.example.com/oneroster"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700" htmlFor="sis-client-id">
              Client ID
            </label>
            <Input
              id="sis-client-id"
              value={sisConfig.clientId}
              onChange={(event) => setSisConfig({ ...sisConfig, clientId: event.target.value })}
              placeholder="client-id"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700" htmlFor="sis-client-secret">
              Client Secret
            </label>
            <Input
              id="sis-client-secret"
              type="password"
              value={sisConfig.clientSecret}
              onChange={(event) => setSisConfig({ ...sisConfig, clientSecret: event.target.value })}
              placeholder="••••••••"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Button onClick={handleTestConnection} disabled={testStatus === 'testing'}>
            {testStatus === 'testing' ? 'Testing...' : 'Test Connection'}
          </Button>
          {testStatus === 'success' && (
            <span className="text-sm text-green-600">Connection Successful!</span>
          )}
          {testStatus === 'error' && (
            <span className="text-sm text-red-600">Connection Failed</span>
          )}
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <div>
          <h2 className="text-xl font-semibold">LTI 1.3 Configuration</h2>
          <p className="text-sm text-muted-foreground">
            Use these URLs to configure Teachmo as an external tool in your LMS (Canvas, Schoology).
          </p>
        </div>
        <div className="space-y-2 rounded bg-gray-50 p-4 text-sm">
          <div>
            <span className="font-semibold">Tool URL:</span> https://api.teachmo.com/lti/launch
          </div>
          <div>
            <span className="font-semibold">Login URL:</span> https://api.teachmo.com/lti/login
          </div>
          <div>
            <span className="font-semibold">Public Keys:</span> https://api.teachmo.com/.well-known/jwks.json
          </div>
        </div>
      </Card>
    </div>
  );
}
