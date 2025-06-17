import { ReactNode } from "react";

export interface UtilityTab {
  id: string;
  name: string;
  icon: string;
  component: React.ComponentType;
}

export interface JsonNode {
  key: string;
  value: any;
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';
  children?: JsonNode[];
  isExpanded?: boolean;
}

export interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  content: string;
  lineNumber: number;
}

export interface ConvertFunction {
  encode: (str: string) => string;
  decode: (str: string) => string;
  description: string;
  isValidEncoded: (str: string) => boolean;
  example: { input: string; output: string };
}

export interface ToastProviderProps {
  children: ReactNode;
}

export interface ToastComponentProps {
  message: string;
  type?: 'success' | 'error' | 'warning';
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export type ToastType = 'success' | 'error' | 'warning';

export interface ToastItem {
  id: number;
  message: string;
  type?: ToastType;
  open: boolean;
}
