import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Copy, FileText, Image as ImageIcon, Check, ZoomIn, ZoomOut, RotateCcw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ExportMenu } from './ExportMenu';
import { exportAsImage, exportAsPDF, exportAsHTML } from '@/utils/exportUtils';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import mermaid from 'mermaid';

export default function MermaidVisualizer() {
  const [mermaidCode, setMermaidCode] = useState('');
  const [isValid, setIsValid] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const diagramRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize Mermaid with error suppression
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      securityLevel: 'loose',
      fontFamily: 'ui-sans-serif, system-ui, sans-serif',
      flowchart: {
        useMaxWidth: false,
        htmlLabels: true,
        curve: 'basis'
      },
      sequence: {
        useMaxWidth: false,
        wrap: true
      },
      gantt: {
        useMaxWidth: false
      },
      // Suppress error rendering
      suppressErrorRendering: true,
      logLevel: 'error'
    });

    // Override console methods to suppress mermaid error images
    const originalError = console.error;
    const originalWarn = console.warn;
    
    console.error = (...args) => {
      const message = args.join(' ');
      if (!message.includes('mermaid') && !message.includes('diagram')) {
        originalError.apply(console, args);
      }
    };
    
    console.warn = (...args) => {
      const message = args.join(' ');
      if (!message.includes('mermaid') && !message.includes('diagram')) {
        originalWarn.apply(console, args);
      }
    };

    return () => {
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, []);

  // Enhanced zoom functionality with reduced sensitivity
  const handleWheel = useCallback((e: WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.95 : 1.05;
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
        const rawScale = distance / lastTouchDistance;
        const dampedScale = 1 + (rawScale - 1) * 0.3;
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
    if (e.target === containerRef.current) {
      const now = Date.now();
      if (now - lastTap < 300) {
        setZoom(prev => prev === 1 ? 0.5 : 1);
        setPan({ x: 0, y: 0 });
      }
      setLastTap(now);
    }
  }, [lastTap]);

  // Pan functionality
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === containerRef.current || (e.target as Element).closest('.diagram-container')) {
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

  // Zoom controls
  const handleZoomIn = () => setZoom(prev => Math.min(prev * 1.2, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev / 1.2, 0.1));
  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Recenter function
  const handleRecenter = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
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

  const renderDiagram = useCallback(async () => {
    if (!mermaidCode.trim() || !diagramRef.current) return;

    try {
      // Clear previous diagram and any error elements
      diagramRef.current.innerHTML = '';
      
      // Remove any existing mermaid error elements from the document
      const errorElements = document.querySelectorAll('.mermaidTooltip, .error, [id*="mermaid-error"]');
      errorElements.forEach(el => el.remove());
      
      // Validate and render
      const { svg } = await mermaid.render('mermaid-diagram', mermaidCode);
      diagramRef.current.innerHTML = svg;
      
      // Remove any error images or tooltips that might have been added
      const svgErrorElements = diagramRef.current.querySelectorAll('image, .error, .mermaidTooltip');
      svgErrorElements.forEach(el => {
        if (el.getAttribute('href')?.includes('error') || 
            el.getAttribute('src')?.includes('error') ||
            el.classList.contains('error')) {
          el.remove();
        }
      });
      
      setIsValid(true);
      setError('');
    } catch (err) {
      setIsValid(false);
      const errorMessage = err instanceof Error ? err.message : 'Invalid Mermaid syntax';
      setError(errorMessage);
      
      // Clear any library-generated content and show our custom error
      diagramRef.current.innerHTML = `
        <div class="flex items-center justify-center h-64 text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg">
          <div class="text-center">
            <p class="font-medium">Invalid Mermaid Syntax</p>
            <p class="text-sm mt-1">${errorMessage}</p>
          </div>
        </div>
      `;
      
      // Remove any error elements that might have been created by the library
      setTimeout(() => {
        const errorElements = document.querySelectorAll('.mermaidTooltip, .error, [id*="mermaid-error"], image[href*="error"], image[src*="error"]');
        errorElements.forEach(el => el.remove());
      }, 100);
    }
  }, [mermaidCode]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      renderDiagram();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [mermaidCode, renderDiagram]);

  const handleLoadSample = () => {
    const sampleMermaid = `graph TD
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Great!]
    B -->|No| D[Debug]
    D --> E[Fix Issues]
    E --> B
    C --> F[Deploy]
    F --> G[Monitor]
    G --> H[End]
    
    style A fill:#e1f5fe
    style C fill:#c8e6c9
    style F fill:#fff3e0
    style H fill:#fce4ec`;
    
    setMermaidCode(sampleMermaid);
  };

  const handleClear = () => {
    setMermaidCode('');
    if (diagramRef.current) {
      diagramRef.current.innerHTML = '';
    }
    setError('');
    setIsValid(true);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(mermaidCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleCopyImage = async () => {
    if (!diagramRef.current || !isValid) return;

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const svgElement = diagramRef.current.querySelector('svg');
      
      if (!svgElement || !ctx) return;

      const svgData = new XMLSerializer().serializeToString(svgElement);
      const img = new Image();
      
      img.onload = async () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        
        canvas.toBlob(async (blob) => {
          if (blob) {
            try {
              await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob })
              ]);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch (err) {
              console.error('Failed to copy image:', err);
            }
          }
        });
      };
      
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    } catch (err) {
      console.error('Failed to copy image:', err);
    }
  };

  const handleExport = async (format: 'png' | 'jpg' | 'pdf' | 'html') => {
    if (!exportRef.current) return;

    const filename = `mermaid-diagram-${Date.now()}`;
    
    if (format === 'html') {
      const htmlContent = `
        <h2>Mermaid Diagram</h2>
        <h3>Diagram Code:</h3>
        <pre style="background: #f5f5f5; padding: 15px; border-radius: 5px; overflow-x: auto;">${mermaidCode}</pre>
        <h3>Rendered Diagram:</h3>
        <div style="text-align: center; padding: 20px;">
          ${diagramRef.current?.innerHTML || ''}
        </div>
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
            <h2 className="text-xl font-semibold text-foreground">Mermaid Visualizer</h2>
            <p className="text-muted-foreground text-sm mt-1">Create diagrams and flowcharts with Mermaid syntax</p>
          </div>
          <div className="flex space-x-2">
            <Button
              onClick={handleLoadSample}
              variant="outline"
              size="sm"
              className="bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30"
            >
              <FileText size={16} className="mr-2" />
              Load Sample
            </Button>
            <Button
              onClick={handleClear}
              variant="ghost"
              size="sm"
            >
              Clear
            </Button>
            <Button
              onClick={handleCopyCode}
              variant="ghost"
              size="sm"
              className="relative"
            >
              {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
              {copied && (
                <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-green-500 text-white text-xs px-2 py-1 rounded">
                  Copied!
                </span>
              )}
            </Button>
            <Button
              onClick={handleCopyImage}
              variant="ghost"
              size="sm"
              disabled={!isValid || !mermaidCode.trim()}
              className="bg-orange-500/20 text-orange-400 border-orange-500/30 hover:bg-orange-500/30 disabled:opacity-50"
            >
              <ImageIcon size={16} className="mr-2" />
              Copy Image
            </Button>
            <ExportMenu 
              onExport={handleExport}
              disabled={!mermaidCode.trim()}
            />
          </div>
        </div>
      </div>

      <div className="flex-1">
        <PanelGroup direction="horizontal">
          {/* Input Panel */}
          <Panel defaultSize={50} minSize={30}>
            <div className="h-full p-6 border-r border-border">
              <div className="h-full flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <label className="text-foreground font-medium">Mermaid Code</label>
                  <div className="flex items-center space-x-2">
                    {!isValid && (
                      <span className="text-red-400 text-sm">⚠ Syntax Error</span>
                    )}
                    {isValid && mermaidCode.trim() && (
                      <span className="text-green-400 text-sm">✓ Valid</span>
                    )}
                  </div>
                </div>
                <textarea
                  value={mermaidCode}
                  onChange={(e) => setMermaidCode(e.target.value)}
                  placeholder={`Enter Mermaid code here...

Example:
graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Action 1]
    B -->|No| D[Action 2]
    C --> E[End]
    D --> E`}
                  className="flex-1 w-full bg-background border border-border rounded-xl p-4 text-foreground placeholder-muted-foreground font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                />
                {error && (
                  <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="text-red-400 text-sm font-medium">Syntax Error:</p>
                    <p className="text-red-300 text-xs mt-1">{error}</p>
                  </div>
                )}
              </div>
            </div>
          </Panel>

          <PanelResizeHandle className="w-2 bg-border hover:bg-border/80 transition-colors" />

          {/* Diagram Panel */}
          <Panel defaultSize={50} minSize={30}>
            <div className="h-full flex flex-col">
              {/* Zoom Controls */}
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
                </div>
                <div className="text-sm text-muted-foreground">
                  Zoom: {Math.round(zoom * 100)}%
                </div>
              </div>

              <div className="flex-1 p-6">
                <div className="h-full flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <label className="text-foreground font-medium">Diagram Preview</label>
                    <div className="text-sm text-muted-foreground">
                      {mermaidCode.trim() ? (isValid ? 'Rendered' : 'Error') : 'No diagram'}
                    </div>
                  </div>
                  <div 
                    ref={containerRef}
                    className="flex-1 bg-muted/5 border border-border rounded-xl overflow-hidden relative cursor-grab active:cursor-grabbing"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onDoubleClick={handleDoubleClick}
                  >
                    <div 
                      ref={exportRef}
                      className="w-full h-full flex items-center justify-center"
                      style={{
                        transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                        transformOrigin: 'center center',
                        transition: isDragging ? 'none' : 'transform 0.1s ease-out'
                      }}
                    >
                      <div 
                        ref={diagramRef}
                        className="diagram-container"
                      >
                        {!mermaidCode.trim() && (
                          <div className="text-center text-muted-foreground p-8">
                            <FileText size={48} className="mx-auto mb-4 opacity-50" />
                            <p>Enter Mermaid code to see the diagram</p>
                            <p className="text-sm mt-2">
                              Supports flowcharts, sequence diagrams, gantt charts, and more
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Instructions overlay */}
                    <div className="absolute bottom-4 left-4 text-xs text-muted-foreground space-y-1">
                      <div>• Ctrl/Cmd + Scroll to zoom</div>
                      <div>• Double-click to reset zoom</div>
                      <div>• Drag to pan</div>
                      <div>• Pinch to zoom on mobile</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Panel>
        </PanelGroup>
      </div>

      {/* Help Section */}
      <div className="p-4 border-t border-border bg-muted/5">
        <div className="text-xs text-muted-foreground space-y-1">
          <div className="font-medium mb-2">Quick Reference:</div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="font-medium">Flowchart:</span> graph TD, graph LR
            </div>
            <div>
              <span className="font-medium">Sequence:</span> sequenceDiagram
            </div>
            <div>
              <span className="font-medium">Class:</span> classDiagram
            </div>
            <div>
              <span className="font-medium">Gantt:</span> gantt
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}