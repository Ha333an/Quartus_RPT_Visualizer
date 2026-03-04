
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { MessageType, ReportData, ReportLine } from './types';
import { parseRptFile } from './utils/parser';
import ReportSectionItem from './components/ReportSectionItem';
import LineContent from './components/LineContent';
import { 
  FileText, 
  Search, 
  XCircle, 
  ChevronDown
} from './components/Icons';

// Access the VS Code API initialized in index.html
const vscode = (window as any).vscode;

const App: React.FC = () => {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [rawContent, setRawContent] = useState('');
  const [isBackendProcessing, setIsBackendProcessing] = useState(Boolean(vscode));
  const [isDragActive, setIsDragActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [rawSearchQuery, setRawSearchQuery] = useState('');
  const [isRawMode, setIsRawMode] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(rawSearchQuery);
    }, 250); // 250ms delay
    return () => clearTimeout(timer);
  }, [rawSearchQuery]);
  const [globalExpanded, setGlobalExpanded] = useState<boolean | undefined>(false);
  const [targetExpandId, setTargetExpandId] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const [isContextMode, setIsContextMode] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuDropdownRef = useRef<HTMLDivElement>(null);
  const dragDepthRef = useRef(0);

  const applyReportContent = useCallback((content: string) => {
    const parsed = parseRptFile(content);
    setReportData(parsed);
    setRawContent(content);
    setGlobalExpanded(false);
    setRawSearchQuery('');
    setTargetExpandId(null);
  }, []);

  // VS Code Message Listener: This allows the extension to push data to the webview
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      switch (message.command) {
        case 'processing':
          setIsBackendProcessing(Boolean(message.active));
          break;
        case 'setData':
          const incomingContent = typeof message.data === 'string' ? message.data : '';
          applyReportContent(incomingContent);
          if (!vscode) setIsBackendProcessing(false);
          break;
        case 'setSearch':
          setRawSearchQuery(message.text || '');
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    
    // Notify VS Code that the Webview is ready
    if (vscode) {
      vscode.postMessage({ command: 'ready' });
    }

    return () => window.removeEventListener('message', handleMessage);
  }, [applyReportContent]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const targetNode = event.target as Node;
      const clickedButton = menuButtonRef.current?.contains(targetNode);
      const clickedDropdown = menuDropdownRef.current?.contains(targetNode);
      if (!clickedButton && !clickedDropdown) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    const updateMenuPosition = () => {
      if (!menuButtonRef.current) {
        return;
      }

      const rect = menuButtonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom - 12,
        left: rect.left,
        width: Math.max(rect.width, 320),
      });
    };

    updateMenuPosition();
    window.addEventListener('scroll', updateMenuPosition, true);
    window.addEventListener('resize', updateMenuPosition);

    return () => {
      window.removeEventListener('scroll', updateMenuPosition, true);
      window.removeEventListener('resize', updateMenuPosition);
    };
  }, [isMenuOpen]);

  useEffect(() => {
    if (isRawMode && isMenuOpen) {
      setIsMenuOpen(false);
    }
  }, [isRawMode, isMenuOpen]);

  const processFile = (file: File) => {
    setIsBackendProcessing(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      applyReportContent(text);
      setIsBackendProcessing(false);
    };
    reader.onerror = () => {
      setIsBackendProcessing(false);
    };
    reader.readAsText(file);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
    event.target.value = '';
  };

  const hasDraggedFiles = (event: React.DragEvent) => {
    return Array.from(event.dataTransfer.types).includes('Files');
  };

  const handleDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    if (!hasDraggedFiles(event)) return;
    event.preventDefault();
    dragDepthRef.current += 1;
    setIsDragActive(true);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    if (!hasDraggedFiles(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    if (!hasDraggedFiles(event)) return;
    event.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) {
      setIsDragActive(false);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    if (!hasDraggedFiles(event)) return;
    event.preventDefault();
    dragDepthRef.current = 0;
    setIsDragActive(false);

    const file = event.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleQuickSearch = (type: MessageType) => {
    let query = '';
    switch (type) {
      case MessageType.ERROR: query = 'Error ('; break;
      case MessageType.CRITICAL_WARNING: query = 'Critical Warning ('; break;
      case MessageType.WARNING: query = 'Warning ('; break;
      case MessageType.INFO: query = 'Info ('; break;
    }
    setRawSearchQuery(query);
    setGlobalExpanded(undefined);
  };

  const clearFilters = () => {
    setRawSearchQuery('');
    setGlobalExpanded(undefined);
    setIsContextMode(false);
  };

  const getMessageTypeFromLine = (line: string): MessageType => {
    const trimmed = line.trim();
    if (trimmed.startsWith('Info')) return MessageType.INFO;
    if (trimmed.startsWith('Critical Warning')) return MessageType.CRITICAL_WARNING;
    if (trimmed.startsWith('Warning')) return MessageType.WARNING;
    if (trimmed.startsWith('Error')) return MessageType.ERROR;
    return MessageType.PLAIN;
  };

  const rawLines = useMemo<ReportLine[]>(() => {
    if (!rawContent) return [];

    return rawContent.split(/\r?\n/).map((line, index) => ({
      id: `raw-${index}`,
      type: getMessageTypeFromLine(line),
      content: line,
      raw: line,
    }));
  }, [rawContent]);

  const messageCounts = useMemo(() => {
    if (!reportData) return { info: 0, warn: 0, critical: 0, error: 0 };
    let counts = { info: 0, warn: 0, critical: 0, error: 0 };
    reportData.sections.forEach(s => {
      s.lines.forEach(l => {
        if (l.type === MessageType.INFO) counts.info++;
        if (l.type === MessageType.WARNING) counts.warn++;
        if (l.type === MessageType.CRITICAL_WARNING) counts.critical++;
        if (l.type === MessageType.ERROR) counts.error++;
      });
    });
    return counts;
  }, [reportData]);

  const escapeRegExp = (text: string) => {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  const totalMatches = useMemo(() => {
    if (!searchQuery || !reportData) return 0;
    let count = 0;
    const regex = new RegExp(escapeRegExp(searchQuery), 'gi');
    for (const section of reportData.sections) {
      for (const line of section.lines) {
        const matches = line.content.match(regex);
        if (matches) {
          count += matches.length;
        }
        if (count > 1000) return 1001; // Cap to indicate "more than 1000"
      }
    }
    return count;
  }, [reportData, searchQuery]);

  const rawTotalMatches = useMemo(() => {
    if (!searchQuery || rawLines.length === 0) return 0;
    let count = 0;
    const regex = new RegExp(escapeRegExp(searchQuery), 'gi');
    for (const line of rawLines) {
      const matches = line.content.match(regex);
      if (matches) {
        count += matches.length;
      }
      if (count > 1000) return 1001;
    }
    return count;
  }, [rawLines, searchQuery]);

  const allMatches = useMemo(() => {
    if (!searchQuery || !reportData || totalMatches > 1000) return [];
    
    const matches = [];
    const regex = new RegExp(escapeRegExp(searchQuery), 'gi');

    for (const section of reportData.sections) {
        for (const line of section.lines) {
            for (const match of line.content.matchAll(regex)) {
                matches.push({
                    sectionId: section.id,
                    lineId: line.id,
                    start: match.index,
                });
            }
        }
    }
    return matches;
  }, [reportData, searchQuery, totalMatches]);

  const rawMatches = useMemo(() => {
    if (!searchQuery || rawLines.length === 0 || rawTotalMatches > 1000) return [];

    const matches = [];
    const regex = new RegExp(escapeRegExp(searchQuery), 'gi');
    for (const line of rawLines) {
      for (const match of line.content.matchAll(regex)) {
        matches.push({
          lineId: line.id,
          start: match.index,
        });
      }
    }

    return matches;
  }, [rawLines, searchQuery, rawTotalMatches]);

  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);
  const activeMatches = isRawMode ? rawMatches : allMatches;
  const activeTotalMatches = isRawMode ? rawTotalMatches : totalMatches;
  const currentStructuredMatch = allMatches[currentMatchIndex];
  const currentRawMatch = rawMatches[currentMatchIndex];
  const currentMatch = isRawMode ? currentRawMatch : currentStructuredMatch;

  useEffect(() => {
    if (!searchQuery) {
      setCurrentMatchIndex(-1);
      return;
    }

    if (activeMatches.length === 0) {
      setCurrentMatchIndex(-1);
      return;
    }

    if (currentMatchIndex < 0 || currentMatchIndex >= activeMatches.length) {
      setCurrentMatchIndex(0);
    }
  }, [searchQuery, isRawMode, activeMatches.length, currentMatchIndex]);

  const detectedReportTitle = useMemo(() => {
    if (!reportData) return 'Quartus RPT';

    const headerLines = reportData.headerInfo
      .map(line => line.trim())
      .filter(Boolean);

    const extractByKey = (keys: string[]) => {
      for (const line of headerLines) {
        const match = line.match(/^([^:]+):\s*(.+)$/);
        if (!match) continue;

        const key = match[1].trim().toLowerCase();
        if (keys.some(k => key.includes(k))) {
          return match[2].trim();
        }
      }
      return '';
    };

    const reportName =
      extractByKey(['report name', 'report file', 'project', 'revision', 'design']) ||
      headerLines.find(line => !line.startsWith(';') && line.length > 4) ||
      'Quartus RPT';

    const reportDate =
      extractByKey(['date', 'generated', 'time']) ||
      headerLines.find(line => /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b|\b\d{4}-\d{2}-\d{2}\b/i.test(line)) ||
      '';

    return reportDate ? `${reportName} - ${reportDate}` : reportName;
  }, [reportData]);

  const sectionNavigationItems = useMemo(() => {
    if (!reportData) return [];

    const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    const isSeparator = (value: string) => /^[+\-=]+$/.test(value);

    const sectionsWithoutToc = reportData.sections.filter(section => !section.isTableOfContents);
    const tocSection = reportData.sections.find(section => section.isTableOfContents || section.title.toLowerCase() === 'table of contents');

    if (!tocSection) {
      return sectionsWithoutToc.map(section => ({ id: section.id, title: section.title }));
    }

    const tocCandidates = tocSection.lines
      .map(line => line.content.replace(/;/g, '').trim())
      .filter(line => line.length > 0)
      .filter(line => !isSeparator(line))
      .filter(line => line.toLowerCase() !== 'table of contents')
      .map(line => line.replace(/\.{2,}\s*\d+\s*$/, '').replace(/\s+\d+\s*$/, '').trim())
      .filter(line => line.length > 0);

    const usedSectionIds = new Set<string>();
    const resolvedItems = tocCandidates
      .map(title => {
        const normalizedTitle = normalize(title);
        if (!normalizedTitle) return null;

        const exactMatch = sectionsWithoutToc.find(section => normalize(section.title) === normalizedTitle && !usedSectionIds.has(section.id));
        const looseMatch = sectionsWithoutToc.find(section => {
          if (usedSectionIds.has(section.id)) return false;
          const normalizedSection = normalize(section.title);
          return normalizedSection.includes(normalizedTitle) || normalizedTitle.includes(normalizedSection);
        });

        const target = exactMatch || looseMatch;
        if (!target) return null;

        usedSectionIds.add(target.id);
        return {
          id: target.id,
          title,
        };
      })
      .filter((item): item is { id: string; title: string } => item !== null);

    return resolvedItems.length > 0
      ? resolvedItems
      : sectionsWithoutToc.map(section => ({ id: section.id, title: section.title }));
  }, [reportData]);

  const goToNextMatch = () => {
    if (activeMatches.length === 0) return;
    setCurrentMatchIndex(i => (i + 1) % activeMatches.length);
  };

  const goToPrevMatch = () => {
    if (activeMatches.length === 0) return;
    setCurrentMatchIndex(i => (i - 1 + activeMatches.length) % activeMatches.length);
  };

  useEffect(() => {
    if (isRawMode) {
      if (currentRawMatch) {
        let attempts = 0;
        const maxAttempts = 8;

        const tryScrollToRawMatch = () => {
          const el = document.getElementById(`line-${currentRawMatch.lineId}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
          }

          attempts += 1;
          if (attempts < maxAttempts) {
            setTimeout(tryScrollToRawMatch, 80);
          }
        };

        setTimeout(tryScrollToRawMatch, 60);
      }
      return;
    }

    if (currentStructuredMatch) {
      setTargetExpandId(currentStructuredMatch.sectionId);

      let attempts = 0;
      const maxAttempts = 8;

      const tryScrollToMatch = () => {
        const el = document.getElementById(`line-${currentStructuredMatch.lineId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return;
        }

        attempts += 1;
        if (attempts < maxAttempts) {
          setTimeout(tryScrollToMatch, 80);
          return;
        }

        const sectionEl = document.getElementById(currentStructuredMatch.sectionId);
        if (sectionEl) {
          sectionEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      };

      setTimeout(tryScrollToMatch, 60);
    }
  }, [currentRawMatch, currentStructuredMatch, isRawMode]);

  const jumpToSection = (sectionId: string) => {
    setRawSearchQuery(''); 
    setGlobalExpanded(undefined);
    setTargetExpandId(sectionId);
    setIsMenuOpen(false);
    setIsContextMode(false);
    
    setTimeout(() => {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  };

  return (
    <div
      className="min-h-screen flex flex-col bg-slate-50 relative"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragActive && !isBackendProcessing && (
        <div className="absolute inset-0 z-[100] bg-blue-500/10 backdrop-blur-[1px] border-4 border-dashed border-blue-400 flex items-center justify-center pointer-events-none">
          <div className="px-6 py-4 rounded-2xl bg-white border border-blue-200 shadow-lg text-center">
            <p className="text-sm font-black uppercase tracking-widest text-blue-700">Drop .rpt file to open</p>
            <p className="text-xs font-semibold text-blue-500 mt-1">Release to load and parse report</p>
          </div>
        </div>
      )}
      <header className="z-[60] bg-[#0f172a] text-white shadow-xl">
        <div className="max-w-[98%] mx-auto px-3 h-12 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="bg-blue-600 p-1.5 rounded-lg shadow-inner shrink-0">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-black tracking-tight leading-none truncate">{detectedReportTitle}</h1>
              <p className="text-[9px] text-blue-400 font-bold uppercase tracking-[0.12em] mt-0.5 truncate">
                {vscode ? 'VS Code Extension' : 'Professional Visualizer'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!reportData ? (
              <label className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all shadow-lg transform active:scale-95 whitespace-nowrap">
                Load .rpt File
                <input type="file" accept=".rpt" className="hidden" onChange={handleFileUpload} />
              </label>
            ) : (
              <button 
                onClick={() => setReportData(null)}
                className="text-slate-400 hover:text-white text-[10px] font-bold uppercase tracking-widest transition-colors py-1.5 px-3 border border-slate-700 rounded-lg hover:border-slate-500"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </header>

      {reportData && (
        <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
          <div className="max-w-[98%] mx-auto px-3 py-2 flex items-center gap-2 overflow-x-auto overflow-y-visible">
            {isBackendProcessing && (
              <div className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 shrink-0">
                <span className="w-3 h-3 rounded-full border-2 border-blue-300 border-t-blue-600 animate-spin" />
                <span className="text-[10px] font-black uppercase tracking-widest">Backend Processing...</span>
              </div>
            )}
            <div className="flex items-center gap-2 shrink-0">
              {!isRawMode && (
              <div className="relative">
                <button 
                  ref={menuButtonRef}
                  onClick={() => setIsMenuOpen(prev => !prev)}
                  className={`h-full px-3 py-2 bg-blue-50 border-2 border-blue-200 text-blue-700 hover:bg-blue-100 hover:border-blue-300 font-black text-[10px] uppercase tracking-widest flex items-center justify-between gap-2 transition-all active:scale-95 min-w-[180px] ${isMenuOpen ? 'rounded-t-xl rounded-b-none border-b-transparent' : 'rounded-xl'}`}
                >
                  <span className="truncate">Go to Section...</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
                </button>
              </div>
              )}

              <div className="relative w-[260px] group shrink-0">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className={`w-3.5 h-3.5 transition-colors ${searchQuery ? 'text-blue-500' : 'text-slate-400'}`} />
                </div>
                <input
                  type="text"
                  placeholder="Search design results..."
                  value={rawSearchQuery}
                  onChange={(e) => setRawSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 bg-slate-100 border-transparent border-2 focus:bg-white focus:border-blue-500 rounded-xl outline-none text-xs text-slate-900 font-semibold transition-all"
                />
                {rawSearchQuery && (
                  <button onClick={() => setRawSearchQuery('')} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-red-500 transition-colors">
                    <XCircle className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => handleQuickSearch(MessageType.ERROR)}
                  className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-all ${rawSearchQuery === 'Error (' ? 'bg-red-600 border-red-600 text-white' : 'bg-white border-red-200 text-red-600 hover:bg-red-50'}`}
                >
                  Err {messageCounts.error}
                </button>
                <button
                  onClick={() => handleQuickSearch(MessageType.CRITICAL_WARNING)}
                  className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-all ${rawSearchQuery === 'Critical Warning (' ? 'bg-orange-600 border-orange-600 text-white' : 'bg-white border-orange-200 text-orange-600 hover:bg-orange-50'}`}
                >
                  Crit {messageCounts.critical}
                </button>
                <button
                  onClick={() => handleQuickSearch(MessageType.WARNING)}
                  className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-all ${rawSearchQuery === 'Warning (' ? 'bg-amber-500 border-amber-500 text-white' : 'bg-white border-amber-200 text-amber-600 hover:bg-amber-50'}`}
                >
                  Warn {messageCounts.warn}
                </button>
              </div>

            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <div className="flex items-center gap-1.5 shrink-0">
                <QuickSearchButton label="Info" count={messageCounts.info} active={rawSearchQuery === 'Info ('} onClick={() => handleQuickSearch(MessageType.INFO)} color="blue" />
                
                <div className="w-px h-6 bg-slate-200 mx-1" />
                
                <button
                  onClick={clearFilters}
                  className={`px-3 py-2 rounded-xl border-2 text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 active:scale-95 border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300 ${!rawSearchQuery ? 'opacity-40 cursor-not-allowed' : ''}`}
                  disabled={!rawSearchQuery}
                >
                  Clear Filters
                </button>

                {searchQuery && (
                  <>
                    <div className="flex items-center gap-2 border-2 border-slate-200 rounded-xl px-2.5 py-1.5">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                        {activeTotalMatches > 1000 ? '>1k' : activeTotalMatches}
                        <span className="hidden sm:inline"> Matches</span>
                      </span>
                      {activeTotalMatches > 0 && activeTotalMatches <= 1000 && (
                        <>
                          <div className="w-px h-4 bg-slate-200" />
                          <button onClick={goToPrevMatch} className="text-slate-500 hover:text-blue-600 transition-colors p-1 rounded-md disabled:opacity-30 disabled:hover:text-slate-500" disabled={activeMatches.length === 0}>&lt;</button>
                          <span className="text-[10px] font-bold text-slate-400">{currentMatchIndex + 1} / {activeMatches.length}</span>
                          <button onClick={goToNextMatch} className="text-slate-500 hover:text-blue-600 transition-colors p-1 rounded-md disabled:opacity-30 disabled:hover:text-slate-500" disabled={activeMatches.length === 0}>&gt;</button>
                        </>
                      )}
                    </div>
                    <button
                      onClick={() => setIsContextMode(!isContextMode)}
                      className={`px-3 py-2 rounded-xl border-2 text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 active:scale-95 shadow-sm ${isContextMode ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-indigo-100 text-indigo-600 hover:bg-indigo-50'}`}
                    >
                      {isContextMode ? 'Hide Rest' : 'Show Rest'}
                    </button>
                  </>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => setIsRawMode(!isRawMode)}
                  className={`px-3 py-2 rounded-xl border-2 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${isRawMode ? 'bg-violet-600 border-violet-600 text-white' : 'bg-white border-violet-100 text-violet-600 hover:bg-violet-50'}`}
                >
                  {isRawMode ? 'Structured Mode' : 'Raw Mode'}
                </button>

                {!isRawMode && (
                  <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                    <button onClick={() => setGlobalExpanded(true)} className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-slate-900 transition-colors">Expand All</button>
                    <div className="w-px h-4 bg-slate-200" />
                    <button onClick={() => setGlobalExpanded(false)} className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-slate-900 transition-colors">Collapse All</button>
                  </div>
                )}
              </div>
            </div>

            {isMenuOpen && menuPosition && !isRawMode && (
              <div
                ref={menuDropdownRef}
                className="fixed bg-white rounded-b-2xl rounded-tr-2xl rounded-tl-none shadow-2xl border border-slate-100 border-t-0 pt-0 pb-2 max-h-96 overflow-y-auto z-[120] animate-in fade-in"
                style={{
                  top: menuPosition.top,
                  left: menuPosition.left,
                  width: menuPosition.width,
                }}
              >
                {sectionNavigationItems.map(section => (
                  <button
                    key={section.id}
                    onClick={() => jumpToSection(section.id)}
                    className="w-full text-left px-5 py-3 hover:bg-blue-50 text-[11px] font-bold text-slate-600 hover:text-blue-700 transition-colors border-b border-slate-50 last:border-0 truncate"
                  >
                    {section.title}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <main className="flex-grow max-w-[98%] mx-auto w-full px-4 pt-1 pb-6">
        {!reportData ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <div className="w-24 h-24 bg-white rounded-[2.5rem] flex items-center justify-center mb-10 shadow-2xl border border-slate-100 rotate-3 hover:rotate-0 transition-transform">
              <FileText className="w-12 h-12 text-blue-600" />
            </div>
            <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">
              {vscode ? 'Waiting for Report Data...' : 'Quartus Report Visualizer'}
            </h2>
            <p className="text-slate-500 max-w-lg mb-12 text-lg leading-relaxed font-medium">
              {vscode 
                ? 'Open a .rpt file in VS Code to see it visualized here automatically.' 
                : 'Upload your .rpt file to analyze design results with professional tools.'}
            </p>
            {!vscode && (
              <label className="flex items-center gap-4 bg-blue-600 hover:bg-blue-500 text-white px-12 py-5 rounded-2xl font-black text-lg cursor-pointer transition-all shadow-2xl hover:shadow-blue-500/20 transform hover:-translate-y-1">
                <FileText className="w-6 h-6" />
                Upload Report
                <input type="file" accept=".rpt" className="hidden" onChange={handleFileUpload} />
              </label>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {isRawMode ? (
              <div className="border border-slate-200 rounded-[1.25rem] bg-white shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-600">Raw Input</h3>
                  <span className="text-[10px] font-bold text-slate-500">{rawLines.length} lines</span>
                </div>
                <div className="py-2">
                  {rawLines.map((line) => {
                    const isMatch = !searchQuery || line.content.toLowerCase().includes(searchQuery.toLowerCase());
                    if (!isMatch && !isContextMode && searchQuery) return null;

                    return (
                      <div key={line.id} id={`line-${line.id}`} className={!isMatch && isContextMode ? 'scale-[0.99] origin-left transition-all' : ''}>
                        <LineContent
                          line={line}
                          searchQuery={activeTotalMatches > 1000 ? '' : searchQuery}
                          enableColonPipeFormatting={false}
                          currentMatch={currentRawMatch || null}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {reportData.sections.map((section) => (
                  <div key={section.id} id={section.id} className="scroll-mt-64">
                    <ReportSectionItem 
                      section={section} 
                      searchQuery={searchQuery}
                      isExpandedOverride={globalExpanded}
                      forceExpand={targetExpandId === section.id}
                      isContextMode={isContextMode}
                      currentMatch={currentStructuredMatch}
                      totalMatches={totalMatches}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

interface QuickSearchButtonProps {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  color: 'red' | 'yellow' | 'blue' | 'orange';
}

const QuickSearchButton: React.FC<QuickSearchButtonProps> = ({ label, count, active, onClick, color }) => {
  const styles = {
    red: active ? 'bg-red-600 border-red-600 text-white' : 'bg-white border-red-100 text-red-600 hover:bg-red-50',
    orange: active ? 'bg-orange-600 border-orange-600 text-white' : 'bg-white border-orange-100 text-orange-600 hover:bg-orange-50',
    yellow: active ? 'bg-amber-500 border-amber-500 text-white' : 'bg-white border-amber-100 text-amber-600 hover:bg-amber-50',
    blue: active ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-blue-100 text-blue-600 hover:bg-blue-50',
  };

  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 rounded-xl border-2 text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 active:scale-95 ${styles[color]}`}
    >
      <span className="hidden sm:inline">{label}</span>
      <span className="sm:hidden">{label[0]}</span>
      <span className={`px-2 py-0.5 rounded-md text-[9px] ${active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
        {count}
      </span>
    </button>
  );
};

export default App;
