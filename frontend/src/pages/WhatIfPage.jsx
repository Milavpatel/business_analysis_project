import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FlaskConical, Zap, TrendingUp, AlertTriangle, Activity,
  Target, Loader2, RefreshCw, ChevronLeft, Info, Sparkles
} from 'lucide-react';

import ShapChart from '../components/ShapChart';
import StrategyChatbot from '../components/StrategyChatbot';
import { useAuth } from '../context/AuthContext';
import { simulateScenario, listUserFiles, analyzeUserFile } from '../services/dataApi';

// Helper to load baseline metrics from active main dataset
const getBaselineValues = () => {
  try {
    const last = localStorage.getItem('nexus_last_file');
    if (last) {
      const cached = localStorage.getItem(`nexus_result_${last}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.metrics) {
          return { ...DEFAULTS, ...parsed.metrics };
        }
      }
    }
  } catch (err) {
    console.error("Failed to load baseline metrics:", err);
  }
  return { ...DEFAULTS };
};

// ─── Background ───────────────────────────────────────────────────────────────
const BackgroundOrbs = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
    <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-primary/10 blur-[130px] animate-pulse duration-[8s]" />
    <div className="absolute top-1/4 -right-40 w-[600px] h-[600px] rounded-full bg-accent/8 blur-[160px] animate-pulse duration-[10s]" />
    <div className="absolute -bottom-40 left-1/4 w-[500px] h-[500px] rounded-full bg-secondary/8 blur-[130px] animate-pulse duration-[12s]" />
    <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:32px_32px]" />
  </div>
);

// ─── Defaults & field config ──────────────────────────────────────────────────
const DEFAULTS = {
  revenue_growth:     0.12,
  customer_growth:    0.10,
  profit_margin:      0.18,
  churn_rate:         0.04,
  marketing_spend:    8000,
  conversion_rate:    0.032,
  aov:                250,
  cac:                120,
  clv:                900,
  market_growth_rate: 0.08,
  competitor_growth:  0.06,
};

// ... field config continues ...


const FIELD_GROUPS = [
  {
    group: 'Growth Metrics', color: 'emerald',
    items: [
      { key: 'revenue_growth',     label: 'Revenue Growth',    min: -0.3, max: 0.5,   step: 0.01,  pct: true,  tip: 'YoY revenue change rate' },
      { key: 'customer_growth',    label: 'Customer Growth',   min: -0.2, max: 0.5,   step: 0.01,  pct: true,  tip: 'YoY new-customer growth rate' },
      { key: 'market_growth_rate', label: 'Market Growth',     min: -0.1, max: 0.3,   step: 0.01,  pct: true,  tip: 'Overall market expansion rate' },
      { key: 'competitor_growth',  label: 'Competitor Growth', min: -0.1, max: 0.3,   step: 0.01,  pct: true,  tip: 'Competitor growth rate' },
    ],
  },
  {
    group: 'Margins & Retention', color: 'sky',
    items: [
      { key: 'profit_margin',   label: 'Profit Margin',    min: -0.2, max: 0.5,   step: 0.01,  pct: true,  tip: 'Net profit as % of revenue' },
      { key: 'churn_rate',      label: 'Churn Rate',       min: 0,    max: 0.3,   step: 0.005, pct: true,  tip: 'Monthly customer churn rate' },
      { key: 'conversion_rate', label: 'Conversion Rate',  min: 0,    max: 0.2,   step: 0.001, pct: true,  tip: 'Lead-to-customer conversion rate' },
    ],
  },
  {
    group: 'Unit Economics', color: 'violet',
    items: [
      { key: 'marketing_spend', label: 'Marketing Spend', min: 0,  max: 50000, step: 500,  pct: false, tip: 'Monthly marketing budget ($)' },
      { key: 'aov',             label: 'Avg Order Value', min: 10, max: 2000,  step: 10,   pct: false, tip: 'Average revenue per transaction ($)' },
      { key: 'cac',             label: 'CAC',             min: 0,  max: 1000,  step: 5,    pct: false, tip: 'Customer acquisition cost ($)' },
      { key: 'clv',             label: 'CLV',             min: 0,  max: 10000, step: 50,   pct: false, tip: 'Customer lifetime value ($)' },
    ],
  },
];

const C = {
  emerald: { label: 'text-emerald-900 font-extrabold', dot: 'bg-emerald-600', badge: 'bg-emerald-100 border-emerald-400 text-emerald-950 font-bold', accent: '#059669' },
  sky:     { label: 'text-sky-900 font-extrabold',     dot: 'bg-sky-600',     badge: 'bg-sky-100 border-sky-400 text-sky-950 font-bold',             accent: '#0284c7' },
  violet:  { label: 'text-violet-900 font-extrabold',  dot: 'bg-violet-600',  badge: 'bg-violet-100 border-violet-400 text-violet-950 font-bold',    accent: '#7c3aed' },
};

const fmt = (val, pct) =>
  pct ? `${(val * 100).toFixed(1)}%` : `$${Number(val).toLocaleString()}`;

// ─── Tooltip ──────────────────────────────────────────────────────────────────
const Tip = ({ text }) => {
  const [show, setShow] = useState(false);
  return (
    <button className="relative" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <Info className="w-3.5 h-3.5 text-gray-500 hover:text-gray-900 transition-colors" />
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-gray-900 border border-gray-700 rounded-none px-3 py-2 text-[11px] font-semibold text-white z-50 pointer-events-none shadow-xl"
          >
            {text}
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
};

// ─── Slider Row ───────────────────────────────────────────────────────────────
const SliderRow = ({ field, value, color, onChange }) => {
  const c = C[color];
  const pctOfRange = ((value - field.min) / (field.max - field.min)) * 100;
  return (
    <div className="space-y-1 group">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-xs text-gray-900 font-extrabold group-hover:text-primary transition-colors duration-150 truncate">{field.label}</span>
          <Tip text={field.tip} />
        </div>
        <span className={`text-xs font-mono font-extrabold px-2 py-0.5 rounded-none border shrink-0 transition-all duration-150 ${c.badge}`}>
          {fmt(value, field.pct)}
        </span>
      </div>
      <div className="relative w-full h-2 bg-gray-200 border border-gray-300 rounded-none overflow-hidden flex items-center transition-all duration-150">
        <div 
          className="absolute top-0 left-0 h-full bg-primary rounded-none"
          style={{ width: `${pctOfRange}%` }}
        />
        <input
          type="range"
          min={field.min} max={field.max} step={field.step} value={value}
          onChange={e => onChange(field.key, parseFloat(e.target.value))}
          className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer z-10"
        />
      </div>
      <div className="flex justify-between text-[10px] text-gray-700 font-mono font-bold">
        <span>{fmt(field.min, field.pct)}</span>
        <span>{fmt(field.max, field.pct)}</span>
      </div>
    </div>
  );
};

// ─── Status styles ────────────────────────────────────────────────────────────
const STATUS = {
  2: { cls: 'bg-emerald-50 border-emerald-200 text-emerald-800', Icon: TrendingUp },
  1: { cls: 'bg-amber-50 border-amber-200 text-amber-800',    Icon: Activity },
  0: { cls: 'bg-rose-50 border-rose-200 text-rose-850',          Icon: AlertTriangle },
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const WhatIfPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [values,  setValues]  = useState(() => getBaselineValues());
  const [result,  setResult]  = useState(null);
  const [runId,   setRunId]   = useState(0);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [hasFiles, setHasFiles] = useState(true);
  const [checking, setChecking] = useState(true);
  const debounceRef           = useRef(null);
  const abortRef              = useRef(null);

  // Check files and load active dataset metrics on mount
  useEffect(() => {
    let active = true;
    const checkUserFiles = async () => {
      try {
        setChecking(true);
        const files = await listUserFiles();
        if (active) {
          if (files && files.length > 0) {
            setHasFiles(true);
            const last = localStorage.getItem('nexus_last_file');
            const targetFile = (last && files.some(f => f.filename === last)) ? last : files[0].filename;

            const cached = localStorage.getItem(`nexus_result_${targetFile}`);
            if (cached) {
              const parsed = JSON.parse(cached);
              if (parsed && parsed.metrics) {
                setValues({ ...DEFAULTS, ...parsed.metrics });
              }
            } else {
              const data = await analyzeUserFile(targetFile);
              if (data && data.metrics && active) {
                localStorage.setItem(`nexus_result_${targetFile}`, JSON.stringify(data));
                localStorage.setItem('nexus_last_file', targetFile);
                setValues({ ...DEFAULTS, ...data.metrics });
              }
            }
          } else {
            setHasFiles(false);
          }
        }
      } catch (err) {
        console.error("Failed to verify user data source files:", err);
        if (active) setHasFiles(false);
      } finally {
        if (active) setChecking(false);
      }
    };
    checkUserFiles();
    return () => { active = false; };
  }, []);

  const handleChange = useCallback((key, val) => {
    setValues(prev => ({ ...prev, [key]: val }));
  }, []);

  // Auto-simulate with 500ms debounce on every values change
  useEffect(() => {
    if (!hasFiles || checking) return; // skip if checking or no files uploaded
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setError(null);
      try {
        const data = await simulateScenario(values);
        if (!controller.signal.aborted) {
          setRunId(id => id + 1);
          setResult(data);
        }
      } catch (err) {
        if (!controller.signal.aborted)
          setError(err?.response?.data?.detail || 'Simulation failed. Is the backend running?');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 500);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [values, hasFiles, checking]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleReset = useCallback(() => {
    setValues(getBaselineValues());
    setResult(null);
    setRunId(0);
    setError(null);
  }, []);

  const status = result?.prediction ? (STATUS[result.prediction.growth_status_code] ?? STATUS[1]) : null;

  return (
    // Full-height page, no page-level scroll — each column scrolls independently
    <div className="h-screen bg-gray-50 flex flex-col relative overflow-hidden text-gray-950 font-sans">
      <BackgroundOrbs />

      {/* ── Header ── */}
      <header className="relative z-20 h-16 border-b border-gray-200 bg-white shrink-0 flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 transition-all text-xs font-bold uppercase tracking-wider rounded-none"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </button>
          <span className="text-gray-300 font-light">/</span>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-gray-900 tracking-tight font-serif uppercase">
              What-If Worksheet
            </h1>
            <span className="flex items-center gap-1.5 px-2 py-0.5 border border-gray-200 text-[10px] font-sans font-bold text-gray-600 bg-gray-50">
              {loading ? (
                <><Loader2 className="w-2.5 h-2.5 animate-spin text-primary" /> Recalculating</>
              ) : (
                <><span className="w-1.5 h-1.5 rounded-full bg-emerald-600" /> Live Worksheet</>
              )}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 transition-all text-xs font-bold font-sans uppercase tracking-wider rounded-none"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Reset Parameters
          </button>
          <div className="w-8 h-8 rounded-full bg-gray-100 border border-gray-300 flex items-center justify-center" title={user?.email}>
            <span className="text-xs font-bold text-gray-700">{user?.name?.charAt(0)?.toUpperCase() || 'U'}</span>
          </div>
        </div>
      </header>

      {/* ── Main content body ── */}
      {checking ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 relative z-10">
          <div className="w-10 h-10 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
          <p className="text-xs text-primary uppercase tracking-widest animate-pulse font-bold">Verifying baseline data source...</p>
        </div>
      ) : !hasFiles ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center relative z-10 animate-fadeIn">
          <div className="bg-white border border-gray-200 max-w-md w-full p-8 space-y-6 shadow-md rounded-none">
            <div className="w-16 h-16 rounded-none bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto text-rose-700">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-gray-900 font-serif uppercase tracking-tight">Baseline Data Required</h2>
              <p className="text-xs text-gray-600 leading-relaxed font-serif">
                The What-If Simulator runs predictions and recommends growth strategies based on your historical metrics. Since you currently have no business data uploaded, the simulator is locked.
              </p>
            </div>
            <button
              onClick={() => navigate('/')}
              className="w-full py-2.5 bg-primary text-white hover:bg-secondary font-bold text-xs uppercase tracking-wider transition-all rounded-none shadow-sm"
            >
              Return to Dashboard to Upload CSV
            </button>
          </div>
        </div>
      ) : (
        /* ── Two-column body — both columns scroll independently ── */
        <div className="relative z-10 flex flex-1 overflow-hidden">

          {/* ── LEFT: Sliders — sticky, scrollable ── */}
          <aside className="w-80 shrink-0 border-r border-gray-200 bg-gray-50 flex flex-col gap-4 p-5 overflow-y-auto">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-600 px-1 pt-1 font-sans">
              Simulation Inputs
            </p>

            {FIELD_GROUPS.map(group => (
              <div key={group.group} className="bg-white border border-gray-200 rounded-none p-4 space-y-4 shadow-sm">
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${C[group.color].dot}`} />
                  <p className={`text-[10px] font-extrabold uppercase tracking-wider ${C[group.color].label}`}>
                    {group.group}
                  </p>
                </div>
                {group.items.map(field => (
                  <SliderRow
                    key={field.key}
                    field={field}
                    value={values[field.key]}
                    color={group.color}
                    onChange={handleChange}
                  />
                ))}
              </div>
            ))}

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex items-start gap-2 p-3 border border-rose-200 bg-rose-50 text-rose-800 text-xs rounded-none"
                >
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>
          </aside>

          {/* ── RIGHT: Results — scrollable ── */}
          <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-white">

            {/* Initial load spinner */}
            {!result && loading && (
              <div className="flex flex-col items-center justify-center gap-4 h-full">
                <div className="w-12 h-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                <p className="text-sm text-primary uppercase tracking-widest animate-pulse font-bold">Analyzing worksheet…</p>
              </div>
            )}

            {/* No connection */}
            {!result && !loading && (
              <div className="flex flex-col items-center justify-center gap-4 h-full text-center">
                <FlaskConical className="w-10 h-10 text-primary/30" />
                <p className="text-sm text-gray-500 font-serif italic">Waiting for simulation parameters to resolve…</p>
              </div>
            )}

            {/* Results */}
            {result && (
              <AnimatePresence mode="wait">
                <motion.div
                  key={`r-${runId}`}
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className={`space-y-6 transition-opacity duration-150 ${loading ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  {/* ── Row 1: Growth Vector + Strategy side-by-side ── */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* Growth Vector */}
                    {result.prediction && status && (
                      <div className={`border p-6 flex flex-col justify-between gap-4 h-[350px] rounded-none shadow-sm ${status.cls}`}>
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-none bg-white border border-gray-200 flex items-center justify-center shrink-0 shadow-sm">
                            <status.Icon className="w-6 h-6 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] uppercase font-bold tracking-wider text-gray-600">Simulated AI Growth Vector</p>
                            <p className="text-2xl font-bold leading-tight tracking-tight font-serif mt-1">{result.prediction.growth_status}</p>
                            <p className="text-[10px] text-gray-500 font-sans mt-0.5">
                              Model Score Coefficient: {result.prediction.growth_score?.toFixed(3)}
                            </p>
                          </div>
                        </div>
                        <div className="bg-white border border-gray-200 p-4 text-xs leading-relaxed text-gray-700 font-serif">
                          {result.prediction.growth_status_code === 2 && "The business growth trajectory is highly robust, supported by healthy core margins and high conversion value."}
                          {result.prediction.growth_status_code === 1 && "Growth is stagnant or balanced. Look at stabilizing churn and lifting your conversion rates to trigger expansion."}
                          {result.prediction.growth_status_code === 0 && "The business metrics flag a contraction risk. Immediate cost reduction, pricing audits, or customer success adjustments are suggested."}
                        </div>
                      </div>
                    )}

                    {/* Strategy Chatbot */}
                    {result.strategy && (
                      <div className="border border-gray-200 bg-gray-50 p-6 flex flex-col h-[350px] rounded-none shadow-sm">
                        <div className="flex items-center gap-2 mb-3 shrink-0">
                          <div className="w-6 h-6 rounded-none bg-primary/10 flex items-center justify-center shrink-0 text-primary">
                            <Zap className="w-3.5 h-3.5" />
                          </div>
                          <p className="text-gray-950 font-bold text-xs uppercase tracking-wider font-serif">
                            Strategy Advisory Console
                          </p>
                        </div>
                        <div className="h-[240px] flex flex-col bg-white border border-gray-200 p-3">
                          <StrategyChatbot
                            metrics={values}
                            strategy={result.strategy}
                            shap={result.shap}
                            prediction={result.prediction}
                            compact={true}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ── Row 2: SHAP Chart (full width, immediately visible) ── */}
                  {result.shap && (
                    <div className="border border-gray-200 p-6 bg-white shadow-sm space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-gray-900 uppercase font-serif tracking-wider">Worksheet Attribution Analysis</p>
                          <p className="text-[11px] text-gray-700 font-medium mt-0.5">Attribute impact weights calculated on live simulated values</p>
                        </div>
                        <span className="px-2.5 py-0.5 border border-gray-300 text-[10px] font-sans font-bold text-gray-800 bg-gray-100">
                          Causal SHAP attribution
                        </span>
                      </div>
                      <ShapChart data={result.shap} />
                    </div>
                  )}

                  {/* ── Row 3: Strategy detail (expandable explanation + health grid) ── */}
                  {result.strategy && (
                    <div className="border border-gray-200 p-6 bg-white shadow-sm space-y-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-gray-900 font-serif pb-1.5 border-b border-gray-200">Recommended Focus Detail</p>
                      <div className="bg-gray-50 p-4 border border-gray-200">
                        <p className="text-gray-800 text-xs leading-relaxed font-serif font-medium">
                          {result.strategy.explanation}
                        </p>
                      </div>
                      {/* Key metric health indicators */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                          { label: 'Churn Rate',      val: `${(values.churn_rate * 100).toFixed(1)}%`,        good: values.churn_rate < 0.05 },
                          { label: 'Conversion', val: `${(values.conversion_rate * 100).toFixed(1)}%`,   good: values.conversion_rate > 0.02 },
                          { label: 'CLV:CAC Ratio',    val: `${values.cac > 0 ? (values.clv / values.cac).toFixed(1) : '∞'}×`, good: values.cac > 0 && (values.clv / values.cac) > 3 },
                          { label: 'Profit Margin',     val: `${(values.profit_margin * 100).toFixed(1)}%`,     good: values.profit_margin > 0.15 },
                        ].map(({ label, val, good }) => (
                          <div key={label} className={`flex items-center justify-between px-3 py-2 border text-[11px] rounded-none ${
                            good ? 'bg-emerald-50 border-emerald-300 text-emerald-950' : 'bg-rose-50 border-rose-300 text-rose-950'
                          }`}>
                            <span className="text-gray-900 font-bold font-sans">{label}</span>
                            <span className={`font-mono font-extrabold ${good ? 'text-emerald-900' : 'text-rose-900'}`}>{val}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </motion.div>
            </AnimatePresence>
          )}
        </main>
      </div>
    )}
    </div>
  );
};

export default WhatIfPage;
