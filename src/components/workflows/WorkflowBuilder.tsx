import { useCallback, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
} from 'react-flow-renderer';
import 'react-flow-renderer/dist/style.css';

const initialNodes = [
  { id: 'start', type: 'input', data: { label: 'Start' }, position: { x: 50, y: 100 } },
  { id: 'step-1', data: { label: 'Collect Intent' }, position: { x: 250, y: 60 } },
  { id: 'condition-1', data: { label: 'Eligible?' }, position: { x: 460, y: 100 } },
  { id: 'step-2', data: { label: 'Send Reminder' }, position: { x: 680, y: 40 } },
  { id: 'step-3', data: { label: 'Escalate to Staff' }, position: { x: 680, y: 180 } },
];

const initialEdges = [
  { id: 'start-step-1', source: 'start', target: 'step-1', type: 'smoothstep' },
  { id: 'step-1-condition-1', source: 'step-1', target: 'condition-1', type: 'smoothstep' },
  { id: 'condition-yes', source: 'condition-1', target: 'step-2', label: 'Yes', type: 'smoothstep' },
  { id: 'condition-no', source: 'condition-1', target: 'step-3', label: 'No', type: 'smoothstep' },
];

export const WorkflowBuilder = () => {
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);

  const onNodesChange = useCallback(
    (changes) => setNodes((currentNodes) => applyNodeChanges(changes, currentNodes)),
    []
  );
  const onEdgesChange = useCallback(
    (changes) => setEdges((currentEdges) => applyEdgeChanges(changes, currentEdges)),
    []
  );
  const onConnect = useCallback(
    (params) => setEdges((currentEdges) => addEdge(params, currentEdges)),
    []
  );

  return (
    <div className="w-full h-[600px] bg-white border rounded-lg shadow p-4">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
      >
        <MiniMap />
        <Controls />
        <Background />
      </ReactFlow>
    </div>
  );
};

export default WorkflowBuilder;
