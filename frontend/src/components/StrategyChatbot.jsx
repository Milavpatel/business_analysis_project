import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Send, Sparkles, Loader2, Play, Info, Maximize2, Minimize2, X } from 'lucide-react';
import { chatWithAdvisor } from '../services/dataApi';

// Simple Markdown-to-HTML parser for safety and layout cleanliness
const formatMessageContent = (text) => {
  if (!text) return '';
  
  // Split into lines
  const lines = text.split('\n');
  const elements = [];
  
  lines.forEach((line, idx) => {
    let processed = line;
    
    // Bold parsing
    processed = processed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Inline code parsing
    processed = processed.replace(/`/g, '"'); // safely replace backticks

    // Headers (### Header)
    if (line.startsWith('### ')) {
      const headerText = line.substring(4);
      elements.push(
        <h4 key={idx} className="text-gray-900 font-bold text-xs mt-3 mb-1.5 uppercase tracking-wide border-b border-gray-200 pb-1">
          {headerText}
        </h4>
      );
      return;
    }

    // Checklists (- [ ] item or - [x] item)
    const checklistMatch = line.match(/^-\s+\[\s*([ xX]?)\s*\]\s+(.*)/);
    if (checklistMatch) {
      const checked = checklistMatch[1].toLowerCase() === 'x';
      const itemText = checklistMatch[2].replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      elements.push(
        <div key={idx} className="flex items-start gap-2 my-1 text-[11px] text-gray-800 font-medium">
          <input 
            type="checkbox" 
            checked={checked} 
            readOnly 
            className="mt-0.5 w-3 h-3 rounded-none border-gray-400 bg-white text-primary focus:ring-0 focus:ring-offset-0 pointer-events-none" 
          />
          <span 
            className={checked ? "line-through text-gray-500" : ""} 
            dangerouslySetInnerHTML={{ __html: itemText }} 
          />
        </div>
      );
      return;
    }

    // Standard bullet lists (- item)
    if (line.startsWith('- ')) {
      const itemText = line.substring(2).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      elements.push(
        <div key={idx} className="flex items-start gap-1.5 my-1 text-[11px] text-gray-800 font-medium ml-2">
          <span className="text-primary font-bold mt-0.5">•</span>
          <span dangerouslySetInnerHTML={{ __html: itemText }} />
        </div>
      );
      return;
    }

    // Standard paragraph line (with HTML-bold styling)
    if (processed.trim() === '') {
      elements.push(<div key={idx} className="h-1.5" />);
    } else {
      elements.push(
        <p key={idx} className="text-[11px] leading-relaxed text-gray-800 font-medium" dangerouslySetInnerHTML={{ __html: processed }} />
      );
    }
  });

  return <div className="space-y-1">{elements}</div>;
};

const StrategyChatbot = ({ metrics, strategy, shap, prediction, compact = false }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  
  const messagesEndRef = useRef(null);
  const modalInputRef = useRef(null);
  
  // Track strategy name to detect updates
  const currentStratName = strategy?.strategy || 'Steady-State Optimization';
  const prevStratRef = useRef(currentStratName);

  // Focus modal input on expansion & listen for Escape key
  useEffect(() => {
    if (isExpanded) {
      setTimeout(() => {
        modalInputRef.current?.focus();
      }, 80);

      const handleKeyDown = (e) => {
        if (e.key === 'Escape') setIsExpanded(false);
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isExpanded]);

  // Initialize messages or detect strategy updates
  useEffect(() => {
    // Initial welcome message
    const initialGreeting = {
      role: 'assistant',
      content: `Hello! I am your **OpenAI Strategy Copilot**.\n\nI have loaded your baseline metrics, dataset history, and SHAP drivers, and recommend the **${currentStratName}** strategy.\n\nAsk me any question about your data history, strategic recommendations, or custom scenario playbooks!`,
      isSystem: false
    };
    
    // Check if strategy changed
    if (messages.length > 0 && prevStratRef.current !== currentStratName) {
      setMessages(prev => [
        ...prev,
        {
          role: 'system',
          content: `🔄 Recommended strategy updated to: **${currentStratName}**`,
          isSystem: true
        },
        {
          role: 'assistant',
          content: `I've updated my context to align with your new **${currentStratName}** strategy.\n\nWhat would you like to explore regarding these changes?`,
          isSystem: false
        }
      ]);
      prevStratRef.current = currentStratName;
    } else if (messages.length === 0) {
      setMessages([initialGreeting]);
      prevStratRef.current = currentStratName;
    }
  }, [currentStratName]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll to bottom whenever messages list changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, isExpanded]);

  const handleSendMessage = async (textToSend, bypassExpand = false) => {
    const queryText = textToSend || input;
    if (!queryText.trim()) return;

    if (!textToSend) {
      setInput('');
    }

    // Auto-expand if anyone uses the chatbot
    if (!isExpanded && !bypassExpand) {
      setIsExpanded(true);
    }

    const newMessages = [...messages, { role: 'user', content: queryText }];
    setMessages(newMessages);
    setLoading(true);

    try {
      // Format messages history for the API (only user/assistant roles, no system notes)
      const apiHistory = messages
        .filter(m => !m.isSystem)
        .map(m => ({ role: m.role, content: m.content }));

      const reqBody = {
        message: queryText,
        history: apiHistory,
        metrics: metrics || {},
        strategy: strategy || {},
        shap: shap || null
      };

      const response = await chatWithAdvisor(reqBody);
      setMessages(prev => [...prev, { role: 'assistant', content: response.reply }]);
    } catch (err) {
      console.error("Chat error:", err);
      setMessages(prev => [
        ...prev, 
        { 
          role: 'assistant', 
          content: '⚠️ *Sorry, I failed to get advice from the backend advisor. Make sure the server is running.*' 
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const suggestions = [
    { label: '📋 Actions', text: 'Show me the action checklist' },
    { label: '❓ Rationale', text: 'Why this strategy?' },
    { label: '⚠️ Risks', text: 'What are the main risks?' },
    { label: '📊 SHAP Drivers', text: 'Explain the SHAP variables' }
  ];

  // Helper to render the core chat contents (messages, suggestions, input box)
  const renderChatContents = (isModalView = false) => (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Messages Window */}
      <div className={`overflow-y-auto pr-1 space-y-3 scrollbar-thin ${
        isModalView 
          ? 'flex-1' 
          : compact 
            ? 'h-[110px]' 
            : 'h-[170px]'
      }`}>
        {messages.map((m, idx) => {
          if (m.isSystem) {
            return (
              <div key={idx} className="flex justify-center my-1">
                <span className="text-[10px] bg-panel/50 border border-theme rounded-md px-3 py-0.5 text-gray-400 font-mono">
                  {m.content}
                </span>
              </div>
            );
          }

          const isUser = m.role === 'user';
          return (
            <div
              key={idx}
              className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 text-xs border leading-relaxed ${
                  isUser
                    ? 'bg-primary/10 border-primary/20 text-white rounded-tr-none'
                    : 'bg-panel/50 border-theme text-gray-200 rounded-tl-none'
                }`}
              >
                {!isUser && (
                  <div className="flex items-center gap-1.5 mb-1 text-[9px] uppercase tracking-wider text-primary font-bold">
                    <Sparkles className="w-2.5 h-2.5 animate-pulse" />
                    Growth Copilot
                  </div>
                )}
                {formatMessageContent(m.content)}
              </div>
            </div>
          );
        })}
        {loading && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-lg rounded-tl-none px-3 py-2 border bg-panel/50 border-theme text-gray-400 text-xs">
              <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-wider text-primary font-bold mb-1.5">
                <Loader2 className="w-2.5 h-2.5 animate-spin" />
                Thinking...
              </div>
              <div className="flex gap-1.5 items-center py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Suggestions */}
      <div className="flex flex-wrap gap-1.5 mt-2.5 mb-2.5 shrink-0">
        {suggestions.map((s, i) => (
          <button
            key={i}
            disabled={loading}
            onClick={() => {
              if (!isModalView) setIsExpanded(true);
              handleSendMessage(s.text, isModalView);
            }}
            className="text-[10px] px-2.5 py-1 rounded-none border border-gray-205 hover:border-primary bg-gray-50 hover:bg-primary/5 text-gray-600 hover:text-primary transition-all font-medium disabled:opacity-50 disabled:pointer-events-none"
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Input box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!isModalView) {
            setIsExpanded(true);
            handleSendMessage();
          } else {
            handleSendMessage(null, true);
          }
        }}
        className="flex gap-2 items-center border border-gray-300 bg-white rounded-none p-1.5 shrink-0"
      >
        <input
          type="text"
          value={input}
          ref={isModalView ? modalInputRef : null}
          disabled={loading}
          onChange={(e) => setInput(e.target.value)}
          onFocus={() => {
            if (!isModalView) setIsExpanded(true);
          }}
          placeholder="Ask a question about your business..."
          className="flex-1 bg-transparent border-0 ring-0 focus:ring-0 focus:outline-none placeholder-gray-400 text-xs text-gray-900 px-2 py-1 font-sans"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="w-7 h-7 rounded-none bg-primary text-white flex items-center justify-center transition-all disabled:opacity-30 disabled:pointer-events-none shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );

  return (
    <>
      {/* ── Inline view (clean summary card with chat trigger) ── */}
      <div className="flex flex-col h-full text-left justify-between py-1 relative">
        <div className="space-y-2">
          <p className="text-primary font-bold text-xs uppercase tracking-wide font-sans">
            {currentStratName}
          </p>
          <p className="text-gray-600 text-[11px] leading-relaxed line-clamp-4 font-serif">
            {strategy?.explanation || "Metrics are broadly balanced. Focus on compounding marginal gains across operational channels."}
          </p>
        </div>
        
        <button
          onClick={() => setIsExpanded(prev => !prev)}
          className={`w-full mt-2.5 flex items-center justify-center gap-1.5 py-2 border-2 transition-all text-xs font-extrabold uppercase tracking-wider rounded-none shadow-sm active:scale-[0.98] ${
            isExpanded 
              ? 'border-gray-300 bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-700'
              : 'border-primary text-primary hover:bg-primary/5'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          {isExpanded ? 'Active in Analysis Panel' : 'Consult Strategy Copilot'}
        </button>
      </div>

      {/* ── Expanded Window Overlay (90% Screen Coverage via React Portal) ── */}
      {isExpanded && createPortal(
        <div 
          onClick={() => setIsExpanded(false)}
          className="fixed inset-0 bg-black/35 flex items-center justify-center z-[1000] p-4 md:p-6 animate-fadeIn"
        >
          {/* Modal Container */}
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-[95vw] md:w-[90vw] h-[90vh] bg-white flex flex-col p-6 shadow-2xl border border-gray-350 rounded-none animate-zoomIn"
          >
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 pb-3.5 mb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-none bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-extrabold text-gray-900 text-sm font-serif uppercase tracking-wider">Growth Strategy Advisor</h3>
                  <p className="text-[10px] text-gray-500 font-sans mt-0.5">
                    Recommended Strategy: <span className="text-primary font-bold">{currentStratName}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsExpanded(false)}
                  className="p-1.5 rounded-none text-gray-500 hover:text-gray-900 hover:bg-gray-150 transition-all"
                  title="Close (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 min-h-0">
              {renderChatContents(true)}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>

  );
};

export default StrategyChatbot;
