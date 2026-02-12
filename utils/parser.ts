
import { MessageType, ReportData, ReportSection, ReportLine } from '../types';

export const parseRptFile = (content: string): ReportData => {
  const lines = content.split(/\r?\n/);
  const sections: ReportSection[] = [];
  const headerInfo: string[] = [];

  let currentSection: ReportSection | null = null;
  let lineIndex = 0;

  const identifyMessageType = (line: string): MessageType => {
    const trimmed = line.trim();
    if (trimmed.startsWith('Info')) return MessageType.INFO;
    if (trimmed.startsWith('Critical Warning')) return MessageType.CRITICAL_WARNING;
    if (trimmed.startsWith('Warning')) return MessageType.WARNING;
    if (trimmed.startsWith('Error')) return MessageType.ERROR;
    return MessageType.PLAIN;
  };

  const isSeparatorLine = (line: string): boolean => {
    const trimmed = line.trim();
    // Quartus separators are at least 5 chars long and consist of +, -, or =
    return trimmed.length >= 5 && /^[+\-=]+$/.test(trimmed);
  };

  const extractTitleFromLine = (line: string): string => {
    return line.replace(/;/g, '').trim();
  };

  while (lineIndex < lines.length) {
    const line = lines[lineIndex];
    const prevLine = lineIndex > 0 ? lines[lineIndex - 1] : "";
    
    // Logic to detect a NEW section header:
    // 1. Current line is a separator (+---+ or ----)
    // 2. Next line starts with a semicolon (;)
    // 3. Preceding line does NOT start with a semicolon (prevents table rows from triggering new sections)
    let isNewSectionHeader = false;
    let detectedTitle = "";

    if (isSeparatorLine(line) && lineIndex + 1 < lines.length) {
      const nextLine = lines[lineIndex + 1];
      if (nextLine.trim().startsWith(';') && !prevLine.trim().startsWith(';')) {
        const titleCandidate = extractTitleFromLine(nextLine);
        if (titleCandidate.length > 0) {
          isNewSectionHeader = true;
          detectedTitle = titleCandidate;
        }
      }
    }

    if (isNewSectionHeader) {
      // Push the current section before starting a new one
      if (currentSection) {
        sections.push(currentSection);
      }

      currentSection = {
        id: `section-${sections.length}-${detectedTitle.replace(/[^\w\s]/g, '').replace(/\s+/g, '-').toLowerCase()}`,
        title: detectedTitle,
        lines: [],
        isTableOfContents: detectedTitle.toLowerCase() === 'table of contents'
      };
    }

    if (!currentSection) {
      // Lines before any section are treated as global report header info
      if (line.trim()) {
        headerInfo.push(line);
      }
    } else {
      // Add line to the current active section
      const type = identifyMessageType(line);
      currentSection.lines.push({
        id: `line-${lineIndex}`,
        type,
        content: line,
        raw: line
      });
    }

    lineIndex++;
  }

  // Final section push
  if (currentSection) {
    sections.push(currentSection);
  }

  return {
    headerInfo,
    sections
  };
};
