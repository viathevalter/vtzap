export enum TemplateType {
  TEXT = 'TEXT',
  TEXT_IMAGE = 'TEXT_IMAGE',
  TEXT_PDF = 'TEXT_PDF',
  TEXT_IMAGE_PDF = 'TEXT_IMAGE_PDF'
}

export interface LogEntry {
  id: string;
  name: string;
  phone: string;
  status: 'success' | 'failed' | 'pending';
  errorDetails?: string;
  timestamp: string;
  raw_data?: any;
}

export interface Template {
  id: string;
  name: string;
  category: 'RH' | 'Financeiro' | 'Operação' | 'Urgente' | 'Marketing';
  type: TemplateType;
  content: string;
  attachmentImage?: string; // Caminho ou nome do arquivo
  attachmentPdf?: string;   // Caminho ou nome do arquivo
}

export interface CalibrationPoint {
  id: string;
  actionName: string;
  x: number | null;
  y: number | null;
}

export interface CalibrationProfile {
  id: string;
  name: string;
  resolution: string;
  points: CalibrationPoint[];
}