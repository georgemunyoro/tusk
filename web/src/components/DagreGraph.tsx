import dagre from "@dagrejs/dagre";
import {
  addEdge,
  Background,
  ConnectionLineType,
  Handle,
  type Node,
  type NodeProps,
  Position,
  type ReactFlowInstance,
  ReactFlow,
  type Edge,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { treeToFlow } from "../utils";
import type { TreeNode } from "./TreeRenderer";

const nodeWidth = 180;
const nodeHeight = 36;

type LabelNodeData = {
  label: string;
};

type LabelNode = Node<LabelNodeData, "labelNode">;

function LabelNode({ data }: NodeProps<LabelNode>) {
  return (
    <div
      className="relative flex items-center justify-center rounded-md border border-slate-600/70 bg-slate-800/70 px-2 py-1 text-xs text-zinc-100 shadow-[0_6px_18px_-10px_rgba(15,23,42,0.45)]"
      style={{ width: nodeWidth, height: nodeHeight }}
      title={data.label}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ opacity: 0, pointerEvents: "none" }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ opacity: 0, pointerEvents: "none" }}
      />
      <div className="truncate font-mono">{data.label}</div>
    </div>
  );
}

const getLayoutedElements = (
  nodes: LabelNode[],
  edges: Edge[],
  direction = "TB"
) => {
  const isHorizontal = direction === "LR";
  const dagreGraph = new dagre.graphlib.Graph()
    .setGraph({
      rankdir: direction,
      ranksep: 80,
      nodesep: 60,
    })
    .setDefaultEdgeLabel(() => ({}));

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const newNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const newNode = {
      ...node,
      targetPosition: isHorizontal ? Position.Left : Position.Top,
      sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
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
  const flow = useMemo(() => treeToFlow(node), [node]);
  const baseNodes: LabelNode[] = useMemo(
    () =>
      flow.nodes.map((item) => ({
        ...item,
        data: { label: String(item.data.label) },
        type: "labelNode",
      })),
    [flow.nodes]
  );
  const layouted = useMemo(
    () => getLayoutedElements(baseNodes, flow.edges),
    [baseNodes, flow.edges]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState<LabelNode>(
    layouted.nodes
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(layouted.edges);
  const [rfInstance, setRfInstance] = useState<
    ReactFlowInstance<LabelNode, Edge> | null
  >(null);

  useEffect(() => {
    setNodes(layouted.nodes as any);
    setEdges(layouted.edges);
    if (rfInstance) {
      requestAnimationFrame(() => {
        rfInstance.fitView({ padding: 0.2, duration: 200 });
      });
    }
  }, [layouted.nodes, layouted.edges, setNodes, setEdges, rfInstance]);

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
    <ReactFlow<LabelNode, Edge>
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onInit={setRfInstance}
      connectionLineType={ConnectionLineType.Bezier}
      colorMode="dark"
      nodesDraggable
      nodesConnectable={false}
      nodeTypes={{ labelNode: LabelNode }}
      defaultEdgeOptions={{
        type: ConnectionLineType.Bezier,
        style: { stroke: "#64748b", strokeWidth: 1.5 },
      }}
      fitViewOptions={{ padding: 0.2 }}
      fitView
    >
      <Background color="#1f2937" gap={24} />
    </ReactFlow>
  );
}
