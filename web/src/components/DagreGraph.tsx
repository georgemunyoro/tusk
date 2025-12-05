import dagre from "@dagrejs/dagre";
import {
  addEdge,
  Background,
  ConnectionLineType,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import { useCallback } from "react";
import { treeToFlow } from "../utils";
import type { TreeNode } from "./TreeRenderer";

const dagreGraph = new dagre.graphlib.Graph()
  .setGraph({})
  .setDefaultEdgeLabel(() => ({}));

const nodeWidth = 172;
const nodeHeight = 36;

const getLayoutedElements = (nodes: any[], edges: any[], direction = "TB") => {
  const isHorizontal = direction === "LR";
  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node: { id: string }) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach(
    (edge: {
      source: dagre.Edge;
      target: string | { [key: string]: any } | undefined;
    }) => {
      dagreGraph.setEdge(edge.source, edge.target);
    }
  );

  dagre.layout(dagreGraph);

  const newNodes = nodes.map((node: { id: string | dagre.Label }) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const newNode = {
      ...node,
      targetPosition: isHorizontal ? "left" : "top",
      sourcePosition: isHorizontal ? "right" : "bottom",
      // We are shifting the dagre node position (anchor=center center) to the top left
      // so it matches the React Flow node anchor point (top left).
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };

    return newNode;
  });

  return { nodes: newNodes, edges };
};

export function TreeDagre({ node }: { node: TreeNode }) {
  const { nodes: _nodes, edges: _edges } = treeToFlow(node);

  const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
    _nodes,
    _edges
  );

  const [nodes, _setNodes, onNodesChange] = useNodesState(layoutedNodes as any);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges);

  const onConnect = useCallback(
    (params: any) =>
      setEdges((eds) =>
        addEdge(
          { ...params, type: ConnectionLineType.SmoothStep, animated: true },
          eds
        )
      ),
    []
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      connectionLineType={ConnectionLineType.SmoothStep}
      colorMode="dark"
      fitView
    >
      <Background />
    </ReactFlow>
  );
}
