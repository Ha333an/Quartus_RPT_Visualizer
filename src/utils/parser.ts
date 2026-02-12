
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

  const createReportLine = (index: number, line: string): ReportLine => ({
    id: `line-${index}`,
    type: identifyMessageType(line),
    content: line,
    raw: line
  });

  const isTopLevelMessageLine = (line: string): boolean => {
    if (!line.trim() || /^\s/.test(line)) {
      return false;
    }

    return /^(Info|Warning|Critical Warning|Error)\s*\(\d+\):/i.test(line.trim());
  };

  const createFallbackTitle = (line: string, sectionIndex: number): string => {
    const trimmed = line.trim();
    const messageMatch = trimmed.match(/^(Critical Warning|Warning|Error|Info)\s*\(\d+\)/i);
    const baseTitle = messageMatch ? messageMatch[0] : `Message ${sectionIndex + 1}`;
    const ruleMatch = trimmed.match(/Rule\s+([A-Za-z0-9_-]+)/i);

    if (ruleMatch) {
      return `${baseTitle} - Rule ${ruleMatch[1]}`;
    }

    return baseTitle;
  };

  const parseFallbackSections = (): { headerInfo: string[]; sections: ReportSection[] } => {
    const fallbackHeaderInfo: string[] = [];
    const fallbackSections: ReportSection[] = [];
    let activeSection: ReportSection | null = null;

    for (let index = 0; index < lines.length; index++) {
      const line = lines[index];

      if (isTopLevelMessageLine(line)) {
        if (activeSection) {
          fallbackSections.push(activeSection);
        }

        const title = createFallbackTitle(line, fallbackSections.length);
        activeSection = {
          id: `section-${fallbackSections.length}-${title.replace(/[^\w\s]/g, '').replace(/\s+/g, '-').toLowerCase()}`,
          title,
          lines: [createReportLine(index, line)],
          isTableOfContents: false
        };

        continue;
      }

      if (activeSection) {
        activeSection.lines.push(createReportLine(index, line));
      } else if (line.trim()) {
        fallbackHeaderInfo.push(line);
      }
    }

    if (activeSection) {
      fallbackSections.push(activeSection);
    }

    if (fallbackSections.length === 0) {
      const allNonEmptyLines = lines
        .map((line, index) => ({ line, index }))
        .filter(item => item.line.trim().length > 0)
        .map(item => createReportLine(item.index, item.line));

      if (allNonEmptyLines.length > 0) {
        fallbackSections.push({
          id: 'section-0-report',
          title: 'Report',
          lines: allNonEmptyLines,
          isTableOfContents: false
        });
      }
    }

    return {
      headerInfo: fallbackHeaderInfo,
      sections: fallbackSections
    };
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
      currentSection.lines.push(createReportLine(lineIndex, line));
    }

    lineIndex++;
  }

  // Final section push
  if (currentSection) {
    sections.push(currentSection);
  }

  if (sections.length === 0) {
    return parseFallbackSections();
  }

  return {
    headerInfo,
    sections
  };
};
