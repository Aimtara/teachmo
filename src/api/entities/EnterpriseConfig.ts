export type EnterpriseConfigData = {
  id?: string;
  name?: string;
  [key: string]: unknown;
};

export class EnterpriseConfig {
  id?: string;
  name?: string;
  [key: string]: unknown;

  constructor(data: EnterpriseConfigData = {}) {
    Object.assign(this, data);
  }

  static async fetch(): Promise<EnterpriseConfig> {
    return new EnterpriseConfig({ id: 'demo', name: 'Demo Enterprise' });
  }
}

export default EnterpriseConfig;
