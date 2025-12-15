export class EnterpriseConfig {
  constructor(data = {}) {
    Object.assign(this, data);
  }

  static async fetch() {
    return new EnterpriseConfig({ id: 'demo', name: 'Demo Enterprise' });
  }

  static async filter(params = {}) {
    // For demo purposes, return an array with a single instance
    return [new EnterpriseConfig({ id: 'demo', name: 'Demo Enterprise', ...params })];
  }

  static async create(data = {}) {
    // For demo purposes, return a new instance with provided data and a mock id
    return new EnterpriseConfig({ id: 'created', ...data });
  }

  static async update(id, data = {}) {
    // For demo purposes, return an updated instance with provided id and data
    return new EnterpriseConfig({ id, ...data });
  }
}

export default EnterpriseConfig;
