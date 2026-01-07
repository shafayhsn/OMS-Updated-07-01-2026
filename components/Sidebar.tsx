
import React, { useState, useEffect, useRef } from 'react';
import { NAV_ITEMS, LOGO_URL, PRODUCTION_TOOLS } from '../constants';
import { Tab } from '../types';
import { Wrench, CalendarRange, CheckSquare, User, LogOut, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';

interface SidebarProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  onOpenEvents: () => void;
  onOpenTool: (toolId: string) => void; // For opening global modals
  onLogout: () => void;
  companyLogo?: string | null;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, onOpenEvents, onOpenTool, onLogout, companyLogo }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const toolsMenuRef = useRef<HTMLDivElement>(null);

  const handleUserClick = () => {
    onLogout();
  };

  // Close tools menu if clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (toolsMenuRef.current && !toolsMenuRef.current.contains(event.target as Node)) {
            setIsToolsOpen(false);
        }
    };
    if (isToolsOpen) document.addEventListener('mousedown', handleClickOutside);
    else document.removeEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isToolsOpen]);

  return (
    <div 
        className={`${isCollapsed ? 'w-16' : 'w-60'} h-screen bg-[#F7F7F5] border-r border-[#E0E0E0] flex flex-col flex-shrink-0 no-print relative transition-all duration-300 ease-in-out font-sans`}
    >
      {/* Collapse Toggle Button - Permanently Visible */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-8 bg-white border border-gray-200 rounded-full p-1 shadow-sm text-gray-400 hover:text-[#37352F] hover:bg-gray-50 z-50 transition-colors"
        title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Logo Area */}
      <div className={`h-14 flex items-center ${isCollapsed ? 'justify-center px-0' : 'px-3'} mb-1 pt-3 shrink-0`}>
        <div className={`flex items-center gap-2.5 cursor-pointer group ${isCollapsed ? 'justify-center' : 'w-full'} hover:bg-gray-200/50 rounded-md p-1 transition-colors`}>
          <div className="w-6 h-6 relative overflow-hidden flex-shrink-0 rounded-sm">
             <img 
                src={companyLogo || LOGO_URL} 
                alt="Logo" 
                className={`object-contain w-full h-full transition-opacity duration-300 ${companyLogo ? '' : 'grayscale opacity-70 group-hover:opacity-100'}`}
             />
          </div>
          {!isCollapsed && (
            <span className="font-medium text-sm text-[#37352F] tracking-tight opacity-90 group-hover:opacity-100 transition-opacity truncate animate-in fade-in duration-200">
                Nizamia
            </span>
          )}
        </div>
      </div>

      {/* Navigation Items */}
      <div className="flex-1 py-2 px-2 space-y-0.5 overflow-y-auto hide-scrollbar">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            title={isCollapsed ? item.label : undefined}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-2.5 px-2'} py-1.5 rounded-md text-sm transition-colors duration-200 group relative
              ${activeTab === item.id 
                ? 'bg-[#EFEFED] text-[#37352F] font-medium' 
                : 'text-[#5F5E5B] hover:bg-[#EFEFED] hover:text-[#37352F]'
              }`}
          >
            <item.icon 
              size={18} 
              strokeWidth={2}
              className={`flex-shrink-0 ${activeTab === item.id ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'}`} 
            />
            {!isCollapsed && <span className="truncate leading-none pb-0.5">{item.label}</span>}
            
            {/* Tooltip for Collapsed State */}
            {isCollapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 animate-in fade-in slide-in-from-left-1 duration-200">
                    {item.label}
                </div>
            )}
          </button>
        ))}
      </div>

      {/* TOOLS POPUP MENU (Grid Style) */}
      {isToolsOpen && (
          <div 
            ref={toolsMenuRef}
            className={`absolute bottom-14 ${isCollapsed ? 'left-14' : 'left-2'} w-60 bg-white border border-gray-200 rounded-lg shadow-xl z-50 animate-in slide-in-from-bottom-2 fade-in duration-200 overflow-hidden`}
          >
             <div className="bg-gray-50 px-4 py-2 border-b border-gray-100 flex justify-between items-center">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Production Tools</span>
                <ChevronUp size={12} className="text-gray-400" />
             </div>
             
             {/* Calculators Grid */}
             <div className="p-2 grid grid-cols-2 gap-1">
                {PRODUCTION_TOOLS.map(tool => (
                   <button
                      key={tool.id}
                      onClick={() => { onOpenTool(tool.id); setIsToolsOpen(false); }}
                      className="flex flex-col items-center justify-center p-2 rounded-md hover:bg-gray-50 transition-colors text-center group"
                   >
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center mb-1 ${tool.bg} ${tool.color}`}>
                         <tool.icon size={14} />
                      </div>
                      <span className="text-[10px] text-gray-600 group-hover:text-gray-900 font-medium leading-tight">{tool.title}</span>
                   </button>
                ))}
             </div>
          </div>
      )}

      {/* Bottom Shortcuts Bar */}
      <div className="border-t border-[#E0E0E0] bg-[#F7F7F5] p-2 relative z-40">
        <div className={`flex items-center ${isCollapsed ? 'flex-col gap-3' : 'justify-between gap-1'}`}>
           {/* Tools Trigger */}
           <button 
             onClick={() => setIsToolsOpen(!isToolsOpen)}
             className={`p-1.5 rounded-md transition-all relative ${isToolsOpen ? 'bg-[#EFEFED] text-blue-600' : 'text-[#5F5E5B] hover:text-[#37352F] hover:bg-[#EFEFED]'}`}
             title="Tools Menu"
           >
             <Wrench size={18} />
           </button>

           {/* Events Shortcut */}
           <button 
             onClick={onOpenEvents}
             className="p-1.5 text-[#5F5E5B] hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all"
             title="Events & Schedule"
           >
             <CalendarRange size={18} />
           </button>

           {/* Tasks (Placeholder) */}
           <button 
             className="p-1.5 text-[#5F5E5B] hover:text-[#37352F] hover:bg-[#EFEFED] rounded-md transition-all"
             title="Tasks (Coming Soon)"
           >
             <CheckSquare size={18} />
           </button>

           {/* User / Logout */}
           <button 
             onClick={handleUserClick}
             className="p-1.5 text-[#5F5E5B] hover:text-red-600 hover:bg-red-50 rounded-md transition-all group relative"
             title="User Profile / Log Out"
           >
             <User size={18} className="group-hover:hidden" />
             <LogOut size={18} className="hidden group-hover:block" />
           </button>
        </div>
      </div>
    </div>
  );
};
