import React from 'react';
import { motion } from 'framer-motion';

const KPICard = ({ title, value, icon: Icon, trend }) => {
  return (
    <motion.div 
      whileHover={{ y: -1 }}
      transition={{ duration: 0.15 }}
      className="bg-white border border-gray-200 border-l-[4px] border-l-primary p-4 rounded-none transition-all duration-200 hover:shadow-md flex flex-col justify-between h-full gap-2.5"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-gray-800 font-extrabold text-xs tracking-wider uppercase">{title}</h3>
        {Icon && <Icon className="w-4 h-4 text-primary" />}
      </div>
      
      <div className="flex items-baseline justify-between">
        <span className="text-2xl font-bold text-gray-900 font-sans tracking-tight">{value}</span>
        {trend !== undefined && trend !== null && trend !== 0 && (
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-none ${trend > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
            {trend > 0 ? '▲' : '▼'} {Math.abs(trend)}%
          </span>
        )}
      </div>
    </motion.div>
  );
};

export default KPICard;
