import { apiClient } from '../core/client';
import type { GraphEdge, GraphNode } from './types';

export const GraphService = {
  getNodes: () => apiClient.get<GraphNode[]>('/api/graph/nodes'),
  getEdges: () => apiClient.get<GraphEdge[]>('/api/graph/edges'),
};
