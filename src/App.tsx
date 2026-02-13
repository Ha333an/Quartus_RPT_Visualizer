
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { MessageType, ReportData } from './types';
import { parseRptFile } from './utils/parser';
import ReportSectionItem from './components/ReportSectionItem';
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
  const [isBackendProcessing, setIsBackendProcessing] = useState(Boolean(vscode));
  const [searchQuery, setSearchQuery] = useState('');
  const [rawSearchQuery, setRawSearchQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(rawSearchQuery);
    }, 250); // 250ms delay
    return () => clearTimeout(timer);
  }, [rawSearchQuery]);
  const [globalExpanded, setGlobalExpanded] = useState<boolean | undefined>(false);
  const [targetExpandId, setTargetExpandId] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isContextMode, setIsContextMode] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // VS Code Message Listener: This allows the extension to push data to the webview
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      switch (message.command) {
        case 'processing':
          setIsBackendProcessing(Boolean(message.active));
          break;
        case 'setData':
          const parsed = parseRptFile(message.data);
          setReportData(parsed);
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
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsBackendProcessing(true);
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const parsed = parseRptFile(text);
        setReportData(parsed);
        setGlobalExpanded(false);
        setRawSearchQuery('');
        setTargetExpandId(null);
        setIsBackendProcessing(false);
      };
      reader.onerror = () => {
        setIsBackendProcessing(false);
      };
      reader.readAsText(file);
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

  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);
  const currentMatch = allMatches[currentMatchIndex];

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

  const goToNextMatch = () => {
    if (allMatches.length === 0) return;
    setCurrentMatchIndex(i => (i + 1) % allMatches.length);
  };

  const goToPrevMatch = () => {
    if (allMatches.length === 0) return;
    setCurrentMatchIndex(i => (i - 1 + allMatches.length) % allMatches.length);
  };

  useEffect(() => {
    if (currentMatch) {
      setTargetExpandId(currentMatch.sectionId);

      let attempts = 0;
      const maxAttempts = 8;

      const tryScrollToMatch = () => {
        const el = document.getElementById(`line-${currentMatch.lineId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return;
        }

        attempts += 1;
        if (attempts < maxAttempts) {
          setTimeout(tryScrollToMatch, 80);
          return;
        }

        const sectionEl = document.getElementById(currentMatch.sectionId);
        if (sectionEl) {
          sectionEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      };

      setTimeout(tryScrollToMatch, 60);
    }
  }, [currentMatch]);

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
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="z-[60] bg-[#0f172a] text-white shadow-xl">
        <div className="max-w-[98%] mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 p-2 rounded-xl shadow-inner">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight leading-none">{detectedReportTitle}</h1>
              <p className="text-[10px] text-blue-400 font-bold uppercase tracking-[0.15em] mt-1">
                {vscode ? 'VS Code Extension' : 'Professional Visualizer'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {!reportData ? (
              <label className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold cursor-pointer transition-all shadow-lg transform active:scale-95">
                Load .rpt File
                <input type="file" accept=".rpt" className="hidden" onChange={handleFileUpload} />
              </label>
            ) : (
              <button 
                onClick={() => setReportData(null)}
                className="text-slate-400 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors py-2 px-4 border border-slate-700 rounded-lg hover:border-slate-500"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </header>

      {reportData && (
        <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
          <div className="max-w-[98%] mx-auto px-4 py-4 space-y-4">
            {isBackendProcessing && (
              <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-blue-200 bg-blue-50 text-blue-700">
                <span className="w-3 h-3 rounded-full border-2 border-blue-300 border-t-blue-600 animate-spin" />
                <span className="text-[10px] font-black uppercase tracking-widest">Backend Processing...</span>
              </div>
            )}
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-grow group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search className={`w-4 h-4 transition-colors ${searchQuery ? 'text-blue-500' : 'text-slate-400'}`} />
                </div>
                <input
                  type="text"
                  placeholder="Search design results..."
                  value={rawSearchQuery}
                  onChange={(e) => setRawSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-10 py-3.5 bg-slate-100 border-transparent border-2 focus:bg-white focus:border-blue-500 rounded-2xl outline-none text-slate-900 font-bold transition-all"
                />
                {rawSearchQuery && (
                  <button onClick={() => setRawSearchQuery('')} className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-red-500 transition-colors">
                    <XCircle className="w-5 h-5" />
                  </button>
                )}
              </div>

              <div className="relative" ref={menuRef}>
                <button 
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="h-full px-6 py-3.5 bg-white border-2 border-slate-200 rounded-2xl text-slate-700 hover:border-blue-300 font-black text-xs uppercase tracking-widest flex items-center justify-between gap-4 transition-all active:scale-95 min-w-[240px]"
                >
                  <span className="truncate">Go to Section...</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {isMenuOpen && (
                  <div className="absolute top-full right-0 mt-2 w-full md:w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 max-h-96 overflow-y-auto z-50 animate-in fade-in slide-in-from-top-2">
                    {reportData.sections.map(section => (
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

            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <QuickSearchButton label="Errors" count={messageCounts.error} active={rawSearchQuery === 'Error ('} onClick={() => handleQuickSearch(MessageType.ERROR)} color="red" />
                <QuickSearchButton label="Critical Warnings" count={messageCounts.critical} active={rawSearchQuery === 'Critical Warning ('} onClick={() => handleQuickSearch(MessageType.CRITICAL_WARNING)} color="orange" />
                <QuickSearchButton label="Warnings" count={messageCounts.warn} active={rawSearchQuery === 'Warning ('} onClick={() => handleQuickSearch(MessageType.WARNING)} color="yellow" />
                <QuickSearchButton label="Info" count={messageCounts.info} active={rawSearchQuery === 'Info ('} onClick={() => handleQuickSearch(MessageType.INFO)} color="blue" />
                
                <div className="w-px h-6 bg-slate-200 mx-1" />
                
                <button
                  onClick={clearFilters}
                  className={`px-4 py-2.5 rounded-xl border-2 text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 active:scale-95 border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300 ${!rawSearchQuery ? 'opacity-40 cursor-not-allowed' : ''}`}
                  disabled={!rawSearchQuery}
                >
                  Clear Filters
                </button>

                {searchQuery && (
                  <>
                    <div className="flex items-center gap-3 border-2 border-slate-200 rounded-xl px-3 py-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                        {totalMatches > 1000 ? '>1k' : totalMatches}
                        <span className="hidden sm:inline"> Matches</span>
                      </span>
                      {totalMatches > 0 && totalMatches <= 1000 && (
                        <>
                          <div className="w-px h-4 bg-slate-200" />
                          <button onClick={goToPrevMatch} className="text-slate-500 hover:text-blue-600 transition-colors p-1 rounded-md disabled:opacity-30 disabled:hover:text-slate-500" disabled={allMatches.length === 0}>&lt;</button>
                          <span className="text-[10px] font-bold text-slate-400">{currentMatchIndex + 1} / {allMatches.length}</span>
                          <button onClick={goToNextMatch} className="text-slate-500 hover:text-blue-600 transition-colors p-1 rounded-md disabled:opacity-30 disabled:hover:text-slate-500" disabled={allMatches.length === 0}>&gt;</button>
                        </>
                      )}
                    </div>
                    <button
                      onClick={() => setIsContextMode(!isContextMode)}
                      className={`px-4 py-2.5 rounded-xl border-2 text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 active:scale-95 shadow-sm ${isContextMode ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-indigo-100 text-indigo-600 hover:bg-indigo-50'}`}
                    >
                      {isContextMode ? 'Hide Rest' : 'Show Rest'}
                    </button>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl">
                <button onClick={() => setGlobalExpanded(true)} className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-slate-900 transition-colors">Expand All</button>
                <div className="w-px h-4 bg-slate-200" />
                <button onClick={() => setGlobalExpanded(false)} className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-slate-900 transition-colors">Collapse All</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="flex-grow max-w-[98%] mx-auto w-full px-4 py-8">
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
            <div className="space-y-4">
              {reportData.sections.map((section) => (
                <div key={section.id} id={section.id} className="scroll-mt-64">
                  <ReportSectionItem 
                    section={section} 
                    searchQuery={searchQuery}
                    isExpandedOverride={globalExpanded}
                    forceExpand={targetExpandId === section.id}
                    isContextMode={isContextMode}
                    currentMatch={currentMatch}
                    totalMatches={totalMatches}
                  />
                </div>
              ))}
            </div>
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
      className={`px-4 py-2.5 rounded-xl border-2 text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 active:scale-95 ${styles[color]}`}
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
