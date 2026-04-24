"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  ReactFlow,
  Controls,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
} from "@xyflow/react";
import dagre from "dagre";
import "@xyflow/react/dist/style.css";
import WorkflowNodeComponent, { type WorkflowNodeData } from "./workflow-node";
import { type WorkflowNode } from "@/lib/hooks/use-executions";
import { apiClient } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";

const NODE_WIDTH = 230;
const NODE_HEIGHT = 110;

const statusEdgeColor: Record<string, string> = {
  success: "#a8b545",
  failed: "#d4734a",
  running: "#e8b44a",
  pending: "#8a8a80",
};

const nodeTypes = { workflowNode: WorkflowNodeComponent };

function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "LR", nodesep: 40, ranksep: 60 });

  nodes.forEach((node) => {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  dagre.layout(g);

  const layoutedNodes = nodes.map((node) => {
    const pos = g.node(node.id);
    return {
      ...node,
      position: {
        x: pos.x - NODE_WIDTH / 2,
        y: pos.y - NODE_HEIGHT / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}

interface WorkflowGraphProps {
  workflowNodes: WorkflowNode[];
  currentExecutionId: string;
  projectId: string;
}

export function WorkflowGraph({
  workflowNodes,
  currentExecutionId,
  projectId,
}: WorkflowGraphProps) {
  const queryClient = useQueryClient();
  const [expandedNodeId, setExpandedNodeId] = useState<string | null>(null);

  const handleRetry = useCallback(
    async (jobId: string, payload?: any) => {
      await apiClient.post(
        `/api/v1/projects/${projectId}/jobs/${jobId}/run`,
        payload !== undefined ? { payload } : undefined,
      );
      queryClient.invalidateQueries({ queryKey: ["workflow"] });
      queryClient.invalidateQueries({ queryKey: ["executions"] });
    },
    [projectId, queryClient],
  );

  const handleNodeClick = useCallback((_: any, node: Node) => {
    setExpandedNodeId((prev) => (prev === node.id ? null : node.id));
  }, []);

  const handleNavigate = useCallback((executionId: string) => {
    const row = document.querySelector(`tr[data-row-id="${executionId}"]`);
    if (row) {
      (row as HTMLElement).click();
      row.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, []);

  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    const rfNodes: Node[] = workflowNodes.map((node) => ({
      id: node.id,
      type: "workflowNode",
      position: { x: 0, y: 0 },
      data: {
        ...node,
        isCurrent: node.id === currentExecutionId,
        isExpanded: node.id === expandedNodeId,
        onRetry: handleRetry,
        onNavigate: handleNavigate,
      } as WorkflowNodeData,
    }));

    const rfEdges: Edge[] = workflowNodes
      .filter((n) => n.parentId)
      .map((node) => ({
        id: `${node.parentId}-${node.id}`,
        source: node.parentId!,
        target: node.id,
        style: {
          stroke: statusEdgeColor[node.status] || "#8a8a80",
          strokeDasharray: "6 3",
        },
        animated: node.status === "running",
      }));

    return getLayoutedElements(rfNodes, rfEdges);
  }, [workflowNodes, currentExecutionId, expandedNodeId, handleRetry, handleNavigate]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync node data (expand/collapse, status changes) while preserving drag positions
  useEffect(() => {
    setNodes((prev) =>
      initialNodes.map((newNode) => {
        const existing = prev.find((n) => n.id === newNode.id);
        return existing
          ? { ...newNode, position: existing.position }
          : newNode;
      }),
    );
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  return (
    <div style={{ height: 450 }} className="w-full workflow-graph-dark">
      <style>{`
        .workflow-graph-dark .react-flow__controls {
          background: #1e1e1a;
          border: 1px solid #3a3a35;
          border-radius: 6px;
          box-shadow: none;
        }
        .workflow-graph-dark .react-flow__controls button {
          background: #1e1e1a;
          border-color: #3a3a35;
          fill: #8a8a80;
        }
        .workflow-graph-dark .react-flow__controls button:hover {
          background: #2a2a25;
          fill: #f5f5f0;
        }
        .workflow-graph-dark .react-flow__controls button svg {
          fill: inherit;
        }
        .workflow-graph-dark .react-flow__node {
          cursor: grab;
        }
        .workflow-graph-dark .react-flow__node:active {
          cursor: grabbing;
        }
      `}</style>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        fitView
        proOptions={{ hideAttribution: true }}
        nodesDraggable
        nodesConnectable={false}
        panOnDrag
        zoomOnScroll
        minZoom={0.3}
        maxZoom={1.5}
      >
        <Controls
          showInteractive={false}
          position="bottom-right"
        />
      </ReactFlow>
    </div>
  );
}
