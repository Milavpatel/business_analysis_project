import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';

const ShapChart = ({ data }) => {
  if (!data || !data.features) return (
    <div className="h-full flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-sm font-semibold text-gray-700 animate-pulse">Analyzing neural pathways...</p>
      </div>
    </div>
  );

  const chartData = data.features.map((feature, index) => ({
    name: feature.replaceAll('_', ' ').toUpperCase(),
    Impact: data.impacts[index],
    effect: data.effects[index]
  }));

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isPositive = data.effect === 'Positive';
      return (
        <div className="bg-white border border-gray-300 p-4 rounded-none shadow-lg relative overflow-hidden">
          <div className={`absolute top-0 left-0 w-1.5 h-full ${isPositive ? 'bg-emerald-600' : 'bg-rose-600'}`} />
          <p className="font-bold text-gray-950 text-xs tracking-wider mb-1 font-serif">{data.name}</p>
          <p className={`text-sm font-extrabold font-mono ${isPositive ? 'text-emerald-700' : 'text-rose-700'}`}>
            Impact Score: {data.Impact >= 0 ? `+${data.Impact.toFixed(4)}` : data.Impact.toFixed(4)}
          </p>
        </div>
      );
    }
    return null;
  };

  const renderCustomLabel = (props) => {
    const { x, y, width, height, value } = props;
    if (value == null) return null;
    const isPositive = value >= 0;
    const formatted = isPositive ? `+${value.toFixed(3)}` : value.toFixed(3);
    const textX = isPositive ? x + width + 8 : x + width - 8;
    const textAnchor = isPositive ? 'start' : 'end';
    const textColor = isPositive ? '#059669' : '#dc2626';

    return (
      <text
        x={textX}
        y={y + height / 2 + 3.5}
        fill={textColor}
        fontSize={11}
        fontWeight="800"
        fontFamily="monospace"
        textAnchor={textAnchor}
      >
        {formatted}
      </text>
    );
  };

  return (
    <div className="w-full h-80 relative z-10 font-sans">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 15, right: 75, left: 10, bottom: 25 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" horizontal={true} vertical={true} />
          <XAxis 
            type="number" 
            stroke="#475569" 
            domain={['dataMin - 0.05', 'dataMax + 0.03']}
            tickFormatter={(val) => (val === 0 ? '0' : val > 0 ? `+${val.toFixed(2)}` : `${val.toFixed(2)}`)}
            tick={{fill: '#0f172a', fontSize: 11, fontWeight: 700, fontFamily: 'monospace'}}
            tickMargin={8}
          />
          <YAxis 
            dataKey="name" 
            type="category" 
            width={150} 
            stroke="#475569" 
            tick={{fill: '#0f172a', fontSize: 11, fontWeight: 700, fontFamily: 'Lato, sans-serif'}} 
          />
          <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(0,0,0,0.04)'}} />
          <Bar dataKey="Impact" radius={[0, 4, 4, 0]} animationDuration={1000}>
            <LabelList dataKey="Impact" content={renderCustomLabel} />
            {chartData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.effect === 'Positive' ? '#059669' : '#dc2626'} 
                className="opacity-90 hover:opacity-100 transition-opacity duration-300"
                style={{
                  filter: `drop-shadow(0 0 6px ${entry.effect === 'Positive' ? 'rgba(5,150,105,0.4)' : 'rgba(220,38,38,0.4)'})`
                }}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ShapChart;
