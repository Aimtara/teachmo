export class EnterpriseConfig {
  constructor(data = {}) {
    Object.assign(this, data);
  }

  static async fetch() {
    return new EnterpriseConfig({ id: 'demo', name: 'Demo Enterprise' });
  }
}

export default EnterpriseConfig;
