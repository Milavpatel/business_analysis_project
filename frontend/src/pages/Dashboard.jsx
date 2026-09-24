import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, Users, DollarSign, Target, Zap, Activity,
  AlertTriangle, Sparkles, LogOut, Upload, FileText,
  Trash2, BarChart2, Loader2, Database, CheckCircle2,
  AlertCircle, X, Info, BookOpen, ChevronDown, WifiOff,
  FlaskConical
} from 'lucide-react';

import KPICard from '../components/KPICard';
import ShapChart from '../components/ShapChart';
import ForecastChart from '../components/ForecastChart';
import StrategyChatbot from '../components/StrategyChatbot';
import { useAuth } from '../context/AuthContext';
import { uploadCSV, listUserFiles, deleteUserFile, analyzeUserFile } from '../services/dataApi';

// ─── Background Orbs ──────────────────────────────────────────────────────────
const BackgroundOrbs = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
    <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-primary/10 blur-[130px] animate-pulse duration-[8s]" />
    <div className="absolute top-1/4 -right-40 w-[600px] h-[600px] rounded-full bg-accent/8 blur-[160px] animate-pulse duration-[10s]" />
    <div className="absolute -bottom-40 left-1/4 w-[500px] h-[500px] rounded-full bg-secondary/8 blur-[130px] animate-pulse duration-[12s]" />
    <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:32px_32px]" />
  </div>
);

