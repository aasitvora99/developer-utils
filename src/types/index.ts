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