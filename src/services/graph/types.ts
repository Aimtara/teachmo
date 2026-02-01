export interface GraphNode {
  id: string;
  label: string;
  [key: string]: unknown;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  [key: string]: unknown;
}
