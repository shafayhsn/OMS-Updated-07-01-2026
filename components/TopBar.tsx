
import React, { useState, useEffect, useMemo } from 'react';
import { Clock, Globe, TrendingUp, MapPin, Calendar, Sparkles, Activity } from 'lucide-react';

interface TopBarProps {
  currencyRates: { USD: number; EUR: number; GBP: number; };
  cottonRate: number;
  enabledCities: string[];
  onOpenAI?: () => void;
}

const CITIES: Record<string, string> = {
  'London': 'Europe/London',
  'New York': 'America/New_York',
  'Los Angeles': 'America/Los_Angeles',
  'Barcelona': 'Europe/Madrid',
  'Dubai': 'Asia/Dubai',
  'Istanbul': 'Europe/Istanbul',
  'Melbourne': 'Australia/Melbourne',
};

export const TopBar: React.FC<TopBarProps> = ({ currencyRates, cottonRate, enabledCities, onOpenAI }) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (timezone: string) => {
    try {
      return new Intl.DateTimeFormat('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: timezone
      }).format(time);
    } catch (e) {
      return '--:--';
    }
  };

  const getKarachiDetails = () => {
    try {
        // Format: "Tue 23 Dec"
        const datePart = new Intl.DateTimeFormat('en-GB', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            timeZone: 'Asia/Karachi'
        }).format(time);

        // Format: "03:01 PM"
        const timePart = new Intl.DateTimeFormat('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
            timeZone: 'Asia/Karachi'
        }).format(time);

        return { date: datePart, time: timePart };
    } catch (e) {
        return { date: '--', time: '--:--' };
    }
  };

  const currentWeek = useMemo(() => {
      const d = new Date(Date.UTC(time.getFullYear(), time.getMonth(), time.getDate()));
      const dayNum = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
      return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1)/7);
  }, [time]);

  const karachiInfo = getKarachiDetails();

  return (
    <div className="bg-white border-b border-gray-200 px-6 flex items-center justify-between h-12 shrink-0 select-none z-30 relative shadow-sm text-[11px] font-medium no-print transition-all">
      
      {/* Left: World Clock Ticker & Currency Rates */}
      <div className="flex items-center gap-8 overflow-hidden">
        <div className="flex items-center gap-6 text-gray-400">
           {enabledCities.map(city => (
             CITIES[city] && (
               <div key={city} className="flex items-center gap-2">
                  <span className="font-normal">{city}</span>
                  <span className="text-[#37352F] font-mono font-bold tracking-tighter">{formatTime(CITIES[city])}</span>
               </div>
             )
           ))}
        </div>

        {/* Currency Rates Ticker */}
        <div className="flex items-center gap-4 border-l border-gray-200 pl-8">
           <div className="flex items-center gap-1.5">
              <span className="text-[#37352F] font-bold">$</span>
              <span className="text-gray-500 font-mono">{currencyRates.USD.toFixed(2)}</span>
           </div>
           <div className="flex items-center gap-1.5">
              <span className="text-[#37352F] font-bold">€</span>
              <span className="text-gray-500 font-mono">{currencyRates.EUR.toFixed(2)}</span>
           </div>
           <div className="flex items-center gap-1.5">
              <span className="text-[#37352F] font-bold">£</span>
              <span className="text-gray-500 font-mono">{currencyRates.GBP.toFixed(2)}</span>
           </div>
           <div className="flex items-center gap-1.5">
              <Activity size={12} className="text-[#37352F]" />
              <span className="text-gray-500 font-mono">{cottonRate.toFixed(2)}</span>
           </div>
        </div>
      </div>

      {/* Right: AI Trigger, Week # & Karachi HQ Time */}
      <div className="flex items-center gap-6">
         {/* Nizamia Intelligence Button - Icon Only */}
         <button 
           onClick={onOpenAI}
           className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-all flex items-center justify-center border border-transparent hover:border-purple-100"
           title="Nizamia Intelligence"
         >
            <Sparkles size={18} />
         </button>

         <div className="flex items-center justify-center px-3 py-1 bg-red-600 rounded text-white font-black shadow-sm">
            <span>W{currentWeek}</span>
         </div>
         
         <div className="flex items-center gap-3">
             <span className="font-bold text-black">{karachiInfo.date}</span>
             <span className="font-mono font-black text-lg tracking-tighter flex items-baseline">
                {karachiInfo.time}
             </span>
         </div>
      </div>

    </div>
  );
};
