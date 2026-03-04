import React from 'react';
import { MessageType, ReportLine } from '../types';

interface LineContentProps {
  line: ReportLine;
  searchQuery?: string;
  enableColonPipeFormatting?: boolean;
  currentMatch: {
    lineId: string;
    start: number;
  } | null;
}

const LineContent: React.FC<LineContentProps> = ({ line, searchQuery, currentMatch, enableColonPipeFormatting = true }) => {
  const vscode = (window as any).vscode;
  const lineNumber = (() => {
    const numericSuffix = line.id.match(/(\d+)$/)?.[1];
    const rawIndex = Number(numericSuffix);
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

  const renderHighlightedText = (text: string, offset: number) => {
    if (!searchQuery) {
      return [text];
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

    return result.length > 0 ? result : [text];
  };

  const renderPart = (text: string, offset: number, isBold: boolean) => {
    const toFileHref = (filePath: string) => {
      const normalized = filePath.trim().replace(/\\/g, '/');
      if (/^[A-Za-z]:\//.test(normalized)) {
        return `file:///${normalized}`;
      }
      if (normalized.startsWith('/')) {
        return `file://${normalized}`;
      }
      return normalized;
    };

    const splitTrailingPunctuation = (value: string) => {
      const trailing = value.match(/[\],);.!?]+$/)?.[0] ?? '';
      if (!trailing) {
        return { core: value, trailing: '' };
      }
      return {
        core: value.slice(0, -trailing.length),
        trailing,
      };
    };

    const renderUrlLinks = (segment: string, segmentOffset: number) => {
      const result: React.ReactNode[] = [];
      let cursor = 0;
      const linkPattern = /((?:https?:\/\/|www\.)[^\s<>"']+|(?:[A-Za-z]:[\\/]|\.\.?[\\/]|\/)[^\s<>"']+)/gi;

      for (const match of segment.matchAll(linkPattern)) {
        const matchIndex = match.index ?? 0;
        const linkText = match[0];
        const { core, trailing } = splitTrailingPunctuation(linkText);
        if (!core) {
          continue;
        }

        if (matchIndex > cursor) {
          const plainChunk = segment.slice(cursor, matchIndex);
          result.push(...renderHighlightedText(plainChunk, segmentOffset + cursor));
        }

        const containsHierarchyPipe = core.includes('|');
        if (containsHierarchyPipe) {
          result.push(...renderHighlightedText(core, segmentOffset + matchIndex));
          if (trailing) {
            result.push(...renderHighlightedText(trailing, segmentOffset + matchIndex + core.length));
          }
          cursor = matchIndex + linkText.length;
          continue;
        }

        const isWebUrl = /^(?:https?:\/\/|www\.)/i.test(core);
        const forwardSlashCount = (core.match(/\//g) ?? []).length;
        if (!isWebUrl && forwardSlashCount === 1) {
          result.push(...renderHighlightedText(core, segmentOffset + matchIndex));
          if (trailing) {
            result.push(...renderHighlightedText(trailing, segmentOffset + matchIndex + core.length));
          }
          cursor = matchIndex + linkText.length;
          continue;
        }

        const href = isWebUrl ? (/^https?:\/\//i.test(core) ? core : `https://${core}`) : toFileHref(core);

        const handlePathClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
          if (!isWebUrl && vscode) {
            event.preventDefault();
            vscode.postMessage({
              command: 'openFileAtLocation',
              filePath: core,
              line: 1,
            });
          }
        };

        result.push(
          <a
            key={`link-${segmentOffset + matchIndex}`}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline hover:text-blue-700"
            onClick={handlePathClick}
          >
            {renderHighlightedText(core, segmentOffset + matchIndex)}
          </a>
        );

        if (trailing) {
          result.push(...renderHighlightedText(trailing, segmentOffset + matchIndex + core.length));
        }

        cursor = matchIndex + linkText.length;
      }

      if (cursor < segment.length) {
        result.push(...renderHighlightedText(segment.slice(cursor), segmentOffset + cursor));
      }

      return result.length > 0 ? result : renderHighlightedText(segment, segmentOffset);
    };

    const result: React.ReactNode[] = [];
    let cursor = 0;
    const fileLinePattern = /File:\s*([^\r\n]+?)\s+Line:\s*(\d+)/gi;

    for (const match of text.matchAll(fileLinePattern)) {
      const matchIndex = match.index ?? 0;
      const full = match[0];
      const filePath = match[1].trim();
      const lineText = match[2];
      const lineNumber = Number.parseInt(lineText, 10);

      if (matchIndex > cursor) {
        result.push(...renderUrlLinks(text.slice(cursor, matchIndex), offset + cursor));
      }

      const fileStartInFull = full.indexOf(filePath);
      const filePathStart = matchIndex + Math.max(0, fileStartInFull);
      const lineStartInFull = full.lastIndexOf(lineText);
      const lineStart = matchIndex + Math.max(0, lineStartInFull);
      const fileForwardSlashCount = (filePath.match(/\//g) ?? []).length;

      if (filePath.includes('|') || fileForwardSlashCount === 1) {
        result.push(...renderHighlightedText(full, offset + matchIndex));
        cursor = matchIndex + full.length;
        continue;
      }

      const openInEditor = (event: React.MouseEvent<HTMLAnchorElement>) => {
        if (vscode && Number.isFinite(lineNumber) && lineNumber > 0) {
          event.preventDefault();
          vscode.postMessage({
            command: 'openFileAtLocation',
            filePath,
            line: lineNumber,
          });
        }
      };

      result.push(...renderHighlightedText('File: ', offset + matchIndex));
      result.push(
        <a
          key={`file-${offset + filePathStart}`}
          href={toFileHref(filePath)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline hover:text-blue-700"
          onClick={openInEditor}
        >
          {renderHighlightedText(filePath, offset + filePathStart)}
        </a>
      );
      result.push(...renderHighlightedText(' Line: ', offset + filePathStart + filePath.length));
      result.push(
        <a
          key={`line-${offset + lineStart}`}
          href={toFileHref(filePath)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline hover:text-blue-700"
          onClick={openInEditor}
        >
          {renderHighlightedText(lineText, offset + lineStart)}
        </a>
      );

      cursor = matchIndex + full.length;
    }

    if (cursor < text.length) {
      result.push(...renderUrlLinks(text.slice(cursor), offset + cursor));
    }

    if (result.length === 0) {
      return isBold ? <span className="font-bold">{text}</span> : <>{text}</>;
    }

    return isBold ? <span className="font-bold">{result}</span> : <>{result}</>;
  };
  
  const renderContent = () => {
    const content = line.content;

    if (!enableColonPipeFormatting) {
      return renderPart(content, 0, false);
    }

    const pattern = /([A-Za-z_][A-Za-z0-9_]*):([^|]*)(\|?)/g;
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
