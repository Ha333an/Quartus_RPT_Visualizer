import React from 'react';
import { MessageType, ReportLine } from '../types';

interface LineContentProps {
  line: ReportLine;
  searchQuery?: string;
}

const LineContent: React.FC<LineContentProps> = ({ line, searchQuery }) => {
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

  const highlight = (text: string) => {
    if (!searchQuery || !text.toLowerCase().includes(searchQuery.toLowerCase())) {
      return text;
    }

    try {
      const escapedQuery = escapeRegExp(searchQuery);
      const regex = new RegExp(`(${escapedQuery})`, 'gi');
      const parts = text.split(regex);
      
      return parts.map((part, i) => 
        part.toLowerCase() === searchQuery.toLowerCase() ? (
          <mark key={i} className="bg-yellow-200 text-slate-900 rounded-sm px-0.5">
            {part}
          </mark>
        ) : part
      );
    } catch (e) {
      return text;
    }
  };
  
  const renderContent = () => {
    const content = line.content;
    const isSignalPathLike = content.includes(':');

    if (isSignalPathLike) {
      return content.split('|').map((part, index) => {
        const subParts = part.split(':');
        if (subParts.length > 1) {
          const module = subParts[0];
          const instance = subParts.slice(1).join(":");
          return (
            <React.Fragment key={index}>
              {index > 0 && <span className="text-gray-400">|</span>}
              <span className="font-bold">{highlight(module)}</span>
              <span>:</span>
              {highlight(instance)}
            </React.Fragment>
          );
        }
        return (
          <React.Fragment key={index}>
            {index > 0 && <span className="text-gray-400">|</span>}
            {highlight(part)}
          </React.Fragment>
        );
      });
    }
    
    return highlight(content);
  };

  return (
    <div className={`mono text-[11px] py-1 px-4 whitespace-pre border-b border-slate-50 last:border-0 ${getLineStyle(line.type)} hover:bg-slate-100 transition-colors`}>
      {renderContent() || ' '}
    </div>
  );
};

export default LineContent;
