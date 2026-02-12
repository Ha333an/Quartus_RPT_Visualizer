"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const types_1 = require("../types");
const LineContent = ({ line, searchQuery }) => {
    const getLineStyle = (type) => {
        switch (type) {
            case types_1.MessageType.ERROR:
                return 'bg-red-50 text-red-700 border-l-4 border-red-500 font-semibold';
            case types_1.MessageType.CRITICAL_WARNING:
                return 'bg-orange-50 text-orange-700 border-l-4 border-orange-500 font-semibold';
            case types_1.MessageType.WARNING:
                return 'bg-yellow-50 text-yellow-700 border-l-4 border-yellow-500';
            case types_1.MessageType.INFO:
                return 'bg-blue-50 text-blue-700 border-l-4 border-blue-400 font-medium';
            default:
                return 'text-slate-600 border-l-4 border-transparent opacity-80';
        }
    };
    const escapeRegExp = (text) => {
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
            return parts.map((part, i) => part.toLowerCase() === searchQuery.toLowerCase() ? ((0, jsx_runtime_1.jsx)("mark", { className: "bg-yellow-200 text-slate-900 rounded-sm px-0.5", children: part }, i)) : part);
        }
        catch (e) {
            // Fallback for extreme cases where regex might still fail
            return line.content;
        }
    };
    return ((0, jsx_runtime_1.jsx)("div", { className: `mono text-[11px] py-1 px-4 whitespace-pre border-b border-slate-50 last:border-0 ${getLineStyle(line.type)} hover:bg-slate-100 transition-colors`, children: renderContent() || ' ' }));
};
exports.default = LineContent;
//# sourceMappingURL=LineContent.js.map