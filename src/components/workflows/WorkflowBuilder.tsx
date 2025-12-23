import { useState } from 'react';
import ReactFlow, { Background, Controls, MiniMap } from 'react-flow-renderer';
import 'react-flow-renderer/dist/style.css';

const initialNodes = [
  { id: '1', type: 'input', data: { label: 'Start' }, position: { x: 100, y: 100 } },
  { id: '2', data: { label: 'Send Reminder' }, position: { x: 300, y: 100 } },
];

const initialEdges = [{ id: 'e1-2', source: '1', target: '2', type: 'smoothstep' }];

export const WorkflowBuilder = () => {
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);

  return (
    <div className="w-full h-[600px] bg-white border rounded-lg shadow p-4">
      <ReactFlow nodes={nodes} edges={edges} onNodesChange={setNodes} onEdgesChange={setEdges} fitView>
        <MiniMap />
        <Controls />
        <Background />
      </ReactFlow>
    </div>
  );
};

export default WorkflowBuilder;
