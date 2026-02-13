import React from 'react';
import { MessageType, ReportLine } from '../types';

interface LineContentProps {
  line: ReportLine;
  searchQuery?: string;
  currentMatch: {
    lineId: string;
    start: number;
  } | null;
}

const LineContent: React.FC<LineContentProps> = ({ line, searchQuery, currentMatch }) => {
  const lineNumber = (() => {
    const rawIndex = Number(line.id.replace('line-', ''));
    return Number.isFinite(rawIndex) ? rawIndex + 1 : null;
  })();

  const getLineStyle = (type: MessageType) => {
    switch (type) {
      case MessageType.ERROR:
        return 'bg-red-50 text-red-700 border-l-4 border-red-500 font-semibold';
      case MessageType.CRITICAL_WARNING:
        return 'bg-orange-50 text-orange-700 border-l-4 border-orange-500 font-semibold';
      case MessageType.WARNING:
        return 'bg-yellow-50 text-yellow-700 border-l-4 border-yellow-500';
      case MessageType.INFO:
        return 'bg-blue-50 text-blue-700 border-l-4 border-blue-400 font-medium';
      default:
        return 'text-black border-l-4 border-transparent';
    }
  };

  const escapeRegExp = (text: string) => {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  const renderPart = (text: string, offset: number, isBold: boolean) => {
    if (!searchQuery) {
        return isBold ? <span className="font-bold">{text}</span> : <>{text}</>;
    }

    const result: React.ReactNode[] = [];
    let lastIndex = 0;
    const regex = new RegExp(escapeRegExp(searchQuery), 'gi');

    for (const match of text.matchAll(regex)) {
        const index = match.index!;
        const before = text.substring(lastIndex, index);
        if (before) result.push(before);
        
        const isCurrent = currentMatch && currentMatch.lineId === line.id && (offset + index) === currentMatch.start;

        result.push(
            <mark key={offset + index} className={isCurrent ? "bg-orange-500 text-white rounded-sm px-0.5" : "bg-yellow-200 text-slate-900 rounded-sm px-0.5"}>
                {match[0]}
            </mark>
        );
        lastIndex = index + match[0].length;
    }
    const after = text.substring(lastIndex);
    if (after) result.push(after);

    if (result.length === 0) {
      return isBold ? <span className="font-bold">{text}</span> : <>{text}</>;
    }

    return isBold ? <span className="font-bold">{result}</span> : <>{result}</>;
  };
  
  const renderContent = () => {
    const content = line.content;

    const pattern = /([^:|]*):([^|]*)(\|?)/g;
    const finalResult: React.ReactNode[] = [];
    let cursor = 0;

    for (const match of content.matchAll(pattern)) {
      const matchIndex = match.index ?? 0;
      const module = match[1];
      const instance = match[2];
      const hasPipe = match[3] === '|';

      if (matchIndex > cursor) {
        finalResult.push(renderPart(content.slice(cursor, matchIndex), cursor, false));
      }

      const moduleStart = matchIndex;
      const colonStart = moduleStart + module.length;
      const instanceStart = colonStart + 1;
      const pipeStart = instanceStart + instance.length;

      finalResult.push(renderPart(module, moduleStart, true));
      finalResult.push(':');
      finalResult.push(renderPart(instance, instanceStart, false));

      if (hasPipe) {
        finalResult.push(
          <span key={`pipe-${pipeStart}`} className="text-gray-400">|</span>
        );
      }

      cursor = hasPipe ? pipeStart + 1 : pipeStart;
    }

    if (finalResult.length > 0) {
      if (cursor < content.length) {
        finalResult.push(renderPart(content.slice(cursor), cursor, false));
      }
      return finalResult;
    }
    
    return renderPart(content, 0, false);
  };

  return (
    <div className={`mono text-[11px] py-1 px-4 border-b border-slate-50 last:border-0 ${getLineStyle(line.type)} hover:bg-slate-100 transition-colors`}>
      <div className="flex items-start gap-3">
        <span className="w-12 text-right text-slate-400 select-none border-r border-slate-200 pr-2 shrink-0">
          {lineNumber ?? ''}
        </span>
        <span className="whitespace-pre min-w-0 flex-1">
          {renderContent() || ' '}
        </span>
      </div>
    </div>
  );
};

export default LineContent;
