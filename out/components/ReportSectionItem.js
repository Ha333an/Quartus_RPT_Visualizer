"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = __importStar(require("react"));
const Icons_1 = require("./Icons");
const LineContent_1 = __importDefault(require("./LineContent"));
const ReportSectionItem = ({ section, searchQuery, isExpandedOverride, forceExpand, isContextMode }) => {
    const [isExpanded, setIsExpanded] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        if (isExpandedOverride !== undefined)
            setIsExpanded(isExpandedOverride);
    }, [isExpandedOverride]);
    (0, react_1.useEffect)(() => {
        if (forceExpand)
            setIsExpanded(true);
    }, [forceExpand]);
    // Transform raw lines into logical blocks (standard lines or table objects)
    const blocks = (0, react_1.useMemo)(() => {
        const result = [];
        let i = 0;
        while (i < section.lines.length) {
            const line = section.lines[i];
            const trimmed = line.content.trim();
            // Detection: Quartus tables usually start with a boundary line like +----+
            if (trimmed.startsWith('+') && trimmed.includes('-') && i + 1 < section.lines.length) {
                const tableLines = [];
                let j = i;
                // Gobble lines that belong to this table
                while (j < section.lines.length) {
                    const l = section.lines[j].content.trim();
                    if (l.startsWith('+') || l.startsWith(';')) {
                        tableLines.push(section.lines[j]);
                        j++;
                    }
                    else {
                        break;
                    }
                }
                // If we found a structure that looks like a table block
                if (tableLines.length > 1) {
                    const tableRows = [];
                    tableLines.forEach(tl => {
                        const raw = tl.content.trim();
                        if (raw.startsWith(';')) {
                            // Extract cells: "; cell1 ; cell2 ;" -> ["cell1", "cell2"]
                            const cells = raw.split(';').map(c => c.trim()).filter((c, idx, arr) => {
                                // Keep if it's not the empty first/last split from start/end semicolons
                                if (idx === 0 && raw.startsWith(';'))
                                    return false;
                                if (idx === arr.length - 1 && raw.endsWith(';'))
                                    return false;
                                return true;
                            });
                            if (cells.length > 0)
                                tableRows.push(cells);
                        }
                    });
                    if (tableRows.length > 0) {
                        result.push({
                            type: 'table',
                            id: `table-${i}`,
                            rows: tableRows,
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
    const matchingLinesCount = (0, react_1.useMemo)(() => {
        if (!searchQuery)
            return section.lines.length;
        return section.lines.filter(line => line.content.toLowerCase().includes(searchQuery.toLowerCase())).length;
    }, [section.lines, searchQuery]);
    (0, react_1.useEffect)(() => {
        if (searchQuery && matchingLinesCount > 0 && isExpandedOverride === undefined) {
            setIsExpanded(true);
        }
    }, [searchQuery, matchingLinesCount, isExpandedOverride]);
    if (searchQuery && !isContextMode && matchingLinesCount === 0)
        return null;
    const hasSearchActive = searchQuery.length > 0;
    const renderTable = (block) => {
        const tableMatches = searchQuery ? block.rawLines.some(l => l.content.toLowerCase().includes(searchQuery.toLowerCase())) : true;
        if (!tableMatches && !isContextMode && searchQuery)
            return null;
        const highlightText = (text) => {
            if (!searchQuery)
                return text;
            const parts = text.split(new RegExp(`(${searchQuery.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi'));
            return parts.map((part, i) => part.toLowerCase() === searchQuery.toLowerCase() ?
                (0, jsx_runtime_1.jsx)("mark", { className: "bg-yellow-200 text-slate-900 rounded-sm px-0.5", children: part }, i) : part);
        };
        return ((0, jsx_runtime_1.jsx)("div", { className: `flex flex-col items-start my-2 mx-2 ${!tableMatches && isContextMode ? 'opacity-30' : ''}`, children: (0, jsx_runtime_1.jsx)("div", { className: "overflow-x-auto rounded-xl border border-slate-200 shadow-sm max-w-full", children: (0, jsx_runtime_1.jsx)("table", { className: "text-[11px] text-left border-collapse min-w-max bg-white", children: (0, jsx_runtime_1.jsx)("tbody", { children: block.rows.map((row, ridx) => ((0, jsx_runtime_1.jsx)("tr", { className: `${ridx === 0 ? 'bg-slate-50 font-black border-b border-slate-200' : 'border-b border-slate-50 last:border-0'} hover:bg-slate-100 transition-colors`, children: row.map((cell, cidx) => ((0, jsx_runtime_1.jsx)("td", { className: "px-4 py-2 mono border-r border-slate-50 last:border-0 leading-tight whitespace-nowrap", children: highlightText(cell) }, cidx))) }, ridx))) }) }) }) }));
    };
    return ((0, jsx_runtime_1.jsxs)("div", { className: `border rounded-[1.25rem] bg-white overflow-hidden shadow-sm transition-all duration-300 ${isExpanded ? 'border-blue-200 ring-2 ring-blue-500/5 translate-y-[-2px] shadow-lg' : 'border-slate-200 hover:border-slate-300'}`, children: [(0, jsx_runtime_1.jsx)("button", { onClick: () => setIsExpanded(!isExpanded), className: `w-full flex items-center justify-between px-4 py-4 transition-colors text-left ${isExpanded ? 'bg-blue-50/20' : 'bg-white'}`, children: (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-4", children: [(0, jsx_runtime_1.jsx)("div", { className: `transition-transform duration-300 ${isExpanded ? 'text-blue-500 rotate-0' : 'text-slate-400 rotate-[-90deg]'}`, children: (0, jsx_runtime_1.jsx)(Icons_1.ChevronDown, {}) }), (0, jsx_runtime_1.jsxs)("h3", { className: `font-black text-sm tracking-tight ${isExpanded ? 'text-blue-900' : 'text-slate-800'}`, children: [section.title, (0, jsx_runtime_1.jsx)("span", { className: `ml-4 text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-[0.15em] ${hasSearchActive ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-400'}`, children: isContextMode ? `${matchingLinesCount} matches in ${section.lines.length} lines` : `${matchingLinesCount} matches` })] })] }) }), isExpanded && ((0, jsx_runtime_1.jsx)("div", { className: "bg-white border-t border-slate-100 animate-in fade-in zoom-in-95 duration-200", children: (0, jsx_runtime_1.jsx)("div", { className: "py-2", children: blocks.map((block, idx) => {
                        if (block.type === 'table')
                            return (0, jsx_runtime_1.jsx)(react_1.default.Fragment, { children: renderTable(block) }, block.id);
                        const line = block.data;
                        const isMatch = !searchQuery || line.content.toLowerCase().includes(searchQuery.toLowerCase());
                        if (!isMatch && !isContextMode && searchQuery)
                            return null;
                        return ((0, jsx_runtime_1.jsx)("div", { className: !isMatch && isContextMode ? 'opacity-30 grayscale-[0.5] scale-[0.99] origin-left transition-all' : '', children: (0, jsx_runtime_1.jsx)(LineContent_1.default, { line: line, searchQuery: searchQuery }) }, line.id));
                    }) }) }))] }));
};
exports.default = ReportSectionItem;
//# sourceMappingURL=ReportSectionItem.js.map