import React from 'react';
import { ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LabelList } from 'recharts';

const ForecastChart = ({ data }) => {
  if (!data || !data.forecast || !data.historical) return (
    <div className="h-full flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-sm font-semibold text-gray-700 animate-pulse">Computing Prophet vectors...</p>
      </div>
    </div>
  );

  const historicalMap = new Map(data.historical.map(item => [item.month, item.revenue]));
  
  const chartData = data.forecast.map(point => ({
    date: point.ds,
    actual: historicalMap.get(point.ds) || null,
    forecast: point.yhat,
    range: [point.yhat_lower, point.yhat_upper]
  }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-300 p-4 rounded-none shadow-lg min-w-[210px]">
          <p className="font-bold text-gray-950 text-xs tracking-wider border-b border-gray-200 pb-2 mb-3 font-serif">{label}</p>
          <div className="space-y-2 text-xs">
            {payload.map((entry, index) => {
              if (entry.name === 'range') return null;
              return (
                <div key={index} className="flex justify-between items-center gap-4">
                  <span className="text-gray-700 flex items-center gap-2 font-sans font-bold">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                    {entry.name}
                  </span>
                  <span className="font-mono font-extrabold text-gray-950">
                    ${entry.value != null ? entry.value.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0}) : 'N/A'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-[400px] relative z-10 font-sans">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 25, right: 35, left: 20, bottom: 10 }}>
          <defs>
            <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="rgb(var(--primary))" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="rgb(var(--primary))" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" vertical={false} />
          <XAxis 
            dataKey="date" 
            stroke="#475569" 
            tick={{fill: '#0f172a', fontSize: 11, fontWeight: 700, fontFamily: 'Lato, sans-serif'}} 
            tickMargin={10}
            minTickGap={30}
          />
          <YAxis 
            stroke="#475569" 
            tick={{fill: '#0f172a', fontSize: 11, fontWeight: 700, fontFamily: 'Lato, sans-serif'}} 
            tickFormatter={(value) => `$${(value/1000)}k`} 
            tickMargin={10}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#475569', strokeWidth: 1.5, strokeDasharray: '3 3' }} />
          <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px', fontWeight: 'bold', color: '#0f172a', fontFamily: 'Lato, sans-serif' }} />
          
          <Area 
            type="monotone" 
            dataKey="range" 
            name="Confidence Interval" 
            fill="url(#forecastGradient)" 
            stroke="none" 
            fillOpacity={1} 
          />
          <Line 
            type="monotone" 
            dataKey="forecast" 
            name="AI Forecast" 
            stroke="rgb(var(--primary))" 
            strokeWidth={3.5}
            dot={{ r: 4, fill: 'rgb(var(--primary))', strokeWidth: 0 }}
            activeDot={{ r: 7, fill: 'rgb(var(--primary))', strokeWidth: 0 }}
            style={{ filter: 'drop-shadow(0 0 6px rgba(var(--primary), 0.5))' }}
          >
            <LabelList
              dataKey="forecast"
              position="top"
              formatter={(val) => (val != null ? `$${Math.round(val / 1000)}k` : '')}
              style={{ fill: '#0f172a', fontSize: '10px', fontWeight: '800', fontFamily: 'monospace' }}
            />
          </Line>
          <Line 
            type="monotone" 
            dataKey="actual" 
            name="Actual Revenue" 
            stroke="rgb(var(--accent))" 
            strokeWidth={2.5} 
            dot={{ r: 5, fill: 'rgb(var(--accent))', strokeWidth: 0 }} 
            activeDot={{ r: 7, fill: 'rgb(var(--accent))' }} 
          >
            <LabelList
              dataKey="actual"
              position="bottom"
              formatter={(val) => (val != null ? `$${Math.round(val / 1000)}k` : '')}
              style={{ fill: '#b10e0e', fontSize: '10px', fontWeight: '800', fontFamily: 'monospace' }}
            />
          </Line>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ForecastChart;
