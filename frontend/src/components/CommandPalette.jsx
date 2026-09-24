import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronRight } from 'lucide-react';

const formatValue = (key, value) => {
  if (value === undefined || value === null) return 'N/A';
  if (['revenue_growth', 'customer_growth', 'profit_margin', 'churn_rate', 'conversion_rate', 'market_growth_rate', 'competitor_growth'].includes(key)) {
    return `${(value * 100).toFixed(1)}%`;
  }
  if (['marketing_spend', 'aov', 'cac', 'clv'].includes(key)) {
    return `$${value.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2})}`;
  }
  return value;
};

const formatKey = (key) => {
  return key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

const CommandPalette = ({ isOpen, setIsOpen, scenario }) => {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const activeItemRef = useRef(null);

  // Handle Cmd+K / Ctrl+K to open
  useEffect(() => {
    const down = (e) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen((open) => !open);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [setIsOpen]);

  // Focus input when opened, reset state
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setQuery('');
      setActiveIndex(0);
    }
  }, [isOpen]);

  // Reset active index when query changes
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // Scroll active item into view
  useEffect(() => {
    if (activeItemRef.current) {
      activeItemRef.current.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  if (!scenario) return null;

  const insightsList = Object.keys(scenario)
    .filter(key => key !== 'historical_revenue')
    .map(key => ({
      key,
      name: formatKey(key),
      value: formatValue(key, scenario[key])
    }));

  const filteredInsights = insightsList.filter(item =>
    item.name.toLowerCase().includes(query.toLowerCase())
  );

  // Keyboard navigation handler
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev + 1) % filteredInsights.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev - 1 + filteredInsights.length) % filteredInsights.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredInsights[activeIndex]) {
        // Selection acknowledged — close palette (extend with actions here)
        setIsOpen(false);
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            onClick={() => setIsOpen(false)}
          />
          <div className="fixed inset-0 z-[101] pointer-events-none flex items-start justify-center pt-[15vh]">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-xl bg-surface border border-white/10 rounded-2xl shadow-2xl overflow-hidden pointer-events-auto flex flex-col max-h-[60vh]"
            >
              {/* Search Input */}
              <div className="flex items-center px-4 py-3 border-b border-white/5 bg-black/20">
                <Search className="w-5 h-5 text-gray-400 mr-3" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex-1 bg-transparent border-none text-white focus:outline-none placeholder-gray-500 text-lg"
                  placeholder="Search insights, metrics, or values..."
                />
                <kbd className="px-2 py-1 rounded-md bg-white/5 text-xs text-gray-400 font-mono border border-white/10 ml-3">
                  ESC
                </kbd>
              </div>

              {/* Results */}
              <div ref={listRef} className="overflow-y-auto p-2 scrollbar-hide flex-1">
                {filteredInsights.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    No insights found for &quot;{query}&quot;
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filteredInsights.map((insight, idx) => {
                      const isActive = idx === activeIndex;
                      return (
                        <div
                          key={insight.key}
                          ref={isActive ? activeItemRef : null}
                          onMouseEnter={() => setActiveIndex(idx)}
                          onClick={() => setIsOpen(false)}
                          className={`flex items-center justify-between p-3 rounded-xl transition-colors group cursor-pointer ${
                            isActive ? 'bg-primary/10 border border-primary/20' : 'hover:bg-white/5 border border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border transition-colors ${
                              isActive ? 'bg-primary/20 border-primary/50' : 'bg-primary/10 border-primary/20'
                            }`}>
                              <ChevronRight className={`w-4 h-4 transition-colors ${isActive ? 'text-primary' : 'text-primary/60'}`} />
                            </div>
                            <span className={`font-medium transition-colors ${isActive ? 'text-white' : 'text-gray-200'}`}>
                              {insight.name}
                            </span>
                          </div>
                          <div className={`px-3 py-1 rounded-lg border font-mono text-sm shadow-inner transition-colors ${
                            isActive ? 'bg-black/60 border-primary/40 text-primary' : 'bg-black/40 border-white/5 text-primary'
                          }`}>
                            {insight.value}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              
              {/* Footer */}
              <div className="px-4 py-2 border-t border-white/5 bg-black/20 text-xs text-gray-500 flex items-center gap-4">
                <span className="flex items-center gap-1">
                  Use <kbd className="px-1.5 rounded bg-white/10 font-mono">↑</kbd> <kbd className="px-1.5 rounded bg-white/10 font-mono">↓</kbd> to navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 rounded bg-white/10 font-mono">Enter</kbd> to select
                </span>
                <span className="flex items-center gap-1 ml-auto">
                  {filteredInsights.length} result{filteredInsights.length !== 1 ? 's' : ''}
                </span>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CommandPalette;
