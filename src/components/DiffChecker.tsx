import React, { useState, useMemo, useRef } from 'react';
import { Copy, RotateCcw, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ExportMenu } from './ExportMenu';
import { exportAsImage, exportAsPDF, exportAsHTML } from '@/utils/exportUtils';
import { DiffLine } from '../types';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';

export default function DiffChecker() {
  const [leftText, setLeftText] = useState('');
  const [rightText, setRightText] = useState('');
  const exportRef = useRef<HTMLDivElement>(null);

  const createDiff = (left: string, right: string): { left: DiffLine[]; right: DiffLine[] } => {
    const leftLines = left.split('\n');
    const rightLines = right.split('\n');
    
    const leftDiff: DiffLine[] = [];
    const rightDiff: DiffLine[] = [];
    
    const maxLines = Math.max(leftLines.length, rightLines.length);
    
    for (let i = 0; i < maxLines; i++) {
      const leftLine = leftLines[i] || '';
      const rightLine = rightLines[i] || '';
      
      if (leftLine === rightLine) {
        leftDiff.push({ type: 'unchanged', content: leftLine, lineNumber: i + 1 });
        rightDiff.push({ type: 'unchanged', content: rightLine, lineNumber: i + 1 });
      } else {
        if (leftLine && !rightLine) {
          leftDiff.push({ type: 'removed', content: leftLine, lineNumber: i + 1 });
          rightDiff.push({ type: 'unchanged', content: '', lineNumber: i + 1 });
        } else if (!leftLine && rightLine) {
          leftDiff.push({ type: 'unchanged', content: '', lineNumber: i + 1 });
          rightDiff.push({ type: 'added', content: rightLine, lineNumber: i + 1 });
        } else {
          leftDiff.push({ type: 'removed', content: leftLine, lineNumber: i + 1 });
          rightDiff.push({ type: 'added', content: rightLine, lineNumber: i + 1 });
        }
      }
    }
    
    return { left: leftDiff, right: rightDiff };
  };

  const diff = useMemo(() => createDiff(leftText, rightText), [leftText, rightText]);

  const renderDiffLine = (line: DiffLine, side: 'left' | 'right') => {
    let bgColor = '';
    let textColor = 'text-foreground';
    let prefix = '';

    switch (line.type) {
      case 'added':
        bgColor = 'bg-green-500/10 border-l-2 border-green-500';
        textColor = 'text-green-400';
        prefix = '+';
        break;
      case 'removed':
        bgColor = 'bg-red-500/10 border-l-2 border-red-500';
        textColor = 'text-red-400';
        prefix = '-';
        break;
      case 'unchanged':
        bgColor = 'bg-transparent';
        textColor = 'text-muted-foreground';
        prefix = ' ';
        break;
    }

    return (
      <div
        key={`${side}-${line.lineNumber}`}
        className={`flex items-start space-x-3 px-4 py-1 font-mono text-sm ${bgColor} ${textColor}`}
      >
        <span className="text-muted-foreground min-w-12 text-right">{line.lineNumber}</span>
        <span className="text-muted-foreground w-4">{prefix}</span>
        <span className="flex-1 whitespace-pre-wrap">{line.content || ' '}</span>
      </div>
    );
  };

  const handleLoadSample = () => {
    const sampleLeft = `function calculateTotal(items) {
  let total = 0;
  for (let item of items) {
    total += item.price;
  }
  return total;
}`;

    const sampleRight = `function calculateTotal(items) {
  let total = 0;
  for (let item of items) {
    total += item.price * item.quantity;
  }
  return Math.round(total * 100) / 100;
}`;

    setLeftText(sampleLeft);
    setRightText(sampleRight);
  };

  const handleClear = () => {
    setLeftText('');
    setRightText('');
  };

  const handleExport = async (format: 'png' | 'jpg' | 'pdf' | 'html') => {
    if (!exportRef.current) return;

    const filename = `diff-comparison-${Date.now()}`;
    
    if (format === 'html') {
      const htmlContent = `
        <h2>Text Comparison</h2>
        <div style="display: flex; gap: 20px;">
          <div style="flex: 1;">
            <h3>Original Text</h3>
            <pre style="background: #f5f5f5; padding: 15px; border-radius: 5px;">${leftText}</pre>
          </div>
          <div style="flex: 1;">
            <h3>Modified Text</h3>
            <pre style="background: #f5f5f5; padding: 15px; border-radius: 5px;">${rightText}</pre>
          </div>
        </div>
        <h3>Differences</h3>
        <div style="display: flex; gap: 20px;">
          <div style="flex: 1;">
            <h4>Original</h4>
            ${diff.left.map(line => `
              <div class="diff-${line.type}" style="padding: 2px 8px; font-family: monospace; font-size: 12px;">
                ${line.lineNumber}: ${line.type === 'removed' ? '-' : ' '} ${line.content}
              </div>
            `).join('')}
          </div>
          <div style="flex: 1;">
            <h4>Modified</h4>
            ${diff.right.map(line => `
              <div class="diff-${line.type}" style="padding: 2px 8px; font-family: monospace; font-size: 12px;">
                ${line.lineNumber}: ${line.type === 'added' ? '+' : ' '} ${line.content}
              </div>
            `).join('')}
          </div>
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
            <h2 className="text-xl font-semibold text-foreground">Diff Checker</h2>
            <p className="text-muted-foreground text-sm mt-1">Compare two texts and highlight differences</p>
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
              <RotateCcw size={16} className="mr-2" />
              Clear
            </Button>
            <ExportMenu 
              onExport={handleExport}
              disabled={!leftText && !rightText}
            />
          </div>
        </div>
      </div>

      <div ref={exportRef} className="flex-1">
        <PanelGroup direction="vertical">
          {/* Input Panels */}
          <Panel defaultSize={50} minSize={30}>
            <PanelGroup direction="horizontal">
              <Panel defaultSize={50} minSize={25}>
                <div className="h-full p-6 border-r border-border">
                  <div className="h-full flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                      <label className="text-foreground font-medium">Original Text</label>
                      <Button
                        onClick={() => navigator.clipboard.writeText(leftText)}
                        variant="ghost"
                        size="sm"
                      >
                        <Copy size={16} />
                      </Button>
                    </div>
                    <textarea
                      value={leftText}
                      onChange={(e) => setLeftText(e.target.value)}
                      placeholder="Paste your original text here..."
                      className="flex-1 w-full bg-background border border-border rounded-xl p-4 text-foreground placeholder-muted-foreground font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                    />
                  </div>
                </div>
              </Panel>

              <PanelResizeHandle className="w-2 bg-border hover:bg-border/80 transition-colors" />

              <Panel defaultSize={50} minSize={25}>
                <div className="h-full p-6">
                  <div className="h-full flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                      <label className="text-foreground font-medium">Modified Text</label>
                      <Button
                        onClick={() => navigator.clipboard.writeText(rightText)}
                        variant="ghost"
                        size="sm"
                      >
                        <Copy size={16} />
                      </Button>
                    </div>
                    <textarea
                      value={rightText}
                      onChange={(e) => setRightText(e.target.value)}
                      placeholder="Paste your modified text here..."
                      className="flex-1 w-full bg-background border border-border rounded-xl p-4 text-foreground placeholder-muted-foreground font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                    />
                  </div>
                </div>
              </Panel>
            </PanelGroup>
          </Panel>

          {/* Diff Visualization */}
          {(leftText || rightText) && (
            <>
              <PanelResizeHandle className="h-2 bg-border hover:bg-border/80 transition-colors" />
              <Panel defaultSize={50} minSize={30}>
                <PanelGroup direction="horizontal">
                  <Panel defaultSize={50} minSize={25}>
                    <div className="h-full border-r border-border">
                      <div className="p-4 border-b border-border">
                        <h3 className="text-foreground font-medium">Original</h3>
                      </div>
                      <div className="h-[calc(100%-60px)] overflow-auto bg-muted/5">
                        {diff.left.map(line => renderDiffLine(line, 'left'))}
                      </div>
                    </div>
                  </Panel>

                  <PanelResizeHandle className="w-2 bg-border hover:bg-border/80 transition-colors" />

                  <Panel defaultSize={50} minSize={25}>
                    <div className="h-full">
                      <div className="p-4 border-b border-border">
                        <h3 className="text-foreground font-medium">Modified</h3>
                      </div>
                      <div className="h-[calc(100%-60px)] overflow-auto bg-muted/5">
                        {diff.right.map(line => renderDiffLine(line, 'right'))}
                      </div>
                    </div>
                  </Panel>
                </PanelGroup>
              </Panel>
            </>
          )}
        </PanelGroup>
      </div>
    </div>
  );
}