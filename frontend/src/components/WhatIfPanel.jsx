import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FlaskConical, Zap, TrendingUp, AlertTriangle, Activity,
  Target, Loader2, RefreshCw, ChevronRight, Info
} from 'lucide-react';
import ShapChart from './ShapChart';
import { simulateScenario } from '../services/dataApi';

// ─── Default scenario values ───────────────────────────────────────────────────
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

// ─── Slider field definitions ──────────────────────────────────────────────────
const FIELDS = [
  {
    group: 'Growth',
    color: 'emerald',
    items: [
      { key: 'revenue_growth',     label: 'Revenue Growth',     min: -0.3,  max: 0.5,   step: 0.01,  pct: true,  tip: 'YoY revenue change rate' },
      { key: 'customer_growth',    label: 'Customer Growth',    min: -0.2,  max: 0.5,   step: 0.01,  pct: true,  tip: 'YoY new-customer growth rate' },
      { key: 'market_growth_rate', label: 'Market Growth Rate', min: -0.1,  max: 0.3,   step: 0.01,  pct: true,  tip: 'Overall market expansion rate' },
      { key: 'competitor_growth',  label: 'Competitor Growth',  min: -0.1,  max: 0.3,   step: 0.01,  pct: true,  tip: 'How fast competitors are growing' },
    ],
  },
  {
    group: 'Margins & Retention',
    color: 'sky',
    items: [
      { key: 'profit_margin',   label: 'Profit Margin',    min: -0.2, max: 0.5,  step: 0.01, pct: true,  tip: 'Net profit as % of revenue' },
      { key: 'churn_rate',      label: 'Churn Rate',       min: 0,    max: 0.3,  step: 0.005,pct: true,  tip: 'Monthly customer churn rate' },
      { key: 'conversion_rate', label: 'Conversion Rate',  min: 0,    max: 0.2,  step: 0.001,pct: true,  tip: 'Lead-to-customer conversion rate' },
    ],
  },
  {
    group: 'Unit Economics',
    color: 'violet',
    items: [
      { key: 'marketing_spend', label: 'Marketing Spend ($)', min: 0,    max: 50000, step: 500,  pct: false, tip: 'Monthly marketing budget in $' },
      { key: 'aov',             label: 'Avg Order Value ($)', min: 10,   max: 2000,  step: 10,   pct: false, tip: 'Average revenue per transaction' },
      { key: 'cac',             label: 'CAC ($)',              min: 0,    max: 1000,  step: 5,    pct: false, tip: 'Customer acquisition cost' },
      { key: 'clv',             label: 'CLV ($)',              min: 0,    max: 10000, step: 50,   pct: false, tip: 'Customer lifetime value' },
    ],
  },
];

const GROUP_COLORS = {
  emerald: {
    label: 'text-emerald-900 font-extrabold',
    track: 'accent-emerald-600',
    badge: 'bg-emerald-100 border-emerald-300 text-emerald-950 font-bold',
    dot:   'bg-emerald-600',
  },
  sky: {
    label: 'text-sky-900 font-extrabold',
    track: 'accent-sky-600',
    badge: 'bg-sky-100 border-sky-300 text-sky-950 font-bold',
    dot:   'bg-sky-600',
  },
  violet: {
    label: 'text-violet-900 font-extrabold',
    track: 'accent-violet-600',
    badge: 'bg-violet-100 border-violet-300 text-violet-950 font-bold',
    dot:   'bg-violet-600',
  },
};

// ─── Format display value ──────────────────────────────────────────────────────
const fmt = (val, pct) =>
  pct ? `${(val * 100).toFixed(1)}%` : `$${Number(val).toLocaleString()}`;

