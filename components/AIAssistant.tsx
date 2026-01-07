import React, { useState } from 'react';
import { Sparkles, X, Send, Loader2 } from 'lucide-react';
import { askGemini } from '../services/geminiService';

interface AIAssistantProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AIAssistant: React.FC<AIAssistantProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAsk = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setResponse(null);
    try {
      const result = await askGemini(query, "User is on the main dashboard.");
      setResponse(result);
    } catch (e) {
      setResponse("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[200] no-print">
      <div className="bg-white border border-gray-200 shadow-2xl rounded-xl w-80 sm:w-96 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="p-3 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-purple-600" />
            <span className="text-sm font-semibold text-gray-700">Nizamia Intelligence</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={16} />
          </button>
        </div>
        
        <div className="p-4 max-h-64 overflow-y-auto text-sm text-gray-800 leading-relaxed">
          {response ? (
            <div className="prose prose-sm max-w-none">
               {/* Simple markdown parser replacement for safety */}
               {response.split('\n').map((line, i) => <p key={i} className="mb-1">{line}</p>)}
            </div>
          ) : (
            <p className="text-gray-400 italic">How can I help with your merchandising today?</p>
          )}
        </div>

        <div className="p-3 border-t border-gray-100 flex gap-2 bg-white">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
            placeholder="Ask about costing, orders..."
            className="flex-1 bg-gray-50 border-none rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-gray-200 outline-none"
          />
          <button 
            onClick={handleAsk}
            disabled={loading}
            className="p-2 bg-black text-white rounded-md hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
};