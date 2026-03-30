import React from 'react';
import { supabase } from '../lib/supabase';
import { LogIn, Sparkles, ShieldCheck, Zap } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
}

export default function AuthModal({ isOpen }: AuthModalProps) {
  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/app`,
      },
    });
    if (error) console.error('Error logging in:', error.message);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-0">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" />
      
      <div className="relative w-full max-w-md bg-white rounded-[40px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-indigo-500 to-violet-500" />
        
        <div className="p-8 sm:p-12">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-indigo-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-indigo-600 shadow-sm border border-indigo-100">
              <Sparkles size={32} />
            </div>
            <h2 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">Selamat Datang!</h2>
            <p className="text-slate-500 text-sm leading-relaxed max-w-[280px] mx-auto">
              Login untuk mulai membuat presentasi AI berkualitas profesional dalam hitungan detik.
            </p>
          </div>

          {/* Features highlight */}
          <div className="space-y-4 mb-10">
            <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-indigo-500 shadow-sm">
                <Zap size={20} />
              </div>
              <div>
                <div className="text-sm font-bold text-slate-800">Cepat & Otomatis</div>
                <div className="text-xs text-slate-500">Cukup ketik topik atau upload PDF</div>
              </div>
            </div>
            <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-emerald-500 shadow-sm">
                <ShieldCheck size={20} />
              </div>
              <div>
                <div className="text-sm font-bold text-slate-800">Aman & Terpercaya</div>
                <div className="text-xs text-slate-500">Data Anda terlindungi sepenuhnya</div>
              </div>
            </div>
          </div>

          {/* Action */}
          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 bg-slate-900 hover:bg-slate-800 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-slate-900/10 hover:shadow-slate-900/20 active:scale-[0.98]"
          >
            <LogIn size={20} />
            Lanjutkan dengan Google
          </button>
          
          <p className="text-center mt-8 text-[10px] text-slate-400 font-medium uppercase tracking-widest">
            WebSlide AI • v1.0 • Pro Ready
          </p>
        </div>
      </div>
    </div>
  );
}
