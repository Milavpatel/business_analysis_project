import React, { useCallback } from 'react';
import { motion } from 'framer-motion';
import { Settings2, Zap, Target, DollarSign, TrendingUp, Users } from 'lucide-react';

const InputField = ({ label, name, min, max, step, value, icon: Icon, onChange }) => (
  <div className="mb-5 group flex flex-col">
    <div className="flex justify-between items-center mb-1.5">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-3.5 h-3.5 text-gray-500 group-hover:text-primary transition-colors duration-200" />}
        <label className="text-xs font-bold text-gray-700 uppercase tracking-wider group-hover:text-gray-900 transition-colors duration-200">{label}</label>
      </div>
      <div className="px-2 py-0.5 rounded-none bg-gray-100 border border-gray-200 text-xs text-primary font-mono font-bold shadow-sm">
        {value}
      </div>
    </div>
    <div className="relative w-full h-1.5 bg-gray-200 border border-gray-300 rounded-none overflow-hidden flex items-center transition-all duration-200">
      <div 
        className="absolute top-0 left-0 h-full bg-primary transition-all duration-200"
        style={{ width: `${((value - min) / (max - min)) * 100}%` }}
      />
      <input
        type="range"
        name={name}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={onChange}
        className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer z-10"
      />
    </div>
  </div>
);

const Sidebar = ({ scenario, setScenario }) => {
  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setScenario(prev => ({
      ...prev,
      [name]: parseFloat(value)
    }));
  }, [setScenario]);

  return (
    <motion.aside 
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 300, opacity: 0 }}
      transition={{ type: "spring", stiffness: 100, damping: 20 }}
      className="w-full md:w-[320px] h-full flex flex-col bg-white border-l border-gray-200 z-20 shadow-lg relative"
    >
      <div className="p-5 border-b border-gray-150 flex items-center gap-3 bg-gray-50">
        <div className="w-8 h-8 rounded-none bg-primary flex items-center justify-center">
          <Settings2 className="w-4 h-4 text-white" />
        </div>
        <div>
          <h2 className="text-xs font-extrabold text-gray-900 tracking-wider uppercase font-serif">Scenario Engine</h2>
          <p className="text-[9px] text-gray-500 uppercase tracking-widest">Live Forecasting</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 scrollbar-hide">
        <div className="space-y-1">
          <InputField label="Revenue Growth" name="revenue_growth" min={-0.5} max={1.0} step={0.01} value={scenario.revenue_growth} icon={TrendingUp} onChange={handleChange} />
          <InputField label="Customer Growth" name="customer_growth" min={-0.5} max={1.0} step={0.01} value={scenario.customer_growth} icon={Users} onChange={handleChange} />
          <InputField label="Profit Margin" name="profit_margin" min={-0.5} max={0.5} step={0.01} value={scenario.profit_margin} icon={DollarSign} onChange={handleChange} />
          <InputField label="Churn Rate" name="churn_rate" min={0.0} max={0.5} step={0.01} value={scenario.churn_rate} icon={Target} onChange={handleChange} />
          
          <div className="mb-5 pt-1">
            <div className="flex items-center gap-2 mb-1.5">
              <Zap className="w-3.5 h-3.5 text-gray-500" />
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Marketing Spend ($)</label>
            </div>
            <input type="number" name="marketing_spend" value={scenario.marketing_spend} onChange={handleChange} className="input-field rounded-none bg-white" step="1000" />
          </div>
          
          <InputField label="Conversion Rate" name="conversion_rate" min={0.0} max={0.15} step={0.01} value={scenario.conversion_rate} onChange={handleChange} />
          
          <div className="mb-5 pt-1">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 block">Avg Order Value ($)</label>
            <input type="number" name="aov" value={scenario.aov} onChange={handleChange} className="input-field rounded-none bg-white" step="5" />
          </div>
          
          <div className="mb-5 pt-1">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 block">CAC ($)</label>
            <input type="number" name="cac" value={scenario.cac} onChange={handleChange} className="input-field rounded-none bg-white" step="5" />
          </div>
          
          <div className="mb-5 pt-1">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 block">CLV ($)</label>
            <input type="number" name="clv" value={scenario.clv} onChange={handleChange} className="input-field rounded-none bg-white" step="10" />
          </div>

          <InputField label="Market Growth" name="market_growth_rate" min={-0.1} max={0.2} step={0.01} value={scenario.market_growth_rate} onChange={handleChange} />
          <InputField label="Competitor Growth" name="competitor_growth" min={-0.1} max={0.2} step={0.01} value={scenario.competitor_growth} onChange={handleChange} />
        </div>
      </div>
    </motion.aside>
  );
};

export default Sidebar;
