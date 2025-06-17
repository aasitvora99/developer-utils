import { FileText, GitCompare, Workflow, Code, Menu, X, Settings } from 'lucide-react';
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
    <div className={`${collapsed ? 'w-16' : 'w-72'} h-full bg-card/95 backdrop-blur-xl border-r border-border/50 flex flex-col transition-all duration-300 ease-in-out relative overflow-hidden`}>
      {/* Gradient Background Accent */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
      
      {/* Header */}
      <div className="relative p-6 border-b border-border/30">
        <div className="flex items-center justify-between">
          <div className={`transition-all duration-300 ${collapsed ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
            {!collapsed && (
              <div className="space-y-1">
                <h1 className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  Utilities
                </h1>
                <p className="text-sm text-muted-foreground font-medium">Developer Toolkit</p>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!collapsed && (
              <div className="opacity-80 hover:opacity-100 transition-opacity">
                <ThemeToggle />
              </div>
            )}
            <Button
              onClick={onToggleCollapse}
              variant="ghost"
              size="sm"
              className="w-9 h-9 p-0 hover:bg-accent/80 transition-all duration-200 hover:scale-105"
            >
              {collapsed ? <Menu size={18} /> : <X size={18} />}
            </Button>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-2">
        {tabs.map((tab, index) => {
          const Icon = iconMap[tab.icon];
          const isActive = activeTab === tab.id;
          
          return (
            <div
              key={tab.id}
              className="relative group"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <Button
                onClick={() => onTabChange(tab.id)}
                variant="ghost"
                className={`w-full relative ${collapsed ? 'justify-center px-0' : 'justify-start gap-4'} h-12 transition-all duration-200 hover:scale-[1.02] ${
                  isActive
                    ? 'bg-primary/10 text-primary border border-primary/20 shadow-sm hover:bg-primary/15'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
                }`}
                title={collapsed ? tab.name : undefined}
              >
                {/* Active indicator */}
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
                )}
                
                <div className={`flex items-center ${collapsed ? '' : 'gap-4'}`}>
                  <div className={`p-1 rounded-lg transition-all duration-200 ${
                    isActive 
                      ? 'bg-primary/20 text-primary' 
                      : 'group-hover:bg-accent/80'
                  }`}>
                    <Icon 
                      size={18} 
                      className="transition-all duration-200"
                    />
                  </div>
                  {!collapsed && (
                    <span className="font-semibold text-sm tracking-wide">
                      {tab.name}
                    </span>
                  )}
                </div>
              </Button>
            </div>
          );
        })}
      </nav>

      {/* Collapsed Theme Toggle */}
      {collapsed && (
        <div className="p-3 border-t border-border/30">
          <div className="flex justify-center">
            <div className="p-1 rounded-lg hover:bg-accent/60 transition-colors">
              <ThemeToggle />
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="relative p-4 border-t border-border/30 bg-card/50">
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          {collapsed ? (
            <div className="flex flex-col items-center gap-1">
              <Settings size={12} className="opacity-60" />
              <span className="text-[10px] font-medium">v1.0</span>
            </div>
          ) : (
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-2">
                <span className="font-semibold text-foreground/80">v1.0.0</span>
                <div className="w-1 h-1 bg-muted-foreground/40 rounded-full" />
                <span className="text-muted-foreground/60">Beta</span>
              </div>
              <div className="text-xs font-medium">
                Crafted with ❤️ by Aasit
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}