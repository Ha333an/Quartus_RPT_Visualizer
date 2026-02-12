
export enum MessageType {
  INFO = 'Info',
  WARNING = 'Warning',
  CRITICAL_WARNING = 'Critical Warning',
  ERROR = 'Error',
  PLAIN = 'Plain'
}

export interface ReportLine {
  id: string;
  type: MessageType;
  content: string;
  raw: string;
}

export interface ReportSection {
  id: string;
  title: string;
  lines: ReportLine[];
  isTableOfContents?: boolean;
}

export interface ReportData {
  headerInfo: string[];
  sections: ReportSection[];
}
