import { apiClient } from '../core/client';
import type { LearningObjective } from './types';

export const LearningService = {
  getObjectives: () => apiClient.get<LearningObjective[]>('/api/learning/objectives'),
};
