'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useTranslation } from 'react-i18next';
import Image from 'next/image';
import {
  Users,
  MessageSquare,
  Calendar,
  Heart,
  ShoppingBag,
  BookOpen,
  Wrench,
  X,
} from 'lucide-react';

interface ResidentNode {
  id: string;
  name: string;
  avatar?: string;
  role?: string;
  interests?: string[];
}

interface Connection {
  source: string;
  target: string;
  type: 'group' | 'interest' | 'message' | 'booking';
  label?: string;
}

interface CommunityGraphWidgetProps {
  residents?: ResidentNode[];
  connections?: Connection[];
  loading?: boolean;
}

const nodeColors: Record<string, string> = {
  resident: '#4F46E5',
  group: '#F59E0B',
  interest: '#10B981',
  event: '#8B5CF6',
  booking: '#EC4899',
  maintenance: '#EF4444',
  marketplace: '#14B8A6',
};

function ResidentNode({ data }: { data: ResidentNode & { color?: string } }) {
  const initials = data.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex items-center gap-3 bg-white rounded-full px-4 py-2 shadow-lg border-2 border-indigo-500 min-w-[140px]">
      {data.avatar ? (
        <Image
          src={data.avatar}
          alt={data.name}
          width={32}
          height={32}
          className="w-8 h-8 rounded-full object-cover"
          unoptimized
        />
      ) : (
        <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold">
          {initials}
        </div>
      )}
      <div className="flex flex-col">
        <span className="text-sm font-semibold text-gray-900 leading-tight">{data.name}</span>
        {data.role && <span className="text-xs text-gray-500">{data.role}</span>}
      </div>
    </div>
  );
}

function GroupNode({ data }: { data: { label: string; type: string } }) {
  const iconMap: Record<string, typeof Users> = {
    group: Users,
    interest: Heart,
    event: Calendar,
    booking: BookOpen,
    maintenance: Wrench,
    marketplace: ShoppingBag,
  };
  const Icon = iconMap[data.type] || Users;

  return (
    <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 shadow-md border-2 border-amber-500 min-w-[100px]">
      <Icon className="w-4 h-4 text-amber-500" />
      <span className="text-sm font-medium text-gray-800">{data.label}</span>
    </div>
  );
}

export function CommunityGraphWidget({
  residents = [],
  connections = [],
  loading = false,
}: CommunityGraphWidgetProps) {
  const { t } = useTranslation();
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const nodeTypes: NodeTypes = useMemo(
    () => ({
      resident: ResidentNode,
      group: GroupNode,
    }),
    []
  );

  const { initialNodes, initialEdges } = useMemo(() => {
    if (residents.length === 0) {
      return { initialNodes: [], initialEdges: [] };
    }

    const nodes: Node[] = [];
    const edges: Edge[] = [];

    const centerX = 400;
    const centerY = 300;
    const radius = 200;

    residents.forEach((resident, index) => {
      const angle = (2 * Math.PI * index) / residents.length;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);

      nodes.push({
        id: resident.id,
        type: 'resident',
        position: { x, y },
        data: { ...resident, color: nodeColors.resident },
      });
    });

    const groupNodes: Record<string, { label: string; type: string; x: number; y: number }> = {};

    connections.forEach((conn, index) => {
      const edgeId = `edge-${conn.source}-${conn.target}-${conn.type}`;

      const edgeColor = nodeColors[conn.type] || nodeColors.resident;

      edges.push({
        id: edgeId,
        source: conn.source,
        target: conn.target,
        type: 'smoothstep',
        animated: conn.type === 'message',
        style: {
          stroke: edgeColor,
          strokeWidth: conn.type === 'interest' ? 2 : 1,
          strokeDasharray: conn.type === 'group' ? '5,5' : undefined,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: edgeColor,
        },
        label: conn.label,
        labelStyle: { fontSize: 10, fill: '#6B7280' },
      });

      if (!groupNodes[conn.type]) {
        const groupX = centerX + radius * 0.6 * Math.cos((index * Math.PI) / 4);
        const groupY = centerY + radius * 0.6 * Math.sin((index * Math.PI) / 4);
        groupNodes[conn.type] = {
          label: conn.type.charAt(0).toUpperCase() + conn.type.slice(1) + 's',
          type: conn.type,
          x: groupX,
          y: groupY,
        };
      }
    });

    Object.values(groupNodes).forEach(group => {
      nodes.push({
        id: group.type,
        type: 'group',
        position: { x: group.x, y: group.y },
        data: { label: group.label, type: group.type },
      });
    });

    return { initialNodes: nodes, initialEdges: edges };
  }, [residents, connections]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  const onNodeClick = useCallback((_: unknown, node: Node) => {
    setSelectedNode(node.id);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-xl">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (residents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-xl p-6">
        <Users className="w-12 h-12 text-gray-400 mb-3" />
        <p className="text-gray-500 text-center">
          {t('directory.noResidents') || 'No residents to display'}
        </p>
        <p className="text-gray-400 text-sm mt-1">
          Connect with neighbors to see your community graph
        </p>
      </div>
    );
  }

  const selectedResident = selectedNode ? residents.find(r => r.id === selectedNode) : null;

  return (
    <div className="relative">
      <div className="h-[400px] bg-gray-50 rounded-xl overflow-hidden">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.3}
          maxZoom={2}
        >
          <Background color="#E5E7EB" gap={20} />
          <Controls className="bg-white rounded-lg shadow-md border border-gray-200" />
          <MiniMap
            className="bg-white rounded-lg shadow-md border border-gray-200"
            nodeColor={nodeColors.resident}
            maskColor="rgba(255, 255, 255, 0.8)"
          />
        </ReactFlow>
      </div>

      {selectedResident && (
        <div className="absolute top-4 right-4 bg-white rounded-lg shadow-xl border border-gray-200 p-4 w-64 z-50">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-gray-900">{selectedResident.name}</h4>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {selectedResident.role && (
            <p className="text-sm text-gray-600 mb-2">{selectedResident.role}</p>
          )}
          {selectedResident.interests && selectedResident.interests.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {selectedResident.interests.slice(0, 3).map((interest, i) => (
                <span
                  key={i}
                  className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full"
                >
                  {interest}
                </span>
              ))}
              {selectedResident.interests.length > 3 && (
                <span className="text-xs text-gray-500">
                  +{selectedResident.interests.length - 3}
                </span>
              )}
            </div>
          )}
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <MessageSquare className="w-4 h-4" />
              <span>
                {
                  connections.filter(
                    c => c.source === selectedResident.id || c.target === selectedResident.id
                  ).length
                }{' '}
                connections
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-600">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
          <span>Resident</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-amber-500"></div>
          <span>Group</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span>Interest</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-purple-500"></div>
          <span>Event</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-pink-500"></div>
          <span>Booking</span>
        </div>
      </div>
    </div>
  );
}