// ─── Slider row ────────────────────────────────────────────────────────────────
const SliderRow = ({ field, value, color, onChange }) => {
  const [showTip, setShowTip] = useState(false);
  const c = GROUP_COLORS[color];
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-900 font-extrabold">{field.label}</span>
          <button
            onMouseEnter={() => setShowTip(true)}
            onMouseLeave={() => setShowTip(false)}
            className="relative"
          >
            <Info className="w-3.5 h-3.5 text-gray-500 hover:text-gray-900 transition-colors" />
            <AnimatePresence>
              {showTip && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-44 bg-gray-900 border border-gray-700 rounded-none px-3 py-2 text-[11px] font-semibold text-white z-50 pointer-events-none shadow-xl"
                >
                  {field.tip}
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        </div>
        <span className={`text-xs font-mono font-extrabold px-2 py-0.5 rounded-none border ${c.badge}`}>
          {fmt(value, field.pct)}
        </span>
      </div>
      <input
        type="range"
        min={field.min}
        max={field.max}
        step={field.step}
        value={value}
        onChange={e => onChange(field.key, parseFloat(e.target.value))}
        className={`w-full h-2 rounded-none appearance-none cursor-pointer bg-gray-200 border border-gray-300 ${c.track}`}
        style={{ accentColor: color === 'emerald' ? '#059669' : color === 'sky' ? '#0284c7' : '#7c3aed' }}
      />
      <div className="flex justify-between text-[10px] text-gray-700 font-mono font-bold">
        <span>{fmt(field.min, field.pct)}</span>
        <span>{fmt(field.max, field.pct)}</span>
      </div>
    </div>
  );
};

