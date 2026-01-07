
import React, { useState, useEffect } from 'react';
import { RefreshCw, Save, Clock, Globe, Activity } from 'lucide-react';

interface CurrencyRates {
  USD: number;
  EUR: number;
  GBP: number;
  lastUpdated: string;
}

interface CurrencyAutoUpdaterSettingsProps {
  currentRates: CurrencyRates;
  onUpdateRates: (rates: CurrencyRates) => void;
  cottonRate?: number;
  onUpdateCottonRate?: (rate: number) => void;
}

export const CurrencyAutoUpdaterSettings: React.FC<CurrencyAutoUpdaterSettingsProps> = ({ 
  currentRates, 
  onUpdateRates,
  cottonRate = 95.50,
  onUpdateCottonRate
}) => {
  const [rates, setRates] = useState<CurrencyRates>(currentRates);
  const [localCottonRate, setLocalCottonRate] = useState<number>(cottonRate);
  const [isAutoUpdating, setIsAutoUpdating] = useState(true);
  const [countdown, setCountdown] = useState(15);
  const [isSimulatingFetch, setIsSimulatingFetch] = useState(false);

  // Sync local state if parent changes (initial load)
  useEffect(() => {
    setRates(currentRates);
    setLocalCottonRate(cottonRate);
  }, [currentRates.lastUpdated, cottonRate]);

  // Auto-Update Logic
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    let timer: ReturnType<typeof setInterval>;

    if (isAutoUpdating) {
      // Countdown timer
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) return 15;
          return prev - 1;
        });
      }, 1000);

      // Fetch simulation every 15 seconds
      interval = setInterval(() => {
        simulateAutoFetch();
      }, 15000);
    }

    return () => {
      clearInterval(interval);
      clearInterval(timer);
    };
  }, [isAutoUpdating, rates, localCottonRate]); 

  const simulateAutoFetch = async () => {
    setIsSimulatingFetch(true);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));

    // Random micro-fluctuations to simulate live market
    const fluctuation = () => (Math.random() - 0.5) * 0.5; 
    const cottonFluctuation = () => (Math.random() - 0.5) * 1.5;

    const newRates = {
      USD: parseFloat((rates.USD + fluctuation()).toFixed(2)),
      EUR: parseFloat((rates.EUR + fluctuation()).toFixed(2)),
      GBP: parseFloat((rates.GBP + fluctuation()).toFixed(2)),
      lastUpdated: new Date().toISOString()
    };

    const newCotton = parseFloat((localCottonRate + cottonFluctuation()).toFixed(2));

    setRates(newRates);
    setLocalCottonRate(newCotton);
    
    onUpdateRates(newRates);
    if (onUpdateCottonRate) onUpdateCottonRate(newCotton);

    setIsSimulatingFetch(false);
    setCountdown(15); // Reset countdown
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-3 border-b border-gray-100 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-blue-50 text-blue-600 rounded-md">
            <Globe size={18} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#37352F] uppercase tracking-wide">Market Data Feed</h2>
            <p className="text-[10px] text-gray-500">Live exchange & commodity rates.</p>
          </div>
        </div>
        
        {/* Status Badge */}
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold transition-colors
          ${isAutoUpdating ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
          <Activity size={12} className={isAutoUpdating ? 'animate-pulse' : ''} />
          {isAutoUpdating ? (
             isSimulatingFetch ? 'Fetching...' : `Live (${countdown}s)`
          ) : 'Paused'}
        </div>
      </div>

      {/* Rates Display Grid */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
            {['USD', 'EUR', 'GBP'].map((curr) => (
            <div key={curr} className="flex flex-col p-2 bg-gray-50 rounded border border-gray-200">
                <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-gray-500">{curr} to PKR</span>
                    {isAutoUpdating && <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse"></div>}
                </div>
                <div className="text-sm font-mono font-bold text-[#37352F]">
                    {rates[curr as keyof CurrencyRates].toFixed(2)}
                </div>
            </div>
            ))}
            
            {/* Cotton Card */}
            <div className="flex flex-col p-2 bg-blue-50 rounded border border-blue-100">
                <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-blue-600">US Cotton (lb)</span>
                    {isAutoUpdating && <div className="w-1 h-1 rounded-full bg-blue-500 animate-pulse"></div>}
                </div>
                <div className="text-sm font-mono font-bold text-blue-800">
                    {localCottonRate.toFixed(2)} <span className="text-[9px] font-normal">USc</span>
                </div>
            </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
         <div className="text-[10px] text-gray-400 flex items-center gap-1">
            <Clock size={10} />
            Updated: {new Date(rates.lastUpdated).toLocaleTimeString()}
         </div>
         
         <button 
            onClick={() => setIsAutoUpdating(!isAutoUpdating)}
            className="px-2.5 py-1.5 text-[10px] font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
         >
            {isAutoUpdating ? 'Pause' : 'Resume'}
         </button>
      </div>

    </div>
  );
};
