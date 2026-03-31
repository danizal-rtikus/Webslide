import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { LogOut, User, Crown, ChevronDown, CreditCard, Sparkles, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface UserMenuProps {
  user: any;
  profile: any;
}

export default function UserMenu({ user, profile }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

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

  const isAdmin = profile?.role === 'admin';
  const isPro = profile?.role === 'pro' || isAdmin;

  // Actual Mayar Payment Link from User
  // We append ?user_id= so that potentially Mayar can track and send it back to our webhook
  const MAYAR_PAYMENT_URL = `https://levelupskills.myr.id/pl/webslide-5000-kredit?user_id=${user?.id}`; 

  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 p-1 pr-3 rounded-2xl border transition-all ${isDark ? 'bg-slate-900 border-slate-800 hover:bg-slate-800/80 shadow-indigo-950/20 shadow-md' : 'bg-white border-slate-100 hover:bg-slate-50 shadow-sm'}`}
      >
        <div className={`w-10 h-10 rounded-xl overflow-hidden border ${isDark ? 'border-slate-800 bg-slate-800' : 'border-slate-100 bg-slate-100'}`}>
          {user?.user_metadata?.avatar_url ? (
            <img src={user.user_metadata.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400">
              <User size={20} />
            </div>
          )}
        </div>
        <div className="hidden sm:block text-left">
          <div className={`text-xs font-black truncate max-w-[120px] ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {user?.user_metadata?.full_name || 'User'}
          </div>
          <div className="flex items-center gap-1">
            <span className={`text-[9px] font-black uppercase tracking-wider ${isAdmin ? 'text-indigo-400' : isPro ? 'text-amber-500' : 'text-slate-500'}`}>
              {isAdmin ? 'Admin' : isPro ? 'Pro Member' : 'Free Tier'}
            </span>
            {isAdmin && <Shield size={8} className="text-indigo-500" fill="currentColor" />}
            {isPro && !isAdmin && <Crown size={8} className="text-amber-500" fill="currentColor" />}
          </div>
        </div>
        <ChevronDown size={14} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className={`absolute right-0 mt-3 w-64 rounded-3xl shadow-2xl border p-2 z-[110] animate-in fade-in slide-in-from-top-2 duration-200 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
          <div className={`p-4 border-b mb-1 ${isDark ? 'border-slate-800' : 'border-slate-50'}`}>
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Logged in as</div>
            <div className={`text-sm font-bold truncate ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{user?.email}</div>
          </div>
          
          <div className={`px-4 py-3 mb-2 rounded-2xl ${isDark ? 'bg-slate-800/50' : 'bg-indigo-50/30'}`}>
             <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Sisa Kredit</div>
             <div className="flex items-center gap-2">
               <Sparkles size={14} className="text-indigo-500" />
               <span className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{profile?.credits || 0}</span>
             </div>
          </div>

          <a 
            href={MAYAR_PAYMENT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center gap-3 px-4 py-4 bg-indigo-600 text-white hover:bg-indigo-500 text-sm font-black rounded-2xl transition-all shadow-lg shadow-indigo-600/20"
          >
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <CreditCard size={18} />
            </div>
            Top Up Kredit
          </a>

          {!isPro && (
            <a 
              href={MAYAR_PAYMENT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-black rounded-2xl transition-colors mt-2 ${isDark ? 'bg-indigo-900/20 text-indigo-400 hover:bg-indigo-900/40' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'}`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-sm ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
                <Crown size={16} />
              </div>
              Upgrade to Pro
            </a>
          )}

          <div className={`h-px my-2 mx-2 ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`} />

          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-500/10 hover:text-red-600 text-sm font-bold rounded-2xl transition-all"
          >
            <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
              <LogOut size={16} />
            </div>
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