// ─── Status badge ──────────────────────────────────────────────────────────────
const StatusBadge = ({ code, label }) => {
  const styles = {
    2: { cls: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-400', Icon: TrendingUp },
    1: { cls: 'from-amber-500/20 to-yellow-500/10 border-amber-500/30 text-amber-400',   Icon: Activity },
    0: { cls: 'from-rose-500/20 to-red-500/10 border-rose-500/30 text-rose-400',         Icon: AlertTriangle },
  };
  const s = styles[code] ?? { cls: 'from-gray-500/20 to-slate-500/10 border-gray-500/30 text-gray-400', Icon: Target };
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border bg-gradient-to-r ${s.cls}`}>
      <div className="p-1.5 bg-black/20 rounded-full"><s.Icon className="w-4 h-4" /></div>
      <div>
        <p className="text-[10px] uppercase tracking-widest opacity-70">Growth Vector</p>
        <p className="font-bold text-sm">{label}</p>
      </div>
    </div>
  );
};

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

// ─── Main WhatIfPanel ─────────────────────────────────────────────────────────
const WhatIfPanel = () => {
  const [values, setValues] = useState(() => getBaselineValues());
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState(null);

  React.useEffect(() => {
    setValues(getBaselineValues());
  }, []);

  const handleChange = useCallback((key, val) => {
    setValues(prev => ({ ...prev, [key]: val }));
  }, []);

  const handleReset = useCallback(() => {
    setValues(getBaselineValues());
    setResult(null);
    setError(null);
  }, []);

  const handleSimulate = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await simulateScenario(values);
      setResult(data);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Simulation failed. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }, [values]);

  // Derived ratio for preview
  const cacClvRatio = values.cac > 0 ? (values.clv / values.cac).toFixed(2) : '∞';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-6"
    >
      {/* Header */}
      <div className="glass-panel p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
            <FlaskConical className="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <h2 className="font-bold text-white text-sm">What-If Scenario Simulator</h2>
            <p className="text-[10px] text-gray-400">Tune inputs and run live XGBoost + SHAP simulation</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Live preview badge */}
          <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 bg-black/30 border border-white/5 rounded-xl text-[10px] text-gray-400">
            <span>CLV:CAC</span>
            <span className="font-mono font-bold text-violet-300">{cacClvRatio}×</span>
          </div>
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-gray-500 hover:text-white border border-white/5 hover:border-white/15 bg-white/3 hover:bg-white/6 transition-all text-xs"
          >
            <RefreshCw className="w-3 h-3" /> Reset
          </button>
        </div>
      </div>

      {/* Sliders + Results side-by-side */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* ── LEFT: Sliders ── */}
        <div className="space-y-5">
          {FIELDS.map(group => (
            <div key={group.group} className="glass-panel p-5 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-1.5 h-1.5 rounded-full ${GROUP_COLORS[group.color].dot}`} />
                <p className={`text-[10px] font-bold uppercase tracking-wider ${GROUP_COLORS[group.color].label}`}>
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

          {/* Run button */}
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleSimulate}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-xl bg-gradient-to-r from-violet-600 to-primary text-white font-semibold text-sm tracking-wide shadow-lg shadow-violet-500/20 hover:shadow-violet-500/40 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Simulating…</>
              : <><Zap className="w-4 h-4" /> Run Simulation <ChevronRight className="w-4 h-4" /></>
            }
          </motion.button>

          {error && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex items-center gap-3 p-4 rounded-xl border border-rose-500/30 bg-rose-950/40 text-rose-300 text-xs"
            >
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {error}
            </motion.div>
          )}
        </div>

        {/* ── RIGHT: Results ── */}
        <div className="space-y-5">
          <AnimatePresence mode="wait">
            {!result && !loading && (
              <motion.div
                key="placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="glass-panel p-10 flex flex-col items-center justify-center gap-5 text-center h-full min-h-[320px] border-dashed"
              >
                <div className="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                  <FlaskConical className="w-7 h-7 text-violet-400/50" />
                </div>
                <div className="space-y-1.5">
                  <p className="text-sm font-semibold text-gray-400">No simulation yet</p>
                  <p className="text-xs text-gray-600 max-w-[260px]">
                    Adjust the sliders on the left and hit <span className="text-violet-400 font-medium">Run Simulation</span> to get live XGBoost predictions + SHAP analysis.
                  </p>
                </div>
                {[
                  { icon: TrendingUp, text: 'Growth status prediction' },
                  { icon: Activity,   text: 'SHAP causal analysis' },
                  { icon: Target,     text: 'Strategic recommendation' },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-2 text-xs text-gray-600">
                    <Icon className="w-3.5 h-3.5 text-violet-500/50" />{text}
                  </div>
                ))}
              </motion.div>
            )}

            {loading && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="glass-panel flex flex-col items-center justify-center gap-5 min-h-[320px]"
              >
                <div className="w-14 h-14 rounded-full border-2 border-violet-500/20 border-t-violet-400 animate-spin" />
                <p className="text-sm text-violet-300 uppercase tracking-widest animate-pulse">Running Model…</p>
                <p className="text-xs text-gray-500">XGBoost · SHAP · Strategy Engine</p>
              </motion.div>
            )}

            {result && !loading && (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-5"
              >
                {/* Growth Status */}
                <div className="glass-panel p-5 space-y-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Prediction Result</p>
                  {result.prediction && (
                    <StatusBadge
                      code={result.prediction.growth_status_code}
                      label={result.prediction.growth_status}
                    />
                  )}
                </div>

                {/* Strategy */}
                {result.strategy && (
                  <div className="glass-panel p-5 space-y-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">AI Strategy</p>
                    <div className="bg-black/40 rounded-xl p-4 border border-white/5">
                      <p className="text-primary font-semibold text-xs uppercase tracking-wider mb-2">
                        {result.strategy.strategy}
                      </p>
                      <p className="text-gray-300 text-xs leading-relaxed">
                        {result.strategy.explanation}
                      </p>
                    </div>
                  </div>
                )}

                {/* SHAP */}
                {result.shap && (
                  <div className="glass-panel p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Causal Impact (SHAP)</p>
                      <span className="flex items-center gap-1.5 px-2.5 py-1 bg-white/5 rounded-full border border-white/10 text-[10px] text-gray-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                        Scenario inputs
                      </span>
                    </div>
                    <ShapChart data={result.shap} />
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

export default WhatIfPanel;
