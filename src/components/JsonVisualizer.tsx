import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Copy, FileText, ZoomIn, ZoomOut, RotateCcw, ExternalLink, Image, Play, Volume2, ChevronRight, ChevronDown, X, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ExportMenu } from './ExportMenu';
import { exportAsImage, exportAsPDF, exportAsHTML } from '@/utils/exportUtils';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';

interface GraphNode {
  id: string;
  key: string;
  value: any;
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null' | 'root';
  x: number;
  y: number;
  width: number;
  height: number;
  children: string[];
  parent?: string;
  level: number;
  isExpanded: boolean;
}

interface GraphEdge {
  from: string;
  to: string;
  fromSide: 'right' | 'bottom';
  toSide: 'left' | 'top';
}

export default function JsonVisualizer() {
  const [jsonInput, setJsonInput] = useState('');
  const [zoom, setZoom] = useState(0.8);
  const [pan, setPan] = useState({ x: 50, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  const isBase64Image = (str: string): boolean => {
    return typeof str === 'string' && str.startsWith('data:image/');
  };

  const isBase64Audio = (str: string): boolean => {
    return typeof str === 'string' && str.startsWith('data:audio/');
  };

  const isBase64Video = (str: string): boolean => {
    return typeof str === 'string' && str.startsWith('data:video/');
  };

  const isUrl = (str: string): boolean => {
    try {
      const url = new URL(str);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const toggleNodeExpansion = useCallback((nodeId: string) => {
    setExpandedNodes(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(nodeId)) {
        newExpanded.delete(nodeId);
      } else {
        newExpanded.add(nodeId);
      }
      return newExpanded;
    });
  }, []);

  const collapseAllNodes = useCallback(() => {
    setExpandedNodes(new Set());
    setSelectedNode(null);
  }, []);

  // Enhanced zoom functionality with reduced sensitivity
  const handleWheel = useCallback((e: WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.95 : 1.05; // Reduced sensitivity from 0.9/1.1 to 0.95/1.05
      setZoom(prev => Math.max(0.1, Math.min(3, prev * delta)));
    }
  }, []);

  // Touch/gesture support for mobile with reduced sensitivity
  const [lastTouchDistance, setLastTouchDistance] = useState<number | null>(null);

  const getTouchDistance = (touches: TouchList) => {
    if (touches.length < 2) return null;
    const touch1 = touches[0];
    const touch2 = touches[1];
    return Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) + 
      Math.pow(touch2.clientY - touch1.clientY, 2)
    );
  };

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length === 2) {
      const distance = getTouchDistance(e.touches);
      setLastTouchDistance(distance);
    }
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (e.touches.length === 2 && lastTouchDistance) {
      e.preventDefault();
      const distance = getTouchDistance(e.touches);
      if (distance) {
        // Reduced sensitivity by dampening the scale factor
        const rawScale = distance / lastTouchDistance;
        const dampedScale = 1 + (rawScale - 1) * 0.3; // Dampen by 70%
        setZoom(prev => Math.max(0.1, Math.min(3, prev * dampedScale)));
        setLastTouchDistance(distance);
      }
    }
  }, [lastTouchDistance]);

  const handleTouchEnd = useCallback(() => {
    setLastTouchDistance(null);
  }, []);

  // Double-tap to zoom
  const [lastTap, setLastTap] = useState(0);
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if (e.target === svgRef.current) {
      const now = Date.now();
      if (now - lastTap < 300) {
        setZoom(prev => prev === 1 ? 0.5 : 1);
        setPan({ x: 50, y: 50 });
      }
      setLastTap(now);
    }
  }, [lastTap]);

  // Recenter function
  const handleRecenter = useCallback(() => {
    setZoom(0.8);
    setPan({ x: 50, y: 50 });
    setSelectedNode(null);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
      container.addEventListener('touchstart', handleTouchStart, { passive: false });
      container.addEventListener('touchmove', handleTouchMove, { passive: false });
      container.addEventListener('touchend', handleTouchEnd);

      return () => {
        container.removeEventListener('wheel', handleWheel);
        container.removeEventListener('touchstart', handleTouchStart);
        container.removeEventListener('touchmove', handleTouchMove);
        container.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [handleWheel, handleTouchStart, handleTouchMove, handleTouchEnd]);

  const createGraph = (obj: any): { nodes: GraphNode[]; edges: GraphEdge[] } => {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    let nodeId = 0;

    const traverse = (value: any, key: string, parentId?: string, level: number = 0): string => {
      const currentId = `node-${nodeId++}`;
      const type = Array.isArray(value) ? 'array' : 
                   value === null ? 'null' : 
                   typeof value;

      const isExpanded = expandedNodes.has(currentId);
      const hasChildren = (type === 'object' && value !== null && Object.keys(value).length > 0) || 
                         (type === 'array' && value.length > 0);

      const baseWidth = 220;
      const baseHeight = 100;
      let extraHeight = 0;

      // Show object/array keys when expanded
      if (hasChildren && isExpanded) {
        const keys = type === 'object' ? Object.keys(value) : value.map((_: any, i: number) => `[${i}]`);
        extraHeight = Math.min(keys.length * 25, 150);
      }

      const node: GraphNode = {
        id: currentId,
        key,
        value,
        type: type as GraphNode['type'],
        x: 0,
        y: 0,
        width: baseWidth,
        height: baseHeight + extraHeight,
        children: [],
        parent: parentId,
        level,
        isExpanded
      };

      nodes.push(node);

      if (parentId) {
        edges.push({ 
          from: parentId, 
          to: currentId,
          fromSide: 'right',
          toSide: 'left'
        });
        const parentNode = nodes.find(n => n.id === parentId);
        if (parentNode) {
          parentNode.children.push(currentId);
        }
      }

      if (hasChildren && isExpanded) {
        if (type === 'object' && value !== null) {
          Object.entries(value).forEach(([childKey, childValue]) => {
            traverse(childValue, childKey, currentId, level + 1);
          });
        } else if (type === 'array') {
          value.forEach((item: any, index: number) => {
            traverse(item, `[${index}]`, currentId, level + 1);
          });
        }
      }

      return currentId;
    };

    if (jsonInput.trim()) {
      try {
        const parsed = JSON.parse(jsonInput);
        traverse(parsed, 'root', undefined, 0);
      } catch {
        // Invalid JSON
      }
    }

    // Position nodes in a hierarchical layout
    const positionNodes = () => {
      const levelGroups: { [level: number]: GraphNode[] } = {};
      nodes.forEach(node => {
        if (!levelGroups[node.level]) levelGroups[node.level] = [];
        levelGroups[node.level].push(node);
      });

      const levelWidth = 300;
      let currentY = 50;

      Object.entries(levelGroups).forEach(([level, levelNodes]) => {
        const levelNum = parseInt(level);
        const x = levelNum * levelWidth + 50;
        
        levelNodes.forEach((node, index) => {
          node.x = x;
          node.y = currentY;
          currentY += node.height + 30;
        });
      });
    };

    positionNodes();
    return { nodes, edges };
  };

  const { nodes, edges } = useMemo(() => createGraph(jsonInput), [jsonInput, expandedNodes]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === svgRef.current) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev * 1.2, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev / 1.2, 0.1));
  const handleResetView = () => {
    setZoom(0.8);
    setPan({ x: 50, y: 50 });
  };

  const getNodeColor = (type: GraphNode['type']) => {
    switch (type) {
      case 'object': return { bg: 'hsl(var(--primary))', border: 'hsl(var(--primary))', text: 'hsl(var(--primary-foreground))' };
      case 'array': return { bg: 'hsl(var(--chart-2))', border: 'hsl(var(--chart-2))', text: 'white' };
      case 'string': return { bg: 'hsl(var(--chart-3))', border: 'hsl(var(--chart-3))', text: 'white' };
      case 'number': return { bg: 'hsl(var(--chart-4))', border: 'hsl(var(--chart-4))', text: 'white' };
      case 'boolean': return { bg: 'hsl(var(--chart-5))', border: 'hsl(var(--chart-5))', text: 'white' };
      case 'null': return { bg: 'hsl(var(--muted))', border: 'hsl(var(--muted))', text: 'hsl(var(--muted-foreground))' };
      case 'root': return { bg: 'hsl(var(--chart-1))', border: 'hsl(var(--chart-1))', text: 'white' };
      default: return { bg: 'hsl(var(--muted))', border: 'hsl(var(--muted))', text: 'hsl(var(--muted-foreground))' };
    }
  };

  const formatValue = (value: any, type: GraphNode['type']): string => {
    switch (type) {
      case 'string':
        if (value.length > 30) return `"${value.substring(0, 30)}..."`;
        return `"${value}"`;
      case 'number':
      case 'boolean':
        return value.toString();
      case 'null':
        return 'null';
      case 'object':
        return `{${Object.keys(value).length} keys}`;
      case 'array':
        return `[${value.length} items]`;
      default:
        return '';
    }
  };

  const getObjectPreview = (value: any, type: GraphNode['type']) => {
    if (type === 'object' && value !== null) {
      return Object.entries(value).slice(0, 3).map(([key, val]) => {
        const valType = Array.isArray(val) ? 'array' : val === null ? 'null' : typeof val;
        const preview = valType === 'string' ? `"${val.toString().substring(0, 15)}${val.toString().length > 15 ? '...' : ''}"` : 
                       valType === 'object' ? '{...}' :
                       valType === 'array' ? '[...]' :
                       val?.toString().substring(0, 15);
        return { key, preview, type: valType };
      });
    } else if (type === 'array') {
      return value.slice(0, 3).map((val: any, index: number) => {
        const valType = Array.isArray(val) ? 'array' : val === null ? 'null' : typeof val;
        const preview = valType === 'string' ? `"${val.toString().substring(0, 15)}${val.toString().length > 15 ? '...' : ''}"` : 
                       valType === 'object' ? '{...}' :
                       valType === 'array' ? '[...]' :
                       val?.toString().substring(0, 15);
        return { key: `[${index}]`, preview, type: valType };
      });
    }
    return [];
  };

  const handleNodeClick = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedNode === nodeId) {
      setSelectedNode(null);
    } else {
      setSelectedNode(nodeId);
    }
  };

  const handleUrlClick = (url: string, e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const renderNodeContent = (node: GraphNode) => {
    const isSelected = selectedNode === node.id;
    const colors = getNodeColor(node.type);
    const hasChildren = node.children.length > 0 || 
                       (node.type === 'object' && node.value !== null && Object.keys(node.value).length > 0) ||
                       (node.type === 'array' && node.value.length > 0);

    const objectPreview = getObjectPreview(node.value, node.type);

    return (
      <g key={node.id}>
        {/* Node Card */}
        <rect
          x={node.x}
          y={node.y}
          width={node.width}
          height={node.height}
          fill={colors.bg}
          fillOpacity={0.1}
          stroke={isSelected ? 'hsl(var(--ring))' : colors.border}
          strokeWidth={isSelected ? 2 : 1}
          rx={8}
          className="cursor-pointer transition-all duration-200"
          onClick={(e) => handleNodeClick(node.id, e)}
        />

        {/* Node Header */}
        <rect
          x={node.x}
          y={node.y}
          width={node.width}
          height={40}
          fill={colors.bg}
          fillOpacity={0.2}
          rx={8}
        />

        {/* Close button for selected node */}
        {isSelected && (
          <g
            className="cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedNode(null);
            }}
          >
            <circle
              cx={node.x + node.width - 16}
              cy={node.y + 16}
              r={8}
              fill="rgba(239, 68, 68, 0.2)"
              stroke="#EF4444"
              strokeWidth={1}
            />
            <X 
              x={node.x + node.width - 20} 
              y={node.y + 12} 
              width={8} 
              height={8} 
              className="fill-red-400"
            />
          </g>
        )}

        {/* Expand/Collapse Button */}
        {hasChildren && (
          <g
            className="cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              toggleNodeExpansion(node.id);
            }}
          >
            <circle
              cx={node.x + 16}
              cy={node.y + 20}
              r={8}
              fill={colors.border}
              fillOpacity={0.2}
            />
            {node.isExpanded ? (
              <ChevronDown 
                x={node.x + 12} 
                y={node.y + 16} 
                width={8} 
                height={8} 
                className="fill-white"
              />
            ) : (
              <ChevronRight 
                x={node.x + 12} 
                y={node.y + 16} 
                width={8} 
                height={8} 
                className="fill-white"
              />
            )}
          </g>
        )}

        {/* Node Key */}
        <text
          x={node.x + (hasChildren ? 32 : 12)}
          y={node.y + 25}
          className="fill-foreground text-sm font-semibold"
          textAnchor="start"
        >
          {node.key.length > 20 ? `${node.key.substring(0, 20)}...` : node.key}
        </text>

        {/* Node Type Badge */}
        <rect
          x={node.x + node.width - (isSelected ? 80 : 60)}
          y={node.y + 8}
          width={50}
          height={24}
          fill={colors.border}
          fillOpacity={0.3}
          rx={12}
        />
        <text
          x={node.x + node.width - (isSelected ? 55 : 35)}
          y={node.y + 23}
          className="fill-white text-xs font-medium"
          textAnchor="middle"
        >
          {node.type}
        </text>

        {/* Node Value */}
        <text
          x={node.x + 12}
          y={node.y + 55}
          className="fill-muted-foreground text-xs"
          textAnchor="start"
        >
          {formatValue(node.value, node.type)}
        </text>

        {/* URL Link Indicator */}
        {node.type === 'string' && isUrl(node.value) && (
          <g
            className="cursor-pointer"
            onClick={(e) => handleUrlClick(node.value, e)}
          >
            <circle
              cx={node.x + node.width - 30}
              cy={node.y + 55}
              r={8}
              fill="rgba(59, 130, 246, 0.2)"
              stroke="#3B82F6"
              strokeWidth={1}
            />
            <ExternalLink 
              x={node.x + node.width - 34} 
              y={node.y + 51} 
              width={8} 
              height={8} 
              className="fill-blue-400"
            />
          </g>
        )}

        {/* Base64 Image Indicator */}
        {node.type === 'string' && isBase64Image(node.value) && (
          <g>
            <circle
              cx={node.x + node.width - 30}
              cy={node.y + 55}
              r={8}
              fill="rgba(34, 197, 94, 0.2)"
              stroke="#22C55E"
              strokeWidth={1}
            />
            <Image 
              x={node.x + node.width - 34} 
              y={node.y + 51} 
              width={8} 
              height={8} 
              className="fill-green-400"
            />
          </g>
        )}

        {/* Object/Array Preview */}
        {(node.type === 'object' || node.type === 'array') && (
          <g>
            {objectPreview.map((item, index) => (
              <g key={index}>
                <text
                  x={node.x + 12}
                  y={node.y + 75 + index * 20}
                  className="fill-muted-foreground text-xs"
                  textAnchor="start"
                >
                  <tspan className="fill-foreground font-medium">{item.key}:</tspan>
                  <tspan className="ml-1">{item.preview}</tspan>
                  <tspan className="fill-primary text-xs ml-1">({item.type})</tspan>
                </text>
              </g>
            ))}
            {((node.type === 'object' && Object.keys(node.value).length > 3) || 
              (node.type === 'array' && node.value.length > 3)) && (
              <text
                x={node.x + 12}
                y={node.y + 75 + 3 * 20}
                className="fill-muted-foreground text-xs italic"
                textAnchor="start"
              >
                +{(node.type === 'object' ? Object.keys(node.value).length : node.value.length) - 3} more...
              </text>
            )}
          </g>
        )}
      </g>
    );
  };

  const renderEdges = () => {
    return edges.map((edge, index) => {
      const fromNode = nodes.find(n => n.id === edge.from);
      const toNode = nodes.find(n => n.id === edge.to);
      
      if (!fromNode || !toNode) return null;

      const fromX = fromNode.x + fromNode.width;
      const fromY = fromNode.y + fromNode.height / 2;
      const toX = toNode.x;
      const toY = toNode.y + toNode.height / 2;

      const midX = fromX + (toX - fromX) / 2;

      return (
        <g key={index}>
          <path
            d={`M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`}
            stroke="hsl(var(--border))"
            strokeWidth="2"
            fill="none"
            markerEnd="url(#arrowhead)"
          />
        </g>
      );
    });
  };

  const renderValuePreview = (value: any) => {
    if (typeof value === 'string') {
      if (isBase64Image(value)) {
        return (
          <div className="mt-2">
            <div className="flex items-center space-x-2 mb-2">
              <Image size={16} className="text-green-400" />
              <span className="text-sm text-muted-foreground">Base64 Image</span>
            </div>
            <img 
              src={value} 
              alt="Base64 preview" 
              className="max-w-48 max-h-32 rounded-lg border border-border"
            />
          </div>
        );
      }
      
      if (isBase64Audio(value)) {
        return (
          <div className="mt-2">
            <div className="flex items-center space-x-2 mb-2">
              <Volume2 size={16} className="text-green-400" />
              <span className="text-sm text-muted-foreground">Base64 Audio</span>
            </div>
            <audio controls className="w-full">
              <source src={value} />
            </audio>
          </div>
        );
      }
      
      if (isBase64Video(value)) {
        return (
          <div className="mt-2">
            <div className="flex items-center space-x-2 mb-2">
              <Play size={16} className="text-purple-400" />
              <span className="text-sm text-muted-foreground">Base64 Video</span>
            </div>
            <video controls className="max-w-48 max-h-32 rounded-lg">
              <source src={value} />
            </video>
          </div>
        );
      }
      
      if (isUrl(value)) {
        return (
          <div className="mt-2">
            <button
              onClick={() => window.open(value, '_blank', 'noopener,noreferrer')}
              className="flex items-center space-x-2 text-blue-400 hover:text-blue-300 transition-colors"
            >
              <ExternalLink size={16} />
              <span className="text-sm truncate max-w-48">{value}</span>
            </button>
          </div>
        );
      }
    }
    
    return (
      <div className="mt-2 p-2 bg-muted/20 rounded-lg max-h-48 overflow-auto">
        <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-all">
          {typeof value === 'string' ? `"${value}"` : JSON.stringify(value, null, 2)}
        </pre>
      </div>
    );
  };

  const selectedNodeData = selectedNode ? nodes.find(n => n.id === selectedNode) : null;

  const handleSampleJson = () => {
    const sampleJson = {
      user: {
        name: "John Doe",
        age: 30,
        email: "john@example.com",
        avatar: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMzIiIGN5PSIzMiIgcj0iMzIiIGZpbGw9IiMzQjgyRjYiLz4KPHN2ZyB4PSIxNiIgeT0iMTYiIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiPgo8cGF0aCBkPSJtMjAgMTctMiAyLTYtNi02IDYtMiAyIi8+CjxwYXRoIGQ9Im0xMiAxMy0yIDItNi02LTYgNi0yIDIiLz4KPC9zdmc+Cjwvc3ZnPgo=",
        website: "https://johndoe.dev"
      },
      projects: [
        {
          name: "Portfolio Website",
          status: "completed",
          technologies: ["React", "TypeScript", "Tailwind"]
        },
        {
          name: "Mobile App",
          status: "in-progress",
          technologies: ["React Native", "Expo"]
        }
      ],
      settings: {
        theme: "dark",
        notifications: true,
        privacy: {
          showEmail: false,
          showPhone: true
        }
      },
      metadata: null
    };
    setJsonInput(JSON.stringify(sampleJson, null, 2));
    setExpandedNodes(new Set(['node-0']));
  };

  const handleExport = async (format: 'png' | 'jpg' | 'pdf' | 'html') => {
    if (!exportRef.current) return;

    const filename = `json-visualization-${Date.now()}`;
    
    if (format === 'html') {
      const htmlContent = `
        <h2>JSON Visualization</h2>
        <h3>Input JSON:</h3>
        <pre>${jsonInput}</pre>
        <h3>Graph Structure:</h3>
        <p>Nodes: ${nodes.length}</p>
        <p>Edges: ${edges.length}</p>
        <h3>Node Details:</h3>
        ${nodes.map(node => `
          <div style="margin: 10px 0; padding: 10px; border: 1px solid #ccc; border-radius: 5px;">
            <strong>${node.key}</strong> (${node.type})<br>
            Value: ${typeof node.value === 'string' ? `"${node.value}"` : JSON.stringify(node.value)}
          </div>
        `).join('')}
      `;
      exportAsHTML(htmlContent, filename);
    } else if (format === 'pdf') {
      await exportAsPDF(exportRef.current, filename);
    } else {
      await exportAsImage(exportRef.current, filename, format);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">JSON Graph Visualizer</h2>
            <p className="text-muted-foreground text-sm mt-1">Visualize JSON data as an interactive graph</p>
          </div>
          <div className="flex space-x-2">
            <Button
              onClick={handleSampleJson}
              variant="outline"
              size="sm"
              className="bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30"
            >
              <FileText size={16} className="mr-2" />
              Load Sample
            </Button>
            <Button
              onClick={() => navigator.clipboard.writeText(jsonInput)}
              variant="ghost"
              size="sm"
            >
              <Copy size={16} />
            </Button>
            <ExportMenu 
              onExport={handleExport}
              disabled={nodes.length === 0}
            />
          </div>
        </div>
      </div>

      <div className="flex-1">
        <PanelGroup direction="horizontal">
          {/* Input Panel */}
          <Panel defaultSize={33} minSize={20}>
            <div className="h-full p-6 border-r border-border">
              <div className="h-full flex flex-col">
                <label className="text-foreground font-medium mb-4">JSON Input</label>
                <textarea
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  placeholder="Paste your JSON here..."
                  className="flex-1 w-full bg-background border border-border rounded-xl p-4 text-foreground placeholder-muted-foreground font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                />
              </div>
            </div>
          </Panel>

          <PanelResizeHandle className="w-2 bg-border hover:bg-border/80 transition-colors" />

          {/* Graph Visualization */}
          <Panel defaultSize={selectedNodeData ? 47 : 67} minSize={30}>
            <div className="h-full flex flex-col">
              {/* Controls */}
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={handleZoomIn}
                    variant="ghost"
                    size="sm"
                  >
                    <ZoomIn size={16} />
                  </Button>
                  <Button
                    onClick={handleZoomOut}
                    variant="ghost"
                    size="sm"
                  >
                    <ZoomOut size={16} />
                  </Button>
                  <Button
                    onClick={handleResetView}
                    variant="ghost"
                    size="sm"
                  >
                    <RotateCcw size={16} />
                  </Button>
                  <Button
                    onClick={handleRecenter}
                    variant="ghost"
                    size="sm"
                    className="bg-purple-500/20 text-purple-400 border-purple-500/30 hover:bg-purple-500/30"
                  >
                    <Home size={16} className="mr-2" />
                    Recenter
                  </Button>
                  <Button
                    onClick={collapseAllNodes}
                    variant="ghost"
                    size="sm"
                  >
                    Collapse All
                  </Button>
                </div>
                <div className="text-sm text-muted-foreground">
                  Zoom: {Math.round(zoom * 100)}% | Nodes: {nodes.length}
                </div>
              </div>

              {/* Graph Canvas */}
              <div 
                ref={containerRef}
                className="flex-1 bg-muted/5 overflow-hidden relative"
              >
                <div ref={exportRef} className="w-full h-full">
                  <svg
                    ref={svgRef}
                    className="w-full h-full cursor-grab active:cursor-grabbing"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onDoubleClick={handleDoubleClick}
                  >
                    <defs>
                      <marker
                        id="arrowhead"
                        markerWidth="10"
                        markerHeight="7"
                        refX="9"
                        refY="3.5"
                        orient="auto"
                      >
                        <polygon
                          points="0 0, 10 3.5, 0 7"
                          fill="hsl(var(--border))"
                        />
                      </marker>
                    </defs>
                    <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
                      {renderEdges()}
                      {nodes.map(node => renderNodeContent(node))}
                    </g>
                  </svg>
                </div>
                
                {nodes.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                    {jsonInput.trim() ? 'Invalid JSON format' : 'Enter JSON to visualize'}
                  </div>
                )}

                {/* Instructions overlay */}
                <div className="absolute bottom-4 left-4 text-xs text-muted-foreground space-y-1">
                  <div>• Ctrl/Cmd + Scroll to zoom</div>
                  <div>• Double-click to reset zoom</div>
                  <div>• Drag to pan</div>
                  <div>• Click nodes to select/deselect</div>
                  <div>• Pinch to zoom on mobile</div>
                </div>
              </div>
            </div>
          </Panel>

          {/* Node Details Panel */}
          {selectedNodeData && (
            <>
              <PanelResizeHandle className="w-2 bg-border hover:bg-border/80 transition-colors" />
              <Panel defaultSize={20} minSize={15}>
                <Card className="h-full border-l border-border bg-background/50 rounded-none border-0">
                  <CardHeader className="border-b border-border">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-foreground font-medium text-lg">{selectedNodeData.key}</h3>
                        <p className="text-muted-foreground text-sm capitalize">{selectedNodeData.type}</p>
                      </div>
                      <Button
                        onClick={() => setSelectedNode(null)}
                        variant="ghost"
                        size="sm"
                      >
                        <X size={16} />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4 max-h-96 overflow-auto">
                    <div>
                      <h4 className="text-foreground font-medium mb-2">Value</h4>
                      {renderValuePreview(selectedNodeData.value)}
                    </div>

                    {selectedNodeData.children.length > 0 && (
                      <div>
                        <h4 className="text-foreground font-medium mb-2">
                          Children ({selectedNodeData.children.length})
                        </h4>
                        <div className="space-y-1">
                          {selectedNodeData.children.map(childId => {
                            const child = nodes.find(n => n.id === childId);
                            return child ? (
                              <Button
                                key={childId}
                                onClick={() => setSelectedNode(childId)}
                                variant="ghost"
                                className="w-full justify-start text-left p-2 h-auto text-sm"
                              >
                                {child.key} ({child.type})
                              </Button>
                            ) : null;
                          })}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Panel>
            </>
          )}
        </PanelGroup>
      </div>
    </div>
  );
}