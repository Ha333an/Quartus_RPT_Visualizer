"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const types_1 = require("./types");
const parser_1 = require("./utils/parser");
const ReportSectionItem_1 = __importDefault(require("./components/ReportSectionItem"));
const Icons_1 = require("./components/Icons");
// Access the VS Code API initialized in index.html
const vscode = window.vscode;
const App = () => {
    const [reportData, setReportData] = (0, react_1.useState)(null);
    const [searchQuery, setSearchQuery] = (0, react_1.useState)('');
    const [isHeaderExpanded, setIsHeaderExpanded] = (0, react_1.useState)(false);
    const [globalExpanded, setGlobalExpanded] = (0, react_1.useState)(false);
    const [targetExpandId, setTargetExpandId] = (0, react_1.useState)(null);
    const [isMenuOpen, setIsMenuOpen] = (0, react_1.useState)(false);
    const [isContextMode, setIsContextMode] = (0, react_1.useState)(false);
    const menuRef = (0, react_1.useRef)(null);
    // VS Code Message Listener: This allows the extension to push data to the webview
    (0, react_1.useEffect)(() => {
        const handleMessage = (event) => {
            const message = event.data;
            switch (message.command) {
                case 'setData':
                    const parsed = (0, parser_1.parseRptFile)(message.data);
                    setReportData(parsed);
                    break;
                case 'setSearch':
                    setSearchQuery(message.text || '');
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
    (0, react_1.useEffect)(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    const handleFileUpload = (event) => {
        var _a;
        const file = (_a = event.target.files) === null || _a === void 0 ? void 0 : _a[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                var _a;
                const text = (_a = e.target) === null || _a === void 0 ? void 0 : _a.result;
                const parsed = (0, parser_1.parseRptFile)(text);
                setReportData(parsed);
                setGlobalExpanded(false);
                setSearchQuery('');
                setTargetExpandId(null);
            };
            reader.readAsText(file);
        }
    };
    const handleQuickSearch = (type) => {
        let query = '';
        switch (type) {
            case types_1.MessageType.ERROR:
                query = 'Error (';
                break;
            case types_1.MessageType.CRITICAL_WARNING:
                query = 'Critical Warning (';
                break;
            case types_1.MessageType.WARNING:
                query = 'Warning (';
                break;
            case types_1.MessageType.INFO:
                query = 'Info (';
                break;
        }
        setSearchQuery(query);
        setGlobalExpanded(undefined);
    };
    const clearFilters = () => {
        setSearchQuery('');
        setGlobalExpanded(undefined);
        setIsContextMode(false);
    };
    const messageCounts = (0, react_1.useMemo)(() => {
        if (!reportData)
            return { info: 0, warn: 0, critical: 0, error: 0 };
        let counts = { info: 0, warn: 0, critical: 0, error: 0 };
        reportData.sections.forEach(s => {
            s.lines.forEach(l => {
                if (l.type === types_1.MessageType.INFO)
                    counts.info++;
                if (l.type === types_1.MessageType.WARNING)
                    counts.warn++;
                if (l.type === types_1.MessageType.CRITICAL_WARNING)
                    counts.critical++;
                if (l.type === types_1.MessageType.ERROR)
                    counts.error++;
            });
        });
        return counts;
    }, [reportData]);
    const jumpToSection = (sectionId) => {
        setSearchQuery('');
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
    return ((0, jsx_runtime_1.jsxs)("div", { className: "min-h-screen flex flex-col bg-slate-50", children: [(0, jsx_runtime_1.jsx)("header", { className: "z-[60] bg-[#0f172a] text-white shadow-xl", children: (0, jsx_runtime_1.jsxs)("div", { className: "max-w-[98%] mx-auto px-4 h-16 flex items-center justify-between", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-4", children: [(0, jsx_runtime_1.jsx)("div", { className: "bg-blue-600 p-2 rounded-xl shadow-inner", children: (0, jsx_runtime_1.jsx)(Icons_1.FileText, { className: "w-6 h-6 text-white" }) }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h1", { className: "text-xl font-black tracking-tight leading-none uppercase", children: "Quartus RPT" }), (0, jsx_runtime_1.jsx)("p", { className: "text-[10px] text-blue-400 font-bold uppercase tracking-[0.15em] mt-1", children: vscode ? 'VS Code Extension' : 'Professional Visualizer' })] })] }), (0, jsx_runtime_1.jsx)("div", { className: "flex items-center gap-4", children: !reportData ? ((0, jsx_runtime_1.jsxs)("label", { className: "bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold cursor-pointer transition-all shadow-lg transform active:scale-95", children: ["Load .rpt File", (0, jsx_runtime_1.jsx)("input", { type: "file", accept: ".rpt", className: "hidden", onChange: handleFileUpload })] })) : ((0, jsx_runtime_1.jsx)("button", { onClick: () => setReportData(null), className: "text-slate-400 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors py-2 px-4 border border-slate-700 rounded-lg hover:border-slate-500", children: "Reset" })) })] }) }), reportData && ((0, jsx_runtime_1.jsx)("div", { className: "sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm", children: (0, jsx_runtime_1.jsxs)("div", { className: "max-w-[98%] mx-auto px-4 py-4 space-y-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col md:flex-row gap-3", children: [(0, jsx_runtime_1.jsxs)("div", { className: "relative flex-grow group", children: [(0, jsx_runtime_1.jsx)("div", { className: "absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none", children: (0, jsx_runtime_1.jsx)(Icons_1.Search, { className: `w-4 h-4 transition-colors ${searchQuery ? 'text-blue-500' : 'text-slate-400'}` }) }), (0, jsx_runtime_1.jsx)("input", { type: "text", placeholder: "Search design results...", value: searchQuery, onChange: (e) => setSearchQuery(e.target.value), className: "w-full pl-11 pr-10 py-3.5 bg-slate-100 border-transparent border-2 focus:bg-white focus:border-blue-500 rounded-2xl outline-none text-slate-900 font-bold transition-all" }), searchQuery && ((0, jsx_runtime_1.jsx)("button", { onClick: () => setSearchQuery(''), className: "absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-red-500 transition-colors", children: (0, jsx_runtime_1.jsx)(Icons_1.XCircle, { className: "w-5 h-5" }) }))] }), (0, jsx_runtime_1.jsxs)("div", { className: "relative", ref: menuRef, children: [(0, jsx_runtime_1.jsxs)("button", { onClick: () => setIsMenuOpen(!isMenuOpen), className: "h-full px-6 py-3.5 bg-white border-2 border-slate-200 rounded-2xl text-slate-700 hover:border-blue-300 font-black text-xs uppercase tracking-widest flex items-center justify-between gap-4 transition-all active:scale-95 min-w-[240px]", children: [(0, jsx_runtime_1.jsx)("span", { className: "truncate", children: "Go to Section..." }), (0, jsx_runtime_1.jsx)(Icons_1.ChevronDown, { className: `w-4 h-4 transition-transform ${isMenuOpen ? 'rotate-180' : ''}` })] }), isMenuOpen && ((0, jsx_runtime_1.jsx)("div", { className: "absolute top-full right-0 mt-2 w-full md:w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 max-h-96 overflow-y-auto z-50 animate-in fade-in slide-in-from-top-2", children: reportData.sections.map(section => ((0, jsx_runtime_1.jsx)("button", { onClick: () => jumpToSection(section.id), className: "w-full text-left px-5 py-3 hover:bg-blue-50 text-[11px] font-bold text-slate-600 hover:text-blue-700 transition-colors border-b border-slate-50 last:border-0 truncate", children: section.title }, section.id))) }))] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-wrap items-center justify-between gap-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex flex-wrap items-center gap-2", children: [(0, jsx_runtime_1.jsx)(QuickSearchButton, { label: "Errors", count: messageCounts.error, active: searchQuery === 'Error (', onClick: () => handleQuickSearch(types_1.MessageType.ERROR), color: "red" }), (0, jsx_runtime_1.jsx)(QuickSearchButton, { label: "Critical Warnings", count: messageCounts.critical, active: searchQuery === 'Critical Warning (', onClick: () => handleQuickSearch(types_1.MessageType.CRITICAL_WARNING), color: "orange" }), (0, jsx_runtime_1.jsx)(QuickSearchButton, { label: "Warnings", count: messageCounts.warn, active: searchQuery === 'Warning (', onClick: () => handleQuickSearch(types_1.MessageType.WARNING), color: "yellow" }), (0, jsx_runtime_1.jsx)(QuickSearchButton, { label: "Info", count: messageCounts.info, active: searchQuery === 'Info (', onClick: () => handleQuickSearch(types_1.MessageType.INFO), color: "blue" }), (0, jsx_runtime_1.jsx)("div", { className: "w-px h-6 bg-slate-200 mx-1" }), (0, jsx_runtime_1.jsx)("button", { onClick: clearFilters, className: `px-4 py-2.5 rounded-xl border-2 text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 active:scale-95 border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300 ${!searchQuery ? 'opacity-40 cursor-not-allowed' : ''}`, disabled: !searchQuery, children: "Clear Filters" }), searchQuery && ((0, jsx_runtime_1.jsx)("button", { onClick: () => setIsContextMode(!isContextMode), className: `px-4 py-2.5 rounded-xl border-2 text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 active:scale-95 shadow-sm ${isContextMode ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-indigo-100 text-indigo-600 hover:bg-indigo-50'}`, children: isContextMode ? 'Hide Rest' : 'Show Rest' }))] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl", children: [(0, jsx_runtime_1.jsx)("button", { onClick: () => setGlobalExpanded(true), className: "px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-slate-900 transition-colors", children: "Expand All" }), (0, jsx_runtime_1.jsx)("div", { className: "w-px h-4 bg-slate-200" }), (0, jsx_runtime_1.jsx)("button", { onClick: () => setGlobalExpanded(false), className: "px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-slate-900 transition-colors", children: "Collapse All" })] })] })] }) })), (0, jsx_runtime_1.jsx)("main", { className: "flex-grow max-w-[98%] mx-auto w-full px-4 py-8", children: !reportData ? ((0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col items-center justify-center min-h-[60vh] text-center", children: [(0, jsx_runtime_1.jsx)("div", { className: "w-24 h-24 bg-white rounded-[2.5rem] flex items-center justify-center mb-10 shadow-2xl border border-slate-100 rotate-3 hover:rotate-0 transition-transform", children: (0, jsx_runtime_1.jsx)(Icons_1.FileText, { className: "w-12 h-12 text-blue-600" }) }), (0, jsx_runtime_1.jsx)("h2", { className: "text-4xl font-black text-slate-900 mb-4 tracking-tight", children: vscode ? 'Waiting for Report Data...' : 'Quartus Report Visualizer' }), (0, jsx_runtime_1.jsx)("p", { className: "text-slate-500 max-w-lg mb-12 text-lg leading-relaxed font-medium", children: vscode
                                ? 'Open a .rpt file in VS Code to see it visualized here automatically.'
                                : 'Upload your .rpt file to analyze design results with professional tools.' }), !vscode && ((0, jsx_runtime_1.jsxs)("label", { className: "flex items-center gap-4 bg-blue-600 hover:bg-blue-500 text-white px-12 py-5 rounded-2xl font-black text-lg cursor-pointer transition-all shadow-2xl hover:shadow-blue-500/20 transform hover:-translate-y-1", children: [(0, jsx_runtime_1.jsx)(Icons_1.FileText, { className: "w-6 h-6" }), "Upload Report", (0, jsx_runtime_1.jsx)("input", { type: "file", accept: ".rpt", className: "hidden", onChange: handleFileUpload })] }))] })) : ((0, jsx_runtime_1.jsxs)("div", { className: "space-y-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "mb-8 bg-slate-900 rounded-3xl p-8 shadow-2xl overflow-hidden relative group", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between mb-6", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-3 text-slate-400", children: [(0, jsx_runtime_1.jsx)(Icons_1.Info, { className: "w-4 h-4" }), (0, jsx_runtime_1.jsx)("span", { className: "text-[10px] font-black uppercase tracking-[0.2em]", children: "Build Metadata" })] }), (0, jsx_runtime_1.jsx)("button", { onClick: () => setIsHeaderExpanded(!isHeaderExpanded), className: "text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors", children: isHeaderExpanded ? 'Hide Details' : 'Show Details' })] }), (0, jsx_runtime_1.jsx)("div", { className: `transition-all duration-500 ease-in-out overflow-hidden ${isHeaderExpanded ? 'max-h-[800px] opacity-100' : 'max-h-12 opacity-80'}`, children: reportData.headerInfo.map((line, i) => ((0, jsx_runtime_1.jsx)("div", { className: "font-mono text-[11px] text-slate-300 leading-relaxed mb-1 selection:bg-blue-500/30", children: line }, i))) })] }), (0, jsx_runtime_1.jsx)("div", { className: "space-y-4 pb-60", children: reportData.sections.map((section) => ((0, jsx_runtime_1.jsx)("div", { id: section.id, className: "scroll-mt-64", children: (0, jsx_runtime_1.jsx)(ReportSectionItem_1.default, { section: section, searchQuery: searchQuery, isExpandedOverride: globalExpanded, forceExpand: targetExpandId === section.id, isContextMode: isContextMode }) }, section.id))) })] })) }), reportData && ((0, jsx_runtime_1.jsxs)("div", { className: "fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white px-8 py-4 rounded-full shadow-2xl flex items-center gap-8 border border-white/10 animate-in slide-in-from-bottom-8", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2", children: [(0, jsx_runtime_1.jsx)("div", { className: "w-2 h-2 rounded-full bg-green-500 animate-pulse" }), (0, jsx_runtime_1.jsx)("span", { className: "text-[10px] font-black uppercase tracking-widest opacity-80", children: vscode ? 'Extension Active' : 'Live Session' })] }), (0, jsx_runtime_1.jsx)("div", { className: "h-4 w-px bg-white/20" }), (0, jsx_runtime_1.jsxs)("div", { className: "text-[10px] font-bold flex gap-6", children: [(0, jsx_runtime_1.jsxs)("span", { className: "text-red-400", children: [messageCounts.error, " E"] }), (0, jsx_runtime_1.jsxs)("span", { className: "text-orange-400", children: [messageCounts.critical, " C"] }), (0, jsx_runtime_1.jsxs)("span", { className: "text-amber-400", children: [messageCounts.warn, " W"] }), (0, jsx_runtime_1.jsxs)("span", { className: "text-blue-400", children: [messageCounts.info, " I"] })] })] }))] }));
};
const QuickSearchButton = ({ label, count, active, onClick, color }) => {
    const styles = {
        red: active ? 'bg-red-600 border-red-600 text-white' : 'bg-white border-red-100 text-red-600 hover:bg-red-50',
        orange: active ? 'bg-orange-600 border-orange-600 text-white' : 'bg-white border-orange-100 text-orange-600 hover:bg-orange-50',
        yellow: active ? 'bg-amber-500 border-amber-500 text-white' : 'bg-white border-amber-100 text-amber-600 hover:bg-amber-50',
        blue: active ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-blue-100 text-blue-600 hover:bg-blue-50',
    };
    return ((0, jsx_runtime_1.jsxs)("button", { onClick: onClick, className: `px-4 py-2.5 rounded-xl border-2 text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 active:scale-95 ${styles[color]}`, children: [(0, jsx_runtime_1.jsx)("span", { className: "hidden sm:inline", children: label }), (0, jsx_runtime_1.jsx)("span", { className: "sm:hidden", children: label[0] }), (0, jsx_runtime_1.jsx)("span", { className: `px-2 py-0.5 rounded-md text-[9px] ${active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`, children: count })] }));
};
exports.default = App;
//# sourceMappingURL=App.js.map