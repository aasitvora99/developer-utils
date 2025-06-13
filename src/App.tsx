import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import JsonVisualizer from './components/JsonVisualizer';
import DiffChecker from './components/DiffChecker';
import MermaidVisualizer from './components/MermaidVisualizer';
import { ThemeProvider } from './hooks/useTheme';
import { UtilityTab } from './types';

const utilities: UtilityTab[] = [
  {
    id: 'json-visualizer',
    name: 'JSON Visualizer',
    icon: 'file-text',
    component: JsonVisualizer,
  },
  {
    id: 'diff-checker',
    name: 'Diff Checker',
    icon: 'git-compare',
    component: DiffChecker,
  },
  {
    id: 'mermaid-visualizer',
    name: 'Mermaid Visualizer',
    icon: 'workflow',
    component: MermaidVisualizer,
  },
];

function App() {
  const [activeTab, setActiveTab] = useState(utilities[0].id);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const activeUtility = utilities.find(util => util.id === activeTab);
  const ActiveComponent = activeUtility?.component || JsonVisualizer;

  return (
    <ThemeProvider defaultTheme="dark" storageKey="utilities-theme">
      <div className="h-screen w-screen bg-gradient-to-br from-background via-background/95 to-background flex overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-secondary/10 via-transparent to-transparent"></div>
        
        {/* Sidebar */}
        <Sidebar 
          activeTab={activeTab} 
          onTabChange={setActiveTab}
          tabs={utilities}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 bg-background/10 backdrop-blur-sm">
            <ActiveComponent />
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
}

export default App;