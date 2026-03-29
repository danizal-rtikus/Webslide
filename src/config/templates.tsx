import React from 'react';
import { Palette, LucideIcon, Layout, Moon, Sparkles, Zap } from 'lucide-react';

export interface WebSlideTemplate {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  colors: string[]; // hex codes for preview
  styles: {
    container: string;
    card: string;
    heading: string;
    text: string;
    accent: string;
  };
}

export const TEMPLATES: WebSlideTemplate[] = [
  {
    id: 'modern-indigo',
    name: 'Modern Indigo',
    description: 'Bersih, profesional, dominan putih & indigo.',
    icon: Layout,
    colors: ['#4f46e5', '#f8fafc', '#1e293b'],
    styles: {
      container: 'bg-slate-50',
      card: 'bg-white border-slate-100 shadow-sm',
      heading: 'text-slate-900',
      text: 'text-slate-600',
      accent: 'indigo'
    }
  },
  {
    id: 'dark-emerald',
    name: 'Dark Emerald',
    description: 'Malam yang mewah dengan aksen hijau emerald.',
    icon: Moon,
    colors: ['#10b981', '#064e3b', '#020617'],
    styles: {
      container: 'bg-[#020617]',
      card: 'bg-[#0f172a] border-emerald-900/30 shadow-[0_0_20px_rgba(16,185,129,0.1)]',
      heading: 'text-white',
      text: 'text-emerald-100/70',
      accent: 'emerald'
    }
  },
  {
    id: 'glass-violet',
    name: 'Glass Violet',
    description: 'Efek kaca modern dengan gradasi violet pink.',
    icon: Sparkles,
    colors: ['#a855f7', '#ec4899', '#fdf2f8'],
    styles: {
      container: 'bg-fuchsia-50/30',
      card: 'bg-white/70 backdrop-blur-xl border-white shadow-xl',
      heading: 'text-fuchsia-950',
      text: 'text-fuchsia-900/70',
      accent: 'fuchsia'
    }
  },
  {
    id: 'minimalist-slate',
    name: 'Minimalist Slate',
    description: 'Sangat bersih, fokus tinggi pada keterbacaan.',
    icon: Zap,
    colors: ['#475569', '#ffffff', '#000000'],
    styles: {
      container: 'bg-white',
      card: 'bg-white border-slate-200 shadow-none',
      heading: 'text-black',
      text: 'text-slate-500',
      accent: 'slate'
    }
  }
];
