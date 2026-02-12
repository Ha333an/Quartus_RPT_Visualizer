
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
        return 'text-slate-600 border-l-4 border-transparent opacity-80';
    }
  };

  const escapeRegExp = (text: string) => {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  const renderContent = () => {
    if (!searchQuery || !line.content.toLowerCase().includes(searchQuery.toLowerCase())) {
      return line.content;
    }

    try {
      const escapedQuery = escapeRegExp(searchQuery);
      // Split by the search query but keep the matches using a capturing group for highlighting
      const regex = new RegExp(`(${escapedQuery})`, 'gi');
      const parts = line.content.split(regex);
      
      return parts.map((part, i) => 
        part.toLowerCase() === searchQuery.toLowerCase() ? (
          <mark key={i} className="bg-yellow-200 text-slate-900 rounded-sm px-0.5">
            {part}
          </mark>
        ) : part
      );
    } catch (e) {
      // Fallback for extreme cases where regex might still fail
      return line.content;
    }
  };

  return (
    <div className={`mono text-[11px] py-1 px-4 whitespace-pre border-b border-slate-50 last:border-0 ${getLineStyle(line.type)} hover:bg-slate-100 transition-colors`}>
      {renderContent() || ' '}
    </div>
  );
};

export default LineContent;
