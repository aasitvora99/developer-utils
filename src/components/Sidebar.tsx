import { FileText, GitCompare, Workflow, Code, Menu, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { UtilityTab } from '../types';
import { Button } from '@/components/ui/button';
import ThemeToggle from './ThemeToggle';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  tabs: UtilityTab[];
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const iconMap: Record<string, LucideIcon> = {
  'file-text': FileText,
  'code': Code,
  'git-compare': GitCompare,
  'workflow': Workflow,
};

export default function Sidebar({ activeTab, onTabChange, tabs, collapsed, onToggleCollapse }: SidebarProps) {
  return (
    <div className={`${collapsed ? 'w-16' : 'w-64'} h-full bg-background/80 backdrop-blur-xl border-r border-border flex flex-col transition-all duration-300 ease-in-out`}>
      {/* Header */}
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className={`${collapsed ? 'hidden' : 'block'}`}>
            <h1 className="text-xl font-semibold text-foreground">Utilities</h1>
            <p className="text-sm text-muted-foreground mt-1">Developer Tools</p>
          </div>
          <div className="flex items-center space-x-2">
            {!collapsed && <ThemeToggle />}
            <Button
              onClick={onToggleCollapse}
              variant="ghost"
              size="sm"
              className="w-8 h-8 p-0"
            >
              {collapsed ? <Menu size={16} /> : <X size={16} />}
            </Button>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1">
        {tabs.map((tab) => {
          const Icon = iconMap[tab.icon];
          const isActive = activeTab === tab.id;
          
          return (
            <Button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              variant={isActive ? "secondary" : "ghost"}
              className={`w-full ${collapsed ? 'justify-center px-0' : 'justify-start space-x-3'} h-12 ${
                isActive
                  ? 'bg-secondary text-secondary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
              title={collapsed ? tab.name : undefined}
            >
              <Icon 
                size={20} 
                className={`transition-colors duration-200 ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                } ${collapsed ? '' : 'flex-shrink-0'}`}
              />
              {!collapsed && <span className="font-medium">{tab.name}</span>}
            </Button>
          );
        })}
      </nav>

      {/* Collapsed Theme Toggle */}
      {collapsed && (
        <div className="p-2 border-t border-border/50">
          <div className="flex justify-center">
            <ThemeToggle />
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="p-4 border-t border-border/50">
        <div className="text-xs text-muted-foreground text-center space-y-1">
          <div>{collapsed ? 'v1.0' : 'v1.0.0'}</div>
          {!collapsed && (
            <div className="text-xs text-muted-foreground/80">
              Made with ❤️ by Aasit
            </div>
          )}
        </div>
      </div>
    </div>
  );
}