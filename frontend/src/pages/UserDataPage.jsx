import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, FileText, Trash2, BarChart2, Loader2,
  ChevronLeft, CheckCircle2, AlertCircle, X, ChevronDown,
  TrendingUp, Users, DollarSign, Target, Zap,
  Command, Activity, AlertTriangle, Database, Info, BookOpen
} from 'lucide-react';

import KPICard from '../components/KPICard';
import ShapChart from '../components/ShapChart';
import ForecastChart from '../components/ForecastChart';
import { useAuth } from '../context/AuthContext';
import { uploadCSV, listUserFiles, deleteUserFile, analyzeUserFile } from '../services/dataApi';

// ─── Background ───────────────────────────────────────────────────────────────
const BackgroundOrbs = () => null;

// ─── Toast ────────────────────────────────────────────────────────────────────
const Toast = ({ type, message, onClose }) => {
  useEffect(() => {
    const t = setTimeout(onClose, 5000);
    return () => clearTimeout(t);
  }, [onClose]);

  const isError = type === 'error';
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-3 px-4 py-2.5 rounded-none border shadow-lg text-xs font-bold uppercase tracking-wider ${
        isError
          ? 'bg-rose-50 border-rose-200 text-rose-800'
          : 'bg-emerald-50 border-emerald-200 text-emerald-800'
      }`}
    >
      {isError ? <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" /> : <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />}
      {message}
      <button onClick={onClose} className="ml-2 text-gray-400 hover:text-gray-900"><X className="w-3.5 h-3.5" /></button>
    </motion.div>
  );
};

// ─── Upload Zone ──────────────────────────────────────────────────────────────
const UploadZone = ({ onUpload, uploading, progress }) => {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onUpload(file);
  }, [onUpload]);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
    e.target.value = '';
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => !uploading && inputRef.current?.click()}
      className={`relative flex flex-col items-center justify-center gap-4 p-10 border-2 border-dashed cursor-pointer rounded-none transition-all duration-150 ${
        dragging
          ? 'border-primary bg-primary/5 scale-[1.01]'
          : 'border-gray-300 bg-gray-50 hover:border-primary hover:bg-white'
      } ${uploading ? 'pointer-events-none opacity-70' : ''}`}
    >
      <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />

      {uploading ? (
        <>
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <p className="text-sm text-gray-500 font-bold">Uploading… {progress}%</p>
          <div className="w-full max-w-[200px] h-1.5 bg-gray-200 rounded-none overflow-hidden">
            <div className="h-full bg-primary transition-all duration-150" style={{ width: `${progress}%` }} />
          </div>
        </>
      ) : (
        <>
          <div className="w-16 h-16 bg-white border border-gray-200 flex items-center justify-center shadow-sm rounded-none">
            <Upload className="w-6 h-6 text-primary" />
          </div>
          <div className="text-center space-y-1">
            <p className="font-serif font-bold text-gray-900 text-sm uppercase tracking-wide">Drop your CSV here or click to browse</p>
            <p className="text-[11px] text-gray-500">Max 20 MB · CSV files only</p>
          </div>
          <div className="flex flex-wrap gap-1.5 justify-center mt-1">
            {['revenue', 'customers', 'profit', 'churn_rate', 'marketing_spend', 'date'].map(col => (
              <span key={col} className="px-2 py-0.5 border border-gray-200 bg-white text-[9px] font-mono text-gray-600">
                {col}
              </span>
            ))}
          </div>
          <p className="text-[10px] text-gray-500 text-center">Common column names are auto-detected. Unknown columns use intelligent defaults.</p>
        </>
      )}
    </div>
  );
};

// ─── Data Guide Panel ─────────────────────────────────────────────────────────
const TIERS = [
  {
    label: 'Tier 1 — Core', color: 'emerald', note: 'Unlocks ALL features',
    cols: [
      { name: 'date',      aliases: 'month · period · ds · report_date',        fmt: 'YYYY-MM-DD', eg: '2024-01-01' },
      { name: 'revenue',   aliases: 'sales · income · turnover · total_revenue', fmt: 'Number',    eg: '150000' },
      { name: 'customers', aliases: 'users · clients · subscribers',             fmt: 'Integer',   eg: '2400' },
      { name: 'profit',    aliases: 'net_profit · earnings · ebitda',            fmt: 'Number',    eg: '32000' },
    ],
  },
  {
    label: 'Tier 2 — Business Metrics', color: 'amber', note: 'Improves accuracy',
    cols: [
      { name: 'churn_rate',      aliases: 'churn · attrition_rate',           fmt: '0–1 or %', eg: '0.05' },
      { name: 'marketing_spend', aliases: 'marketing · ad_spend · advertising',fmt: 'Dollar',   eg: '8500' },
      { name: 'conversion_rate', aliases: 'conversion · cvr · cr',            fmt: '0–1 or %', eg: '0.03' },
      { name: 'aov',             aliases: 'average_order_value · avg_order',   fmt: 'Dollar',   eg: '65.50' },
      { name: 'cac',             aliases: 'customer_acquisition_cost',         fmt: 'Dollar',   eg: '28.00' },
      { name: 'clv',             aliases: 'ltv · lifetime_value',              fmt: 'Dollar',   eg: '210.00' },
    ],
  },
  {
    label: 'Tier 3 — Market Context', color: 'sky', note: 'Competitive analysis',
    cols: [
      { name: 'market_growth_rate', aliases: 'market_growth · industry_growth', fmt: '0–1 or %', eg: '0.07' },
      { name: 'competitor_growth',  aliases: 'competition_growth · rival_growth',fmt: '0–1 or %', eg: '0.05' },
    ],
  },
];

const TIER_COLORS = {
  emerald: { badge: 'bg-emerald-50 border-emerald-200 text-emerald-800', dot: 'bg-emerald-600', header: 'text-emerald-800' },
  amber:   { badge: 'bg-amber-50 border-amber-200 text-amber-800',       dot: 'bg-amber-600',   header: 'text-amber-850' },
  sky:     { badge: 'bg-sky-50 border-sky-200 text-sky-850',             dot: 'bg-sky-600',     header: 'text-sky-855' },
};

const EXAMPLE_CSV =
`date,revenue,customers,profit,churn_rate,marketing_spend
2024-01-01,120000,1800,22000,0.04,7000
2024-02-01,125000,1920,24000,0.038,7500
2024-03-01,131000,2010,25500,0.035,8000
2024-04-01,128000,1985,23000,0.040,7200
2024-05-01,142000,2200,29000,0.032,9000
2024-06-01,158000,2450,34000,0.028,10000`;

const DataGuide = () => {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(EXAMPLE_CSV);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="border border-gray-200 bg-white overflow-hidden rounded-none shadow-sm">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <BookOpen className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold text-gray-700 uppercase tracking-wider">CSV Data Guide</span>
          <span className="px-2 py-0.5 border border-gray-200 bg-gray-50 text-[10px] font-sans font-bold text-gray-600">14 columns</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden border-t border-gray-200"
          >
            <div className="px-4 pb-5 space-y-5 bg-gray-50 pt-4">

              {/* Minimum requirement note */}
              <div className="flex items-start gap-2 p-3 border border-primary/20 bg-primary/5 rounded-none">
                <Info className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                <p className="text-xs text-gray-700 leading-relaxed font-serif">
                  Minimum requirement: a <code className="font-mono font-bold text-primary">date</code> and a <code className="font-mono font-bold text-primary">revenue</code> column with at least 3 rows to enable time-series forecasting.
                </p>
              </div>

              {/* Tiers */}
              {TIERS.map(tier => {
                const c = TIER_COLORS[tier.color];
                return (
                  <div key={tier.label} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-none ${c.dot}`} />
                      <p className={`text-xs font-bold uppercase tracking-wider font-serif ${c.header}`}>{tier.label}</p>
                      <span className="text-[10px] text-gray-500 font-sans font-medium">— {tier.note}</span>
                    </div>
                    <div className="space-y-1.5">
                      {tier.cols.map(col => (
                        <div key={col.name} className="grid grid-cols-12 gap-2 items-start text-[10px]">
                          <code className={`col-span-4 px-2 py-1 border font-mono truncate rounded-none ${c.badge}`}>{col.name}</code>
                          <span className="col-span-5 text-gray-600 pt-1 leading-tight truncate" title={col.aliases}>{col.aliases}</span>
                          <span className="col-span-3 text-gray-400 pt-1 font-mono text-right">{col.eg}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Rules */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-gray-700 uppercase tracking-wider">Formatting Rules</p>
                {[
                  'No $ or % symbols in cells — plain numbers only (150000, not $150,000)',
                  'Rates: decimal (0.05) or percent (5) — both auto-detected',
                  'Column names: case-insensitive, spaces or underscores both work',
                  'Leave cells blank for missing rows — gracefully handled',
                  'Maximum file size: 20 MB · CSV format only',
                ].map(rule => (
                  <div key={rule} className="flex items-start gap-2">
                    <span className="text-primary text-[10px] mt-0.5">•</span>
                    <p className="text-[10px] text-gray-600">{rule}</p>
                  </div>
                ))}
              </div>

              {/* Example CSV */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[10px] font-bold text-gray-750 uppercase tracking-wide">Example CSV</p>
                  <button
                    onClick={copy}
                    className={`text-[10px] px-2 py-0.5 border border-gray-300 bg-white transition-all rounded-none ${
                      copied ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold' : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    {copied ? '✓ Copied!' : 'Copy'}
                  </button>
                </div>
                <pre className="text-[9px] font-mono text-gray-500 bg-white p-3 overflow-x-auto border border-gray-200 leading-relaxed rounded-none">
                  {EXAMPLE_CSV}
                </pre>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── File Card ────────────────────────────────────────────────────────────────
const FileCard = ({ file, onAnalyze, onDelete, analyzing, isActive }) => {
  const kb = (file.size_bytes / 1024).toFixed(1);
  const date = new Date(file.uploaded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -10 }}
      className={`flex items-center gap-4 p-4 border transition-all duration-150 rounded-none ${
        isActive
          ? 'bg-primary/5 border-primary text-gray-900 font-bold'
          : 'bg-white border-gray-200 hover:border-primary/45 hover:bg-gray-50 text-gray-700'
      }`}
    >
      <div className={`w-10 h-10 flex items-center justify-center shrink-0 border rounded-none ${isActive ? 'bg-primary/10 border-primary text-primary' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
        <FileText className="w-5 h-5" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm truncate">{file.filename}</p>
        <p className="text-xs text-gray-400 font-sans font-normal">{kb} KB · {date}</p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onAnalyze(file.filename)}
          disabled={analyzing}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-none text-xs font-semibold transition-all ${
            isActive
              ? 'bg-primary text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:border-gray-400'
          } disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          {analyzing && isActive
            ? <Loader2 className="w-3 h-3 animate-spin" />
            : <BarChart2 className="w-3 h-3" />}
          {analyzing && isActive ? 'Analyzing...' : 'Analyze'}
        </motion.button>
        <button
          onClick={() => onDelete(file.filename)}
          disabled={analyzing}
          className="p-1.5 rounded-none text-gray-400 hover:text-rose-500 hover:bg-rose-50 transition-all disabled:opacity-30"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
};

// ─── Detected Columns Badge ───────────────────────────────────────────────────
const DetectedBadge = ({ detected }) => {
  const cols = Object.entries(detected).filter(([k]) => k !== 'total_rows');
  if (cols.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 items-center">
      <Info className="w-3.5 h-3.5 text-gray-400" />
      <span className="text-xs text-gray-500 font-sans">Detected:</span>
      {cols.map(([k, v]) => (
        <span key={k} className="px-2 py-0.5 border border-gray-200 bg-white text-[10px] text-gray-600 font-mono">
          {k} → {v}
        </span>
      ))}
      <span className="text-[10px] text-gray-500 font-sans">({detected.total_rows} rows)</span>
    </div>
  );
};

// ─── Analysis Results Panel ───────────────────────────────────────────────────
const AnalysisPanel = ({ result }) => {
  const { metrics, prediction, strategy, shap, forecast, detected_columns, filename } = result;

  const getStatusStyle = (code) => {
    switch (code) {
      case 2: return 'bg-emerald-50 border-emerald-200 text-emerald-800';
      case 1: return 'bg-amber-50 border-amber-200 text-amber-800';
      case 0: return 'bg-rose-50 border-rose-200 text-rose-800';
      default: return 'bg-gray-50 border-gray-200 text-gray-700';
    }
  };

  const getStatusIcon = (code) => {
    switch (code) {
      case 2: return <TrendingUp className="w-4 h-4 text-emerald-700" />;
      case 1: return <Activity className="w-4 h-4 text-amber-700" />;
      case 0: return <AlertTriangle className="w-4 h-4 text-rose-700" />;
      default: return <Target className="w-4 h-4 text-gray-700" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      {/* File + detected columns */}
      <div className="p-5 bg-gray-50 border border-gray-200 space-y-3 rounded-none">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-none bg-primary/10 flex items-center justify-center text-primary">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900 font-sans">Source Dataset: {filename}</p>
            <p className="text-xs text-gray-500 font-sans">Analysis completed successfully</p>
          </div>
        </div>
        {detected_columns && <DetectedBadge detected={detected_columns} />}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard title="Revenue Growth" value={`${(metrics.revenue_growth * 100).toFixed(1)}%`} icon={DollarSign} trend={parseFloat((metrics.revenue_growth * 100).toFixed(1))} />
        <KPICard title="Profit Margin"  value={`${(metrics.profit_margin * 100).toFixed(1)}%`}  icon={TrendingUp} trend={parseFloat((metrics.profit_margin * 100).toFixed(1))} />
        <KPICard title="Churn Rate"     value={`${(metrics.churn_rate * 100).toFixed(1)}%`}     icon={Users}     trend={0} />
        <KPICard title="CLV:CAC"        value={`${metrics.cac > 0 ? (metrics.clv / metrics.cac).toFixed(2) : 0}x`} icon={Target} trend={12.4} />
      </div>

      {/* AI Copilot + SHAP */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* AI Copilot */}
        <div className="lg:col-span-4 border border-gray-200 bg-gray-50 p-5 flex flex-col gap-4 rounded-none shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary/10 flex items-center justify-center text-primary">
              <Zap className="w-3.5 h-3.5" />
            </div>
            <h3 className="font-bold text-gray-900 text-xs uppercase tracking-wider font-serif">AI Strategy Advisor</h3>
          </div>

          {prediction && (
            <div className={`p-4 border flex items-start gap-3 rounded-none bg-white ${getStatusStyle(prediction.growth_status_code)}`}>
              <div className="p-1 border border-gray-200 mt-0.5 bg-white">{getStatusIcon(prediction.growth_status_code)}</div>
              <div>
                <p className="text-[9px] uppercase tracking-widest opacity-85 font-bold">Growth Classification</p>
                <p className="font-serif font-bold text-sm leading-tight mt-0.5">{prediction.growth_status}</p>
              </div>
            </div>
          )}

          {strategy && (
            <div className="bg-white p-4 border border-gray-200 flex-1 flex flex-col gap-2 rounded-none">
              <div className="flex items-center gap-1.5 border-b border-gray-100 pb-1">
                <Command className="w-3.5 h-3.5 text-primary" />
                <p className="text-primary font-bold text-[10px] uppercase tracking-wide font-sans">{strategy.strategy}</p>
              </div>
              <p className="text-gray-700 text-xs leading-relaxed font-serif">{strategy.explanation}</p>
            </div>
          )}
        </div>

        {/* SHAP */}
        <div className="lg:col-span-8 border border-gray-200 bg-white p-6 rounded-none shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-1.5 border-b border-gray-200">
            <div>
              <h3 className="font-bold text-gray-900 text-xs uppercase font-serif tracking-wider">Causal Attribution (SHAP)</h3>
              <p className="text-[10px] text-gray-500 font-sans mt-0.5">Driver weightings on live attribution model</p>
            </div>
            <span className="px-2 py-0.5 border border-gray-200 text-[10px] font-sans font-bold text-gray-600 bg-gray-50">
              SHAP attribution
            </span>
          </div>
          <ShapChart data={shap} />
        </div>
      </div>

      {/* Forecast */}
      {forecast ? (
        <div className="border border-gray-200 bg-white p-6 rounded-none shadow-sm space-y-4">
          <div className="pb-1.5 border-b border-gray-200">
            <h3 className="font-bold text-gray-900 text-xs uppercase font-serif tracking-wider">Revenue Forecast Horizon</h3>
            <p className="text-[10px] text-gray-500 font-sans mt-0.5">6-month time-series forecasting via Facebook Prophet</p>
          </div>
          <ForecastChart data={forecast} />
        </div>
      ) : (
        <div className="glass-panel p-6 flex items-center gap-4 text-gray-500 border-dashed">
          <Database className="w-5 h-5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-gray-400">Forecast not available</p>
            <p className="text-xs">Add a <span className="font-mono text-gray-500">date</span> column and a <span className="font-mono text-gray-500">revenue</span> column (3+ rows) to enable Prophet forecasting.</p>
          </div>
        </div>
      )}
    </motion.div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const UserDataPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [files, setFiles]             = useState([]);
  const [uploading, setUploading]     = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analyzing, setAnalyzing]     = useState(false);
  const [activeFile, setActiveFile]   = useState(null);   // filename being analyzed or analyzed
  const [result, setResult]           = useState(null);
  const [toast, setToast]             = useState(null);   // { type, message }

  const showToast = (type, message) => setToast({ type, message });

  // Load file list on mount
  useEffect(() => {
    listUserFiles()
      .then(setFiles)
      .catch(() => showToast('error', 'Could not load your files. Is the server running?'));
  }, []);

  // ── Upload ─────────────────────────────────────────────────────────────────
  const handleUpload = async (file) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      showToast('error', 'Only CSV files are supported.');
      return;
    }
    setUploading(true);
    setUploadProgress(0);
    try {
      await uploadCSV(file, setUploadProgress);
      const updated = await listUserFiles();
      setFiles(updated);
      showToast('success', `"${file.name}" uploaded successfully.`);
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Upload failed.';
      showToast('error', msg);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // ── Analyze ────────────────────────────────────────────────────────────────
  const handleAnalyze = async (filename) => {
    setAnalyzing(true);
    setActiveFile(filename);
    setResult(null);
    try {
      const data = await analyzeUserFile(filename);
      setResult(data);
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Analysis failed. Check the backend logs.';
      showToast('error', msg);
      setActiveFile(null);
    } finally {
      setAnalyzing(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async (filename) => {
    try {
      await deleteUserFile(filename);
      setFiles(f => f.filter(x => x.filename !== filename));
      if (activeFile === filename) {
        setActiveFile(null);
        setResult(null);
      }
      showToast('success', `"${filename}" deleted.`);
    } catch (err) {
      showToast('error', 'Could not delete file.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 relative overflow-x-hidden text-gray-950 font-sans">
      <BackgroundOrbs />

      {/* ── Header ── */}
      <header className="relative z-20 h-16 border-b border-gray-200 flex items-center justify-between px-6 md:px-10 bg-white shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 transition-all text-xs font-bold uppercase tracking-wider rounded-none"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </button>
          <span className="text-gray-300 font-light">/</span>
          <span className="text-xs font-bold text-gray-700 uppercase tracking-wider font-sans">Data Hub</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gray-100 border border-gray-300 flex items-center justify-center">
            <span className="text-xs font-bold text-gray-750">{user?.name?.charAt(0)?.toUpperCase() || 'U'}</span>
          </div>
          <span className="hidden md:block text-xs font-bold text-gray-700 max-w-[160px] truncate">{user?.name}</span>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="relative z-10 max-w-[1400px] mx-auto px-6 md:px-10 py-8 bg-gray-50">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">

          {/* ── Left column: Upload + File list ── */}
          <div className="xl:col-span-4 space-y-6">

            {/* Title */}
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight font-serif uppercase">Data File Center</h1>
              <p className="text-xs text-gray-500 mt-1 font-serif italic">Private datasets & file attachments</p>
            </div>

            {/* Upload zone */}
            <UploadZone onUpload={handleUpload} uploading={uploading} progress={uploadProgress} />

            {/* Data guide */}
            <DataGuide />

            {/* File list */}
            {files.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-gray-650 uppercase tracking-wider mb-3">
                  Your Datasets ({files.length})
                </p>
                <AnimatePresence>
                  <div className="space-y-2">
                    {files.map(f => (
                      <FileCard
                        key={f.filename}
                        file={f}
                        onAnalyze={handleAnalyze}
                        onDelete={handleDelete}
                        analyzing={analyzing}
                        isActive={activeFile === f.filename}
                      />
                    ))}
                  </div>
                </AnimatePresence>
              </div>
            )}

            {files.length === 0 && !uploading && (
              <div className="text-center py-8 text-gray-500 text-sm font-serif italic">
                No files uploaded yet.
              </div>
            )}
          </div>

          {/* ── Right column: Results ── */}
          <div className="xl:col-span-8">
            {analyzing && (
              <div className="flex flex-col items-center justify-center gap-5 py-24 bg-white border border-gray-200 shadow-sm">
                <div className="w-16 h-16 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                <p className="text-sm text-primary uppercase tracking-widest animate-pulse font-bold">Running AI Analysis…</p>
                <p className="text-xs text-gray-500">XGBoost · SHAP · Prophet — may take 20–40 s</p>
              </div>
            )}

            {!analyzing && result && <AnalysisPanel result={result} />}

            {!analyzing && !result && (
              <div className="flex flex-col items-center justify-center gap-6 py-20 text-center bg-white border border-gray-200 shadow-sm">
                <div className="w-16 h-16 bg-gray-50 border border-gray-250 flex items-center justify-center">
                  <BarChart2 className="w-7 h-7 text-gray-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 mt-1">Upload a CSV and click <strong className="text-gray-500">Analyze</strong> to see your results here.</p>
                </div>
                <div className="glass-panel p-5 max-w-sm text-left space-y-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Supported CSV formats</p>
                  <ul className="text-xs text-gray-500 space-y-1 list-disc list-inside">
                    <li>Monthly time-series (date, revenue, customers…)</li>
                    <li>Pre-computed ratios (revenue_growth, profit_margin…)</li>
                    <li>Any mix — missing columns get smart defaults</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && <Toast key={toast.message} type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
      </AnimatePresence>
    </div>
  );
};

export default UserDataPage;
