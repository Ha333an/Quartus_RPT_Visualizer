
import React, { useState, useEffect, useMemo } from 'react';
import { ReportSection, ReportLine } from '../types';
import { ChevronDown } from './Icons';
import LineContent from './LineContent';

interface ReportSectionItemProps {
  section: ReportSection;
  searchQuery: string;
  isExpandedOverride?: boolean;
  forceExpand?: boolean;
  isContextMode?: boolean;
  totalMatches: number;
  currentMatch: {
    sectionId: string;
    lineId: string;
    start: number;
  } | null;
}

type ContentBlock = {
  type: 'line';
  data: ReportLine;
} | {
  type: 'table';
  id: string;
  title?: string;
  rows: { cells: string[]; lineId: string }[];
  rawLines: ReportLine[];
};

const ReportSectionItem: React.FC<ReportSectionItemProps> = ({ 
  section, 
  searchQuery,
  isExpandedOverride,
  forceExpand,
  isContextMode,
  totalMatches,
  currentMatch,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (isExpandedOverride !== undefined) setIsExpanded(isExpandedOverride);
  }, [isExpandedOverride]);

  useEffect(() => {
    if (forceExpand) setIsExpanded(true);
  }, [forceExpand]);

  // Transform raw lines into logical blocks (standard lines or table objects)
  const blocks = useMemo(() => {
    const result: ContentBlock[] = [];
    let i = 0;
    
    while (i < section.lines.length) {
      const line = section.lines[i];
      const trimmed = line.content.trim();
      
      // Detection: Quartus tables usually start with a boundary line like +----+
      if (trimmed.startsWith('+') && trimmed.includes('-') && i + 1 < section.lines.length) {
        const tableLines: ReportLine[] = [];
        let j = i;
        
        // Gobble lines that belong to this table
        while (j < section.lines.length) {
          const l = section.lines[j].content.trim();
          if (l.startsWith('+') || l.startsWith(';')) {
            tableLines.push(section.lines[j]);
            j++;
          } else {
            break;
          }
        }
        
        // If we found a structure that looks like a table block
        if (tableLines.length > 1) {
          const tableRows: { cells: string[]; lineId: string }[] = [];
          tableLines.forEach(tl => {
            const raw = tl.content.trim();
            if (raw.startsWith(';')) {
              // Extract cells: "; cell1 ; cell2 ;" -> ["cell1", "cell2"]
              const cells = raw.split(';').map(c => c.trim()).filter((c, idx, arr) => {
                // Keep if it's not the empty first/last split from start/end semicolons
                if (idx === 0 && raw.startsWith(';')) return false;
                if (idx === arr.length - 1 && raw.endsWith(';')) return false;
                return true;
              });
              if (cells.length > 0) tableRows.push({ cells, lineId: tl.id });
            }
          });

          if (tableRows.length > 0) {
            let tableTitle: string | undefined;
            let tableDataRows = tableRows;

            if (tableRows.length > 1 && tableRows[0].cells.length === 1) {
              tableTitle = tableRows[0].cells[0];
              tableDataRows = tableRows.slice(1);
            }

            result.push({
              type: 'table',
              id: `table-${i}`,
              title: tableTitle,
              rows: tableDataRows,
              rawLines: tableLines
            });
            i = j;
            continue;
          }
        }
      }
      
      result.push({ type: 'line', data: line });
      i++;
    }
    return result;
  }, [section.lines]);

  const matchingLinesCount = useMemo(() => {
    if (!searchQuery) return section.lines.length;
    return section.lines.filter(line => 
      line.content.toLowerCase().includes(searchQuery.toLowerCase())
    ).length;
  }, [section.lines, searchQuery]);

  useEffect(() => {
    if (searchQuery && matchingLinesCount > 0 && isExpandedOverride === undefined) {
      setIsExpanded(true);
    }
  }, [searchQuery, matchingLinesCount, isExpandedOverride]);

  if (searchQuery && !isContextMode && matchingLinesCount === 0) return null;

  const hasSearchActive = searchQuery.length > 0;

  const renderTable = (block: Extract<ContentBlock, { type: 'table' }>) => {
    const effectiveSearchQuery = totalMatches > 1000 ? '' : searchQuery;
    const tableMatches = effectiveSearchQuery ? block.rawLines.some(l => l.content.toLowerCase().includes(effectiveSearchQuery.toLowerCase())) : true;
    
    if (!tableMatches && !isContextMode && effectiveSearchQuery) return null;

    const highlightText = (text: string) => {
      if (!effectiveSearchQuery) return text;
      const parts = text.split(new RegExp(`(${effectiveSearchQuery.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi'));
      return parts.map((part, i) => 
        part.toLowerCase() === effectiveSearchQuery.toLowerCase() ? 
          <mark key={i} className="bg-yellow-200 text-slate-900 rounded-sm px-0.5">{part}</mark> : part
      );
    };

    const renderFormattedCell = (text: string) => {
      const pattern = /([^:|]*):([^|]*)(\|?)/g;
      const result: React.ReactNode[] = [];
      let cursor = 0;
      let keyIndex = 0;

      for (const match of text.matchAll(pattern)) {
        const matchIndex = match.index ?? 0;
        const module = match[1];
        const instance = match[2];
        const hasPipe = match[3] === '|';

        if (matchIndex > cursor) {
          result.push(
            <React.Fragment key={`cell-before-${keyIndex++}`}>
              {highlightText(text.slice(cursor, matchIndex))}
            </React.Fragment>
          );
        }

        result.push(
          <span key={`cell-module-${keyIndex++}`} className="font-bold">
            {highlightText(module)}
          </span>
        );
        result.push(
          <React.Fragment key={`cell-colon-${keyIndex++}`}>:</React.Fragment>
        );
        result.push(
          <React.Fragment key={`cell-instance-${keyIndex++}`}>
            {highlightText(instance)}
          </React.Fragment>
        );

        if (hasPipe) {
          result.push(
            <span key={`cell-pipe-${keyIndex++}`} className="text-gray-400">|</span>
          );
        }

        const nextCursor = matchIndex + module.length + 1 + instance.length + (hasPipe ? 1 : 0);
        cursor = nextCursor;
      }

      if (result.length === 0) {
        return highlightText(text);
      }

      if (cursor < text.length) {
        result.push(
          <React.Fragment key={`cell-after-${keyIndex++}`}>
            {highlightText(text.slice(cursor))}
          </React.Fragment>
        );
      }

      return result;
    };

    return (
      <div className="flex flex-col items-start my-2 mx-2">
        {block.title && (
          <div className="mono text-[11px] font-black text-slate-700 mb-1 px-2">
            {block.title}
          </div>
        )}
        <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm max-w-full">
          <table className="text-[11px] text-left border-collapse min-w-max bg-white">
            <tbody>
              {block.rows.map((row, ridx) => {
                const rowClasses = ["last:border-0", "hover:bg-slate-100", "transition-colors"];
                if (ridx === 0) {
                  rowClasses.push("bg-slate-50", "font-black", "border-b", "border-slate-200");
                } else {
                  rowClasses.push("border-b", "border-slate-50");
                  if (ridx % 2 !== 0) {
                    rowClasses.push("bg-slate-50");
                  } else {
                    rowClasses.push("bg-white");
                  }
                }

                return (
                  <tr key={row.lineId} id={`line-${row.lineId}`} className={rowClasses.join(' ')}>
                    {row.cells.map((cell, cidx) => {
                      const cellClasses = [
                        "px-4", "py-2", "mono", "border-r", 
                        "border-slate-50", "last:border-0", 
                        "leading-tight", "whitespace-nowrap"
                      ];
                      
                      if (cidx === 0) {
                        cellClasses.push("sticky", "left-0");
                        if (ridx === 0) {
                          cellClasses.push("bg-slate-50");
                        } else {
                          if (ridx % 2 !== 0) {
                            cellClasses.push("bg-slate-50");
                          } else {
                            cellClasses.push("bg-white");
                          }
                        }
                      }

                      return (
                        <td key={cidx} className={cellClasses.join(' ')}>
                          {renderFormattedCell(cell)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className={`border rounded-[1.25rem] bg-white overflow-hidden shadow-sm transition-all duration-300 ${isExpanded ? 'border-blue-200 ring-2 ring-blue-500/5 translate-y-[-2px] shadow-lg' : 'border-slate-200 hover:border-slate-300'}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full flex items-center justify-between px-4 py-4 transition-colors text-left ${isExpanded ? 'bg-blue-50/20' : 'bg-white'}`}
      >
        <div className="flex items-center gap-4">
          <div className={`transition-transform duration-300 ${isExpanded ? 'text-blue-500 rotate-0' : 'text-slate-400 rotate-[-90deg]'}`}>
            <ChevronDown />
          </div>
          <h3 className={`font-black text-sm tracking-tight ${isExpanded ? 'text-blue-900' : 'text-slate-800'}`}>
            {section.title}
            <span className={`ml-4 text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-[0.15em] ${hasSearchActive ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-400'}`}>
              {isContextMode ? `${matchingLinesCount} matches in ${section.lines.length} lines` : `${matchingLinesCount} matches`}
            </span>
          </h3>
        </div>
      </button>

      {isExpanded && (
        <div className="bg-white border-t border-slate-100 animate-in fade-in zoom-in-95 duration-200">
          <div className="py-2">
            {blocks.map((block, idx) => {
              if (block.type === 'table') return <React.Fragment key={block.id}>{renderTable(block)}</React.Fragment>;
              
              const line = block.data;
              const isMatch = !searchQuery || line.content.toLowerCase().includes(searchQuery.toLowerCase());
              if (!isMatch && !isContextMode && searchQuery) return null;

              return (
                <div key={line.id} id={`line-${line.id}`} className={!isMatch && isContextMode ? 'scale-[0.99] origin-left transition-all' : ''}>
                  <LineContent
                    line={line}
                    searchQuery={totalMatches > 1000 ? '' : searchQuery}
                    currentMatch={currentMatch}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportSectionItem;