// ─── Toast ────────────────────────────────────────────────────────────────────
const Toast = ({ type, message, onClose }) => {
  useEffect(() => { const t = setTimeout(onClose, 5000); return () => clearTimeout(t); }, [onClose]);
  const isErr = type === 'error';
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-3 px-4 py-2.5 rounded-lg border shadow-lg text-sm font-medium ${
        isErr ? 'bg-rose-950/90 border-rose-500/30 text-rose-200' : 'bg-emerald-950/90 border-emerald-500/30 text-emerald-200'
      }`}
    >
      {isErr ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
      {message}
      <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100"><X className="w-3.5 h-3.5" /></button>
    </motion.div>
  );
};

// ─── CSV Guide (collapsible) ──────────────────────────────────────────────────
const TC = {
  emerald: 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold',
  amber:   'bg-amber-50 border-amber-300 text-amber-900 font-bold',
  sky:     'bg-sky-50 border-sky-300 text-sky-900 font-bold',
};
const EXAMPLE = `date,revenue,customers,profit,churn_rate,marketing_spend
2024-01-01,120000,1800,22000,0.04,7000
2024-02-01,125000,1920,24000,0.038,7500
2024-03-01,131000,2010,25500,0.035,8000
2024-04-01,128000,1985,23000,0.040,7200
2024-05-01,142000,2200,29000,0.032,9000
2024-06-01,158000,2450,34000,0.028,10000`;

const CSVGuide = () => {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(EXAMPLE); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div className="border border-gray-300 bg-white overflow-hidden rounded-none shadow-sm">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-3.5 py-2.5 hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-primary" />
          <span className="text-xs font-extrabold text-gray-900 uppercase tracking-wider">CSV Format Guide</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-700 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden border-t border-gray-200">
            <div className="p-4 space-y-4 bg-gray-50">
              <p className="text-[11px] text-gray-800 leading-relaxed font-serif">
                <span className="font-bold text-gray-950">Minimum requirements:</span> a <code className="text-primary font-mono font-bold">date</code> + <code className="text-primary font-mono font-bold">revenue</code> column with 3+ rows. All other columns improve accuracy.
              </p>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[10px] text-gray-700 font-bold uppercase tracking-wide">Example CSV</p>
                  <button onClick={copy} className={`text-[9px] px-2 py-0.5 border border-gray-300 bg-white transition-all rounded-none ${copied ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold' : 'text-gray-700 hover:text-gray-950 font-semibold'}`}>
                    {copied ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
                <pre className="text-[9px] font-mono text-gray-800 bg-white p-2.5 overflow-x-auto border border-gray-300 rounded-none">{EXAMPLE}</pre>
              </div>
              <div className="space-y-1">
                {['No $ or % symbols — plain numbers only', 'Rates: 0.05 or 5 both accepted', 'Blank cells are skipped gracefully'].map(r => (
                  <p key={r} className="text-[11px] text-gray-800 font-medium flex gap-1.5"><span className="text-primary font-bold">•</span>{r}</p>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const FileRow = ({ file, onAnalyze, onDelete, analyzing, isActive }) => {
  const kb = (file.size_bytes / 1024).toFixed(1);
  return (
    <motion.div layout initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -5 }}
      className={`group flex items-center gap-3 px-3 py-2 border transition-all cursor-pointer rounded-none ${
        isActive ? 'bg-primary/5 border-primary text-gray-900 font-bold' : 'bg-white border-gray-200 hover:border-primary/40 hover:bg-gray-50 text-gray-700'
      }`}
    >
      <div className={`w-7 h-7 flex items-center justify-center shrink-0 border rounded-none ${isActive ? 'bg-primary/10 border-primary text-primary' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
        <FileText className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1 min-w-0" onClick={() => onAnalyze(file.filename)}>
        <p className="text-xs truncate">{file.filename}</p>
        <p className="text-[10px] text-gray-400 font-sans font-normal">{kb} KB</p>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => onAnalyze(file.filename)} disabled={analyzing}
          className="p-1 rounded-none bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-30 transition-all"
          title="Analyze"
        >
          {analyzing && isActive ? <Loader2 className="w-3 h-3 animate-spin" /> : <BarChart2 className="w-3 h-3" />}
        </button>
        <button onClick={() => onDelete(file.filename)} disabled={analyzing}
          className="p-1 rounded-none hover:text-accent hover:bg-accent/5 disabled:opacity-30 text-gray-400 transition-all"
          title="Delete"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </motion.div>
  );
};

// ─── Empty / Welcome State ────────────────────────────────────────────────────
const WelcomeState = ({ hasFiles }) => (
  <div className="flex flex-col items-center justify-center h-full gap-8 py-16 text-center px-8 bg-white max-w-2xl mx-auto">
    <div className="w-16 h-16 bg-gray-50 border border-gray-200 flex items-center justify-center shadow-sm">
      <Database className="w-7 h-7 text-primary" />
    </div>
    <div className="space-y-3">
      <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight font-serif leading-tight">
        {hasFiles ? 'Select a Dataset to Generate Report' : 'Upload Business Data to Begin Analysis'}
      </h2>
      <p className="text-gray-600 text-sm leading-relaxed font-serif">
        {hasFiles
          ? 'Click Analyze on any of your uploaded files in the right panel to generate the causal report. The engine will run XGBoost classifications, compute SHAP feature importances, and calculate a 6-month Prophet revenue forecast.'
          : 'To generate the Interactive Causal Analysis Report, upload a CSV spreadsheet containing your company\'s historical performance metrics (e.g. revenue, customer count, profit, marketing spend, churn).'}
      </p>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full pt-4">
      {[
        { icon: BarChart2,   label: 'XGBoost Classification', desc: 'Predictive growth status models' },
        { icon: Activity,    label: 'Causal Attribution',     desc: 'SHAP driver attribution models' },
        { icon: TrendingUp,  label: 'Prophet Forecasting',    desc: '6-month time-series revenue horizon' },
      ].map(({ icon: Icon, label, desc }) => (
        <div key={label} className="border border-gray-200 bg-gray-50 p-4 text-center space-y-2">
          <div className="w-8 h-8 rounded-none bg-primary/10 flex items-center justify-center mx-auto text-primary">
            <Icon className="w-4 h-4 animate-none text-primary" />
          </div>
          <p className="text-xs font-bold text-gray-900 uppercase tracking-wide font-sans">{label}</p>
          <p className="text-[11px] text-gray-500 leading-normal">{desc}</p>
        </div>
      ))}
    </div>
  </div>
);

// ─── Analysis Results ─────────────────────────────────────────────────────────
const AnalysisResults = ({ result }) => {
  const { metrics, prediction, strategy, shap, forecast, detected_columns, filename } = result;

  const statusStyle = (code) => ({
    2: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    1: 'bg-amber-50 border-amber-200 text-amber-800',
    0: 'bg-rose-50 border-rose-200 text-rose-800',
  }[code] || 'bg-gray-50 border-gray-200 text-gray-700');

  const statusIcon = (code) => ({
    2: <TrendingUp className="w-4 h-4 text-emerald-700" />,
    1: <Activity className="w-4 h-4 text-amber-700" />,
    0: <AlertTriangle className="w-4 h-4 text-rose-700" />,
  }[code] || <Target className="w-4 h-4 text-gray-700" />);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      {/* File info bar */}
      <div className="p-4 bg-gray-50 border border-gray-200 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-4 h-4 text-primary" />
          <div>
            <p className="text-xs font-bold text-gray-900 font-sans">Source Dataset: {filename}</p>
            <p className="text-[10px] text-gray-500 font-sans mt-0.5">
              {detected_columns?.total_rows} recorded points • Detected fields: {Object.keys(detected_columns || {}).filter(k => k !== 'total_rows').join(', ')}
            </p>
          </div>
        </div>
        <span className="px-2.5 py-0.5 border border-gray-300 text-[9px] font-bold text-gray-600 uppercase tracking-wider bg-white">
          Attribution Model Loaded
        </span>
      </div>

      {/* Key Takeaways Card Wrapper */}
      <div className="key-takeaways-box">
        <h3 className="text-xs font-extrabold text-primary uppercase tracking-wider font-sans mb-3">Key Takeaways</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <KPICard title="Revenue Growth" value={`${(metrics.revenue_growth * 100).toFixed(1)}%`}     icon={DollarSign} trend={+(metrics.revenue_growth * 100).toFixed(1)} />
          <KPICard title="Profit Margin"  value={`${(metrics.profit_margin * 100).toFixed(1)}%`}      icon={TrendingUp} trend={+(metrics.profit_margin * 100).toFixed(1)} />
          <KPICard title="Churn Rate"     value={`${(metrics.churn_rate * 100).toFixed(1)}%`}         icon={Users}      trend={0} />
          <KPICard title="CLV:CAC Ratio"  value={`${metrics.cac > 0 ? (metrics.clv / metrics.cac).toFixed(2) : '—'}x`} icon={Target} trend={12.4} />
        </div>
      </div>

      {/* Editorial Definition Section (XGBoost Prediction Status) */}
      {prediction && (
        <div className="space-y-2.5">
          <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider font-serif pb-1.5 border-b border-gray-200">
            Term Definition: Growth Status Vector
          </h3>
          <div className={`p-4 border ${statusStyle(prediction.growth_status_code)} flex items-start gap-3`}>
            <div className="p-1.5 bg-white border border-gray-200 mt-0.5">{statusIcon(prediction.growth_status_code)}</div>
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider opacity-85">Growth Classification Code</p>
              <p className="font-serif font-bold text-lg leading-snug mt-0.5">{prediction.growth_status}</p>
              <p className="text-xs mt-1 text-gray-700 leading-relaxed font-serif">
                The classification model categorizes this business segment as <strong className="text-gray-950">{prediction.growth_status}</strong> based on the weighted sum of growth indicators.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Causal Analysis (SHAP) */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider font-serif pb-1.5 border-b border-gray-200">
          Causal Attribution Analysis
        </h3>
        <div className="border border-gray-200 bg-white p-6">
          <ShapChart data={shap} />
          <div className="mt-4 pt-3 border-t border-gray-100 text-[11px] text-gray-700 font-medium font-sans italic">
            Figure 1: SHAP Causal Attribute Weighting. Positive weights indicate a positive contribution to the growth classifier, while negative weights indicate an adverse drag effect.
          </div>
        </div>
      </div>

      {/* Forecast */}
      {forecast ? (
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider font-serif pb-1.5 border-b border-gray-200">
            Prophet Time-Series Revenue Forecast
          </h3>
          <div className="border border-gray-200 bg-white p-6">
            <ForecastChart data={forecast} />
            <div className="mt-4 pt-3 border-t border-gray-100 text-[11px] text-gray-700 font-medium font-sans italic">
              Figure 2: 6-Month Revenue Forecast Horizon. Predictive trajectory calculated utilizing additive regression models with monthly seasonality.
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-gray-50 border border-gray-200 flex items-center gap-4 opacity-75">
          <Database className="w-4 h-4 text-gray-400 shrink-0" />
          <div className="text-xs text-gray-600">
            <span className="font-bold text-gray-900">Prophet Forecasting Disabled.</span> Required field definitions (<code className="font-mono">date</code> and <code className="font-mono">revenue</code>) not found in input source, or insufficient time points.
          </div>
        </div>
      )}
    </motion.div>
  );
};
// ─── Business Dictionary ──────────────────────────────────────────────────────
const BusinessDictionary = () => (
  <div className="space-y-4 pt-4 border-t border-gray-200">
    <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider font-serif">Business Dictionary</h3>
    <div className="space-y-3.5">
      {[
        { term: 'Revenue Growth', type: 'noun', def: 'The increase in a company\'s top-line sales over a specified period, indicating operational scale expansion.' },
        { term: 'Profit Margin', type: 'noun', def: 'A measure of profitability calculated by dividing net profit by revenue. Expressed as a percentage.' },
        { term: 'Churn Rate', type: 'noun', def: 'The rate at which customers cease business with an entity, indicating customer attrition.' },
        { term: 'CLV to CAC Ratio', type: 'ratio', def: 'A metric assessing lifetime value of a customer relative to customer acquisition cost. Healthy profiles exceed 3.0x.' }
      ].map(entry => (
        <div key={entry.term} className="p-3.5 bg-gray-50 border border-gray-200 rounded-none text-left">
          <p className="font-serif text-sm font-bold text-primary">{entry.term}</p>
          <p className="text-[10px] text-gray-600 font-semibold italic mb-1 font-serif">/ {entry.type} /</p>
          <p className="text-[11px] text-gray-800 font-medium leading-relaxed font-sans">{entry.def}</p>
        </div>
      ))}
    </div>
  </div>
);

// ─── Dashboard ────────────────────────────────────────────────────────────────
const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const [files, setFiles]         = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [activeFile, setActiveFile] = useState(null);
  const [result, setResult]       = useState(null);
  const [toast, setToast]         = useState(null);

  const showToast = useCallback((type, message) => setToast({ type, message }), []);

  // Load files on mount, restore last cached result
  useEffect(() => {
    listUserFiles()
      .then(list => {
        setFiles(list);
        const last = localStorage.getItem('nexus_last_file');
        if (last) {
          const cached = localStorage.getItem(`nexus_result_${last}`);
          if (cached) { setActiveFile(last); setResult(JSON.parse(cached)); }
        }
      })
      .catch(() => showToast('error', 'Could not load your files. Is the server running?'));
  }, [showToast]);

  // ── Upload ─────────────────────────────────────────────────────────────────
  const handleFile = useCallback(async (file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) {
      showToast('error', 'Only CSV files are supported.'); return;
    }
    setUploading(true); setUploadPct(0); setDragging(false);
    try {
      await uploadCSV(file, setUploadPct);
      const updated = await listUserFiles();
      setFiles(updated);
      showToast('success', `"${file.name}" uploaded — click Analyze to run AI analysis.`);
    } catch (err) {
      showToast('error', err?.response?.data?.detail || 'Upload failed.');
    } finally { setUploading(false); setUploadPct(0); }
  }, [showToast]);

  const handleDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  // ── Analyze ────────────────────────────────────────────────────────────────
  const handleAnalyze = useCallback(async (filename) => {
    setAnalyzing(true); setActiveFile(filename); setResult(null);
    try {
      const data = await analyzeUserFile(filename);
      setResult(data);
      localStorage.setItem(`nexus_result_${filename}`, JSON.stringify(data));
      localStorage.setItem('nexus_last_file', filename);
    } catch (err) {
      showToast('error', err?.response?.data?.detail || 'Analysis failed.');
      setActiveFile(null);
    } finally { setAnalyzing(false); }
  }, [showToast]);

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = useCallback(async (filename) => {
    try {
      await deleteUserFile(filename);
      setFiles(f => f.filter(x => x.filename !== filename));
      if (activeFile === filename) {
        setActiveFile(null); setResult(null);
        localStorage.removeItem(`nexus_result_${filename}`);
        localStorage.removeItem('nexus_last_file');
      }
      showToast('success', `"${filename}" deleted.`);
    } catch { showToast('error', 'Could not delete file.'); }
  }, [activeFile, showToast]);

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className="h-screen bg-gray-50 flex flex-col relative overflow-hidden text-gray-900"
    >
      <BackgroundOrbs />

      {/* Drag overlay */}
      <AnimatePresence>
        {dragging && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-primary/5 border-4 border-dashed border-primary flex items-center justify-center pointer-events-none"
          >
            <div className="flex flex-col items-center gap-4 bg-white p-8 border border-gray-200 shadow-xl">
              <Upload className="w-12 h-12 text-primary animate-bounce" />
              <p className="text-lg font-serif font-bold text-gray-900">Drop your CSV file here</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Header ── */}
      <header className="relative z-20 h-16 border-b border-gray-200 flex items-center justify-between px-6 bg-white shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary flex items-center justify-center shadow-md">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-black text-gray-900 tracking-tight font-serif uppercase">Nexus <span className="text-primary font-normal">AI</span></h1>
            <p className="text-[9px] text-gray-500 uppercase tracking-widest font-sans font-bold -mt-0.5">Growth Encyclopedia</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* What-If Simulator link */}
          <button
            onClick={() => navigate('/whatif')}
            className="flex items-center gap-1.5 px-4 py-2 border-2 border-primary text-primary hover:bg-primary/5 transition-all text-xs font-bold font-sans uppercase tracking-wider"
          >
            <FlaskConical className="w-3.5 h-3.5" />
            <span>Simulator Tool</span>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gray-100 border border-gray-300 flex items-center justify-center" title={user?.email}>
              <span className="text-xs font-bold text-gray-700">{user?.name?.charAt(0)?.toUpperCase() || 'U'}</span>
            </div>
            <span className="hidden md:block text-xs text-gray-755 font-bold max-w-[160px] truncate">{user?.name}</span>
          </div>
          <button
            onClick={async () => { await logout(); navigate('/auth'); }}
            className="flex items-center gap-1 py-2 px-2 text-gray-500 hover:text-accent transition-all text-xs font-bold uppercase tracking-wider"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Sign out</span>
          </button>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden relative z-10">

        {/* ── Main content ── */}
        <main className="flex-1 overflow-y-auto p-6 md:p-10 bg-white">
          {result && (
            <div className="mb-6 pb-6 border-b border-gray-200">
              <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight font-serif mb-2 leading-tight">
                Corporate Growth & Causal Analytics Report
              </h2>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-gray-500 font-sans font-medium">
                <span className="font-bold text-primary">By Nexus AI Analyst</span>
                <span>•</span>
                <span>Updated June 2026</span>
                <span>•</span>
                <span className="bg-gray-100 border border-gray-200 px-2 py-0.5 font-mono text-[10px] text-gray-600">
                  Data ID: {activeFile}
                </span>
              </div>
            </div>
          )}

          {analyzing && (
            <div className="flex flex-col items-center justify-center gap-5 h-full">
              <div className="w-16 h-16 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
              <p className="text-sm text-primary uppercase tracking-widest animate-pulse font-bold">Running AI Analysis…</p>
              <p className="text-xs text-gray-500">XGBoost · SHAP · Prophet — may take 20–40 s</p>
            </div>
          )}

          {!analyzing && result && <AnalysisResults result={result} />}

          {!analyzing && !result && <WelcomeState hasFiles={files.length > 0} />}
        </main>

        {/* ── Right sidebar ── */}
        <aside className="w-80 shrink-0 bg-gray-50 flex flex-col gap-6 p-6 overflow-y-auto border-l border-gray-200">
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider font-serif">File Center</h3>
            <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={e => { handleFile(e.target.files?.[0]); e.target.value=''; }} />
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => !uploading && inputRef.current?.click()}
              disabled={uploading}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 border border-primary text-primary hover:bg-primary/5 font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-60 shadow-sm"
            >
              {uploading
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading {uploadPct}%</>
                : <><Upload className="w-3.5 h-3.5" /> Upload CSV File</>}
            </motion.button>
            <p className="text-[9px] text-gray-500 text-center font-medium">CSV files only · max 20 MB</p>

            {/* CSV Guide */}
            <CSVGuide />

            {/* Divider */}
            {files.length > 0 && <div className="border-t border-gray-200" />}

            {/* File list */}
            {files.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-gray-600 uppercase tracking-wider px-1">
                  Your Datasets ({files.length})
                </p>
                <div className="space-y-1.5">
                  {files.map(f => (
                    <FileRow
                      key={f.filename}
                      file={f}
                      onAnalyze={handleAnalyze}
                      onDelete={handleDelete}
                      analyzing={analyzing}
                      isActive={activeFile === f.filename}
                    />
                  ))}
                </div>
              </div>
            )}

            {files.length === 0 && !uploading && (
              <div className="flex flex-col items-center gap-3 py-6 text-center border border-dashed border-gray-300">
                <Database className="w-5 h-5 text-gray-400" />
                <p className="text-[11px] text-gray-500">No files yet.<br />Upload a CSV to begin.</p>
              </div>
            )}
          </div>

          {/* Business Dictionary */}
          <BusinessDictionary />
        </aside>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && <Toast key={toast.message} type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;
