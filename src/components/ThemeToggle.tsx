import React, { useState, useEffect } from 'react';
import { Moon, Sun, Monitor } from "lucide-react";

import { Button } from './ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';

type Theme = 'light' | 'dark' | 'system';

const ThemeToggle: React.FC = () => {
  const [theme, setTheme] = useState<Theme>('system');
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Ensure component is mounted before rendering to avoid hydration issues
  useEffect(() => {
    setMounted(true);
    
    // Load theme from localStorage or default to system
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
      setTheme(savedTheme);
    }
  }, []);

  // Apply theme changes
  useEffect(() => {
    if (!mounted) return;

    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }

    localStorage.setItem('theme', theme);
  }, [theme, mounted]);

  // Listen for system theme changes
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      const root = window.document.documentElement;
      root.classList.remove('light', 'dark');
      root.classList.add(mediaQuery.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const themes = [
    { 
      value: 'light' as const, 
      label: 'Light', 
      icon: Sun,
      description: 'Light theme'
    },
    { 
      value: 'dark' as const, 
      label: 'Dark', 
      icon: Moon,
      description: 'Dark theme'
    },
    { 
      value: 'system' as const, 
      label: 'System', 
      icon: Monitor,
      description: 'Follow system preference'
    }
  ];

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    setIsOpen(false);
  };

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted) {
    return (
      <Button 
        variant="ghost" 
        size="icon"
        className="w-10 h-10"
        disabled
      >
        <Sun className="h-4 w-4" />
      </Button>
    );
  }

  const currentTheme = themes.find(t => t.value === theme);

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger>
        <Button 
          variant="ghost" 
          size="icon"
          className="relative w-10 h-10 hover:bg-accent/80 focus-visible:ring-2 focus-visible:ring-primary/20"
          aria-label={`Current theme: ${currentTheme?.label}. Click to change theme.`}
          title="Toggle theme"
        >
          {/* Animated theme icons */}
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all duration-300 dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all duration-300 dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end">
        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground border-b border-border mb-1">
          Choose theme
        </div>
        {themes.map((themeOption) => {
          const Icon = themeOption.icon;
          return (
            <DropdownMenuItem
              key={themeOption.value}
              onClick={() => handleThemeChange(themeOption.value)}
              selected={theme === themeOption.value}
              className="group"
            >
              <Icon className="mr-3 h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              <div className="flex flex-col">
                <span className="font-medium">{themeOption.label}</span>
                <span className="text-xs text-muted-foreground">{themeOption.description}</span>
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ThemeToggle;