import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { LogOut, User, Crown, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface UserMenuProps {
  user: any;
  profile: any;
}

export default function UserMenu({ user, profile }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setIsOpen(false);
    await supabase.auth.signOut();
    navigate('/');
  };

  const isPro = profile?.role === 'pro';

  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-white hover:bg-slate-50 p-1 pr-3 rounded-2xl border border-slate-100 shadow-sm transition-all"
      >
        <div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-100 bg-slate-100">
          {user?.user_metadata?.avatar_url ? (
            <img src={user.user_metadata.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400">
              <User size={20} />
            </div>
          )}
        </div>
        <div className="hidden sm:block text-left">
          <div className="text-xs font-black text-slate-900 truncate max-w-[120px]">
            {user?.user_metadata?.full_name || 'User'}
          </div>
          <div className="flex items-center gap-1">
            <span className={`text-[9px] font-black uppercase tracking-wider ${isPro ? 'text-indigo-600' : 'text-slate-400'}`}>
              {isPro ? 'Pro Member' : 'Free Tier'}
            </span>
            {isPro && <Crown size={8} className="text-indigo-500" fill="currentColor" />}
          </div>
        </div>
        <ChevronDown size={14} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-64 bg-white rounded-3xl shadow-2xl border border-slate-100 p-2 z-[110] animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-4 border-b border-slate-50 mb-1">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Logged in as</div>
            <div className="text-sm font-bold text-slate-900 truncate">{user?.email}</div>
          </div>
          
          <button 
            disabled
            className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 cursor-not-allowed text-sm font-bold rounded-2xl"
          >
            <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center">
              <User size={16} />
            </div>
            Settings (Coming Soon)
          </button>

          {!isPro && (
            <button 
              className="w-full flex items-center gap-3 px-4 py-3 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-sm font-black rounded-2xl transition-colors mt-1"
            >
              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm">
                <Crown size={16} />
              </div>
              Upgrade to Pro
            </button>
          )}

          <div className="h-px bg-slate-50 my-1 mx-2" />

          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 hover:text-red-600 text-sm font-bold rounded-2xl transition-all"
          >
            <div className="w-8 h-8 rounded-lg bg-red-100/50 flex items-center justify-center">
              <LogOut size={16} />
            </div>
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
