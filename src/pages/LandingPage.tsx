import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

// ─── BILINGUAL CONTENT ───────────────────────────────────────────────────────
const T = {
  id: {
    nav: {
      features: 'Fitur', howItWorks: 'Cara Kerja', pricing: 'Harga',
      faq: 'FAQ', tryFree: 'Coba Gratis',
    },
    hero: {
      badge: 'Powered by AI · Baru Dirilis',
      title1: 'Ubah Materi Jadi',
      title2: 'Presentasi Interaktif',
      title3: 'dalam Hitungan Detik',
      sub: 'WebSlide menggunakan AI untuk mengubah topik atau file PDF menjadi slide interaktif berkualitas profesional – siap presentasi, tanpa perlu desainer.',
      cta1: 'Coba Gratis Sekarang →',
      cta2: 'Lihat Demo',
      stat1: 'Format Export', stat2: 'Waktu Generate', stat3: 'Tanpa Desainer',
      statv1: '3×', statv2: '< 60 dtk', statv3: '100%',
    },
    features: {
      badge: 'Fitur Lengkap',
      title: 'Semua yang Anda Butuhkan',
      sub: 'Dari input hingga presentasi, WebSlide menangani semuanya dengan kecerdasan buatan.',
      items: [
        { icon: '🤖', title: 'AI Generation', desc: 'Ketik topik atau upload PDF – AI generate outline dan konten slide lengkap secara otomatis.' },
        { icon: '✏️', title: 'Live Editor', desc: 'Edit judul, poin, dan konten langsung di panel editor tanpa perlu reload.' },
        { icon: '✨', title: 'AI Illustrations', desc: 'Ilustrasi kustom dihasilkan AI untuk setiap slide, membuat presentasi lebih visual.' },
        { icon: '📥', title: 'Multi-format Export', desc: 'Download sebagai HTML interaktif, PDF landscape, atau PowerPoint (.pptx).' },
        { icon: '🎤', title: 'Mode Presentasi', desc: 'Fullscreen mode dengan navigasi keyboard – langsung presentasi tanpa software tambahan.' },
        { icon: '📚', title: 'Riwayat & Re-edit', desc: 'Semua WebSlide tersimpan di riwayat. Buka kembali, edit ulang, export kapan saja.' },
      ],
    },
    howItWorks: {
      badge: 'Cara Kerja',
      title: 'Tiga Langkah, Presentasi Siap',
      steps: [
        { num: '01', title: 'Input Topik atau Upload PDF', desc: 'Ketik topik apa saja atau upload file PDF materi Anda. WebSlide mendukung Quick Mode (teks) dan Advanced Mode (PDF).' },
        { num: '02', title: 'AI Generate Slide', desc: 'AI memproses input Anda, membuat outline, mengisi konten setiap slide, dan jika diaktifkan, menambahkan ilustrasi visual otomatis.' },
        { num: '03', title: 'Preview, Edit & Export', desc: 'Lihat hasil di preview interaktif, edit konten langsung, lalu download dalam format yang Anda butuhkan.' },
      ],
    },
    pricing: {
      badge: 'Harga',
      title: 'Mulai Gratis, Upgrade Kapan Saja',
      sub: 'Tidak ada kartu kredit untuk mulai. Upgrade ke Pro kapan pun Anda siap.',
      free: {
        name: 'Free', price: 'Gratis', period: 'selamanya',
        desc: 'Sempurna untuk mencoba WebSlide',
        cta: 'Mulai Gratis',
        features: ['2 WebSlide per hari', 'Export HTML', 'Mode Presentasi', 'Riwayat 7 hari', 'Quick Mode (teks)'],
        notIncluded: ['AI Illustrations', 'Export PDF & PPTX', 'Advanced Mode (PDF Upload)', 'Priority support'],
      },
      pro: {
        name: 'Pro', price: 'Rp 199.000', period: '/bulan',
        desc: 'Untuk profesional dan pendidik aktif',
        cta: 'Upgrade ke Pro',
        badge: 'Paling Populer',
        features: [
          'Unlimited WebSlide per hari',
          'AI Illustrations (Imagen)',
          'Export PDF landscape',
          'Export PowerPoint (.pptx)',
          'Advanced Mode (PDF Upload)',
          'Riwayat tak terbatas',
          'Priority support',
          'Kode kupon diskon tersedia',
        ],
      },
    },
    faq: {
      badge: 'FAQ',
      title: 'Pertanyaan yang Sering Ditanyakan',
      items: [
        { q: 'Apakah perlu akun untuk mencoba?', a: 'Bisa langsung coba tanpa daftar. Untuk menyimpan riwayat dan akses fitur lengkap, daftar akun gratis diperlukan.' },
        { q: 'Format file apa yang bisa diupload?', a: 'Saat ini kami mendukung file PDF. Untuk Quick Mode, cukup ketik topik atau outline dalam bentuk teks.' },
        { q: 'Apakah data saya aman?', a: 'Konten presentasi Anda tidak disimpan di server kami secara permanen. Proses AI dilakukan secara real-time dan hasilnya dikembalikan langsung ke browser Anda.' },
        { q: 'Bagaimana cara membayar Pro?', a: 'Kami menerima transfer bank, QRIS, GoPay, OVO, dan berbagai metode pembayaran lokal Indonesia melalui Mayar.id.' },
        { q: 'Apakah ada diskon untuk institusi atau grup?', a: 'Ya, kami menyediakan kode kupon khusus untuk institusi pendidikan dan pembelian grup. Hubungi kami untuk informasi lebih lanjut.' },
        { q: 'Bisa cancel kapan saja?', a: 'Ya, tidak ada kontrak. Anda bisa cancel langganan kapan saja dan tetap bisa menggunakan fitur Pro hingga akhir periode billing.' },
      ],
    },
    footer: {
      tagline: 'Presentasi yang lebih baik, dibuat lebih cepat.',
      links: ['Fitur', 'Harga', 'FAQ', 'Hubungi Kami'],
      copyright: '© 2026 WebSlide. Hak cipta dilindungi.',
      madeWith: 'Dibuat dengan ❤️ di Indonesia',
    },
  },
  en: {
    nav: {
      features: 'Features', howItWorks: 'How it Works', pricing: 'Pricing',
      faq: 'FAQ', tryFree: 'Try Free',
    },
    hero: {
      badge: 'Powered by AI · Just Launched',
      title1: 'Turn Any Material Into',
      title2: 'Interactive Slides',
      title3: 'in Seconds',
      sub: 'WebSlide uses AI to transform any topic or PDF into professional interactive slides – presentation-ready, no designer needed.',
      cta1: 'Start for Free →',
      cta2: 'See Demo',
      stat1: 'Export Formats', stat2: 'Generate Time', stat3: 'No Designer',
      statv1: '3×', statv2: '< 60 sec', statv3: '100%',
    },
    features: {
      badge: 'Full Features',
      title: 'Everything You Need',
      sub: 'From input to presentation, WebSlide handles everything with artificial intelligence.',
      items: [
        { icon: '🤖', title: 'AI Generation', desc: 'Type a topic or upload a PDF – AI automatically generates a complete outline and slide content.' },
        { icon: '✏️', title: 'Live Editor', desc: 'Edit titles, bullet points, and content directly in the editor panel without reloading.' },
        { icon: '✨', title: 'AI Illustrations', desc: 'AI-generated custom illustrations for each slide, making your presentation more visual.' },
        { icon: '📥', title: 'Multi-format Export', desc: 'Download as interactive HTML, landscape PDF, or PowerPoint (.pptx).' },
        { icon: '🎤', title: 'Presentation Mode', desc: 'Fullscreen mode with keyboard navigation – present directly without extra software.' },
        { icon: '📚', title: 'History & Re-edit', desc: 'All WebSlides saved in history. Reopen, re-edit, and export anytime.' },
      ],
    },
    howItWorks: {
      badge: 'How It Works',
      title: 'Three Steps to Ready Slides',
      steps: [
        { num: '01', title: 'Input Topic or Upload PDF', desc: 'Type any topic or upload your PDF material. WebSlide supports Quick Mode (text) and Advanced Mode (PDF).' },
        { num: '02', title: 'AI Generates Slides', desc: 'AI processes your input, creates an outline, fills each slide with content, and optionally adds AI-generated visual illustrations.' },
        { num: '03', title: 'Preview, Edit & Export', desc: 'View the result in the interactive preview, edit content directly, then download in your preferred format.' },
      ],
    },
    pricing: {
      badge: 'Pricing',
      title: 'Start Free, Upgrade Anytime',
      sub: 'No credit card required to start. Upgrade to Pro whenever you\'re ready.',
      free: {
        name: 'Free', price: 'Free', period: 'forever',
        desc: 'Perfect for trying WebSlide',
        cta: 'Start Free',
        features: ['2 WebSlides per day', 'HTML Export', 'Presentation Mode', '7-day History', 'Quick Mode (text)'],
        notIncluded: ['AI Illustrations', 'PDF & PPTX Export', 'Advanced Mode (PDF Upload)', 'Priority support'],
      },
      pro: {
        name: 'Pro', price: 'Rp 199.000', period: '/month',
        desc: 'For active professionals and educators',
        cta: 'Upgrade to Pro',
        badge: 'Most Popular',
        features: [
          'Unlimited WebSlides per day',
          'AI Illustrations (Imagen)',
          'PDF landscape export',
          'PowerPoint (.pptx) export',
          'Advanced Mode (PDF Upload)',
          'Unlimited history',
          'Priority support',
          'Discount coupon codes available',
        ],
      },
    },
    faq: {
      badge: 'FAQ',
      title: 'Frequently Asked Questions',
      items: [
        { q: 'Do I need an account to try?', a: 'You can try immediately without signing up. An account is needed to save history and access all features.' },
        { q: 'What file formats can I upload?', a: 'We currently support PDF files. For Quick Mode, simply type your topic or outline as text.' },
        { q: 'Is my data safe?', a: 'Your presentation content is not permanently stored on our servers. AI processing is done in real-time and results are returned directly to your browser.' },
        { q: 'How do I pay for Pro?', a: 'We accept bank transfers, QRIS, GoPay, OVO, and various local Indonesian payment methods through Mayar.id.' },
        { q: 'Are there discounts for institutions?', a: 'Yes, we provide special coupon codes for educational institutions and group purchases. Contact us for more information.' },
        { q: 'Can I cancel anytime?', a: 'Yes, no contracts. You can cancel your subscription anytime and keep Pro features until the end of your billing period.' },
      ],
    },
    footer: {
      tagline: 'Better presentations, made faster.',
      links: ['Features', 'Pricing', 'FAQ', 'Contact Us'],
      copyright: '© 2026 WebSlide. All rights reserved.',
      madeWith: 'Made with ❤️ in Indonesia',
    },
  },
} as const;

type Lang = 'id' | 'en';

// ─── ANIMATED COUNTER ─────────────────────────────────────────────────────────
function useInView(ref: React.RefObject<Element>) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return inView;
}

// ─── COMPONENTS ───────────────────────────────────────────────────────────────

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-6">
      {children}
    </span>
  );
}

function CheckIcon() {
  return (
    <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="w-4 h-4 text-slate-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

// ─── APP MOCKUP SVG ───────────────────────────────────────────────────────────
function AppMockup() {
  return (
    <div className="relative w-full max-w-2xl mx-auto">
      {/* Glow */}
      <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full scale-75" />
      {/* Browser frame */}
      <div className="relative bg-slate-900 rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center gap-2 px-4 py-3 bg-slate-800/80 border-b border-white/5">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/60" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/60" />
          </div>
          <div className="flex-1 mx-3 bg-slate-700/60 rounded-lg px-3 py-1 text-[10px] text-slate-400 font-mono">
            getwebslide.com/app
          </div>
        </div>
        {/* App Content */}
        <div className="p-5 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img 
                src="https://i.ibb.co.com/zVt528k3/Logo-Web-Slide-Fix-Mayar.png" 
                alt="WebSlide Logo" 
                className="h-6 w-auto object-contain" 
              />
            </div>
            <div className="flex items-center gap-2">
              <div className="bg-emerald-500/20 text-emerald-400 text-[9px] font-black px-2 py-1 rounded-full border border-emerald-500/20">AI CONNECTED</div>
            </div>
          </div>
          {/* Input area */}
          <div className="bg-white/5 rounded-xl border border-white/10 p-3">
            <div className="text-slate-300 text-xs font-medium mb-2 opacity-60">Ketik topik presentasi Anda...</div>
            <div className="flex items-center justify-between">
              <span className="text-indigo-400 text-xs font-bold">Pengantar Cloud Computing</span>
              <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
            </div>
          </div>
          {/* Slide preview strip */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { bg: 'bg-indigo-900', text: 'Slide 1: Intro' },
              { bg: 'bg-violet-900', text: 'Slide 2: Materi' },
              { bg: 'bg-slate-800', text: 'Slide 3: Contoh' },
            ].map((s, i) => (
              <div key={i} className={`${s.bg} rounded-lg p-2 border border-white/10 aspect-video flex items-end`}>
                <span className="text-[8px] text-white/50 font-medium">{s.text}</span>
              </div>
            ))}
          </div>
          {/* Action bar */}
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-indigo-600 rounded-xl py-2 text-center text-xs text-white font-bold">⚡ Generate WebSlide</div>
            <div className="bg-white/5 rounded-xl py-2 px-3 text-xs text-slate-400 border border-white/10">PDF</div>
            <div className="bg-white/5 rounded-xl py-2 px-3 text-xs text-slate-400 border border-white/10">PPTX</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN LANDING PAGE ────────────────────────────────────────────────────────
export default function LandingPage() {
  const [lang, setLang] = useState<Lang>('id');
  const [scrolled, setScrolled] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const navigate = useNavigate();
  const t = T[lang];

  useEffect(() => {
    // Auto-redirect if already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/app');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        navigate('/app');
      }
    });

    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      subscription.unsubscribe();
    };
  }, [navigate]);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-outfit antialiased">

      {/* ── NAVBAR ── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-slate-950/90 backdrop-blur-lg border-b border-white/5 shadow-xl shadow-black/20' : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <img 
              src="https://i.ibb.co.com/zVt528k3/Logo-Web-Slide-Fix-Mayar.png" 
              alt="WebSlide Logo" 
              className="h-8 w-auto object-contain" 
            />
          </div>

          {/* Nav links (desktop) */}
          <div className="hidden md:flex items-center gap-8">
            {(['features', 'howItWorks', 'pricing', 'faq'] as const).map((k) => (
              <button
                key={k}
                onClick={() => scrollTo(k)}
                className="text-sm text-slate-400 hover:text-white transition-colors font-medium"
              >
                {t.nav[k]}
              </button>
            ))}
          </div>

          {/* Right: lang + CTA */}
          <div className="flex items-center gap-3">
            {/* Language toggle */}
            <button
              onClick={() => setLang(l => l === 'id' ? 'en' : 'id')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-300 transition-all"
            >
              🌐 {lang === 'id' ? 'EN' : 'ID'}
            </button>
            <button
              onClick={() => navigate('/app')}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:-translate-y-0.5 active:translate-y-0"
            >
              {t.nav.tryFree}
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center pt-16 px-6 overflow-hidden">
        {/* Background gradient blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-violet-600/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute bottom-1/4 left-1/2 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl" />
          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-[0.02]" style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }} />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-bold uppercase tracking-widest mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            {t.hero.badge}
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[1.05] mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700" style={{ animationDelay: '100ms' }}>
            <span className="text-white">{t.hero.title1}</span>
            <br />
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
              {t.hero.title2}
            </span>
            <br />
            <span className="text-white">{t.hero.title3}</span>
          </h1>

          {/* Sub */}
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700" style={{ animationDelay: '200ms' }}>
            {t.hero.sub}
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-in fade-in slide-in-from-bottom-4 duration-700" style={{ animationDelay: '300ms' }}>
            <button
              onClick={() => navigate('/app')}
              className="group px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-base font-black shadow-xl shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all hover:-translate-y-1 active:translate-y-0"
            >
              {t.hero.cta1}
            </button>
            <button
              onClick={() => scrollTo('howItWorks')}
              className="px-8 py-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white text-base font-bold transition-all"
            >
              {t.hero.cta2} ↓
            </button>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-center gap-8 md:gap-16 animate-in fade-in duration-700" style={{ animationDelay: '400ms' }}>
            {[
              { label: t.hero.stat1, value: t.hero.statv1 },
              { label: t.hero.stat2, value: t.hero.statv2 },
              { label: t.hero.stat3, value: t.hero.statv3 },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <div className="text-3xl md:text-4xl font-black text-white mb-1">{s.value}</div>
                <div className="text-xs text-slate-500 font-medium uppercase tracking-widest">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* App Mockup */}
        <div className="relative z-10 w-full max-w-3xl mx-auto mt-16 px-6 animate-in fade-in slide-in-from-bottom-8 duration-1000" style={{ animationDelay: '500ms' }}>
          <AppMockup />
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce">
          <div className="w-px h-8 bg-gradient-to-b from-transparent to-white/20" />
          <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-32 px-6 bg-slate-950">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <Badge>✦ {t.features.badge}</Badge>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4">{t.features.title}</h2>
            <p className="text-slate-400 text-lg max-w-xl mx-auto">{t.features.sub}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {t.features.items.map((f, i) => (
              <div
                key={i}
                className="group relative bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-indigo-500/30 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1"
              >
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500/5 to-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="text-3xl mb-4">{f.icon}</div>
                  <h3 className="text-white font-black text-lg mb-2">{f.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="howItWorks" className="py-32 px-6 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <Badge>→ {t.howItWorks.badge}</Badge>
            <h2 className="text-4xl md:text-5xl font-black text-white">{t.howItWorks.title}</h2>
          </div>

          <div className="space-y-6">
            {t.howItWorks.steps.map((step, i) => (
              <div
                key={i}
                className="group flex gap-6 items-start bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.06] hover:border-indigo-500/20 rounded-2xl p-6 md:p-8 transition-all"
              >
                <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600/80 to-violet-600/80 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform">
                  {step.num}
                </div>
                <div>
                  <h3 className="text-white font-black text-xl mb-2">{step.title}</h3>
                  <p className="text-slate-400 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <button
              onClick={() => navigate('/app')}
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-black text-base shadow-xl shadow-indigo-500/20 transition-all hover:-translate-y-1"
            >
              {t.nav.tryFree} →
            </button>
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="py-32 px-6 bg-slate-950">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <Badge>💎 {t.pricing.badge}</Badge>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4">{t.pricing.title}</h2>
            <p className="text-slate-400 text-lg">{t.pricing.sub}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Free */}
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-3xl p-8 flex flex-col">
              <div className="mb-6">
                <div className="text-slate-400 text-sm font-black uppercase tracking-widest mb-2">{t.pricing.free.name}</div>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-4xl font-black text-white">{t.pricing.free.price}</span>
                </div>
                <div className="text-slate-500 text-sm">{t.pricing.free.period}</div>
                <p className="text-slate-400 text-sm mt-3">{t.pricing.free.desc}</p>
              </div>

              <div className="space-y-3 mb-8 flex-1">
                {t.pricing.free.features.map((f, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm text-slate-300">
                    <CheckIcon /> {f}
                  </div>
                ))}
                {t.pricing.free.notIncluded.map((f, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm text-slate-600">
                    <XIcon /> {f}
                  </div>
                ))}
              </div>

              <button
                onClick={() => navigate('/app')}
                className="w-full py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold transition-all"
              >
                {t.pricing.free.cta}
              </button>
            </div>

            {/* Pro */}
            <div className="relative bg-gradient-to-b from-indigo-600/20 to-violet-600/10 border border-indigo-500/40 rounded-3xl p-8 flex flex-col overflow-hidden">
              {/* Glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-violet-500/5 pointer-events-none" />
              {/* Badge */}
              <div className="absolute top-6 right-6 px-3 py-1 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-[10px] font-black uppercase tracking-widest">
                {t.pricing.pro.badge}
              </div>

              <div className="relative mb-6">
                <div className="text-indigo-300 text-sm font-black uppercase tracking-widest mb-2">{t.pricing.pro.name}</div>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-4xl font-black text-white">{t.pricing.pro.price}</span>
                </div>
                <div className="text-indigo-300/60 text-sm">{t.pricing.pro.period}</div>
                <p className="text-slate-300 text-sm mt-3">{t.pricing.pro.desc}</p>
              </div>

              <div className="relative space-y-3 mb-8 flex-1">
                {t.pricing.pro.features.map((f, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm text-slate-200">
                    <CheckIcon /> {f}
                  </div>
                ))}
              </div>

              <button
                onClick={() => navigate('/app')}
                className="relative w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-black transition-all shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:-translate-y-0.5"
              >
                {t.pricing.pro.cta}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-32 px-6 bg-gradient-to-b from-slate-950 to-slate-900">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-16">
            <Badge>? {t.faq.badge}</Badge>
            <h2 className="text-4xl font-black text-white">{t.faq.title}</h2>
          </div>

          <div className="space-y-3">
            {t.faq.items.map((item, i) => (
              <div
                key={i}
                className="bg-white/[0.03] border border-white/[0.06] rounded-2xl overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-white/[0.03] transition-colors"
                >
                  <span className="text-white font-bold text-sm pr-4">{item.q}</span>
                  <span className={`text-slate-400 text-lg flex-shrink-0 transition-transform duration-300 ${openFaq === i ? 'rotate-45' : ''}`}>
                    +
                  </span>
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-5">
                    <p className="text-slate-400 text-sm leading-relaxed">{item.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-32 px-6 bg-slate-900">
        <div className="max-w-3xl mx-auto text-center">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-violet-500/20 rounded-3xl blur-2xl" />
            <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 rounded-3xl p-12 md:p-16">
              <div className="text-5xl mb-6">🚀</div>
              <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
                {lang === 'id' ? 'Mulai Buat WebSlide Pertama Anda' : 'Create Your First WebSlide Today'}
              </h2>
              <p className="text-slate-400 mb-8 text-lg">
                {lang === 'id'
                  ? 'Gratis. Tanpa kartu kredit. Siap dalam 60 detik.'
                  : 'Free. No credit card. Ready in 60 seconds.'}
              </p>
              <button
                onClick={() => navigate('/app')}
                className="px-10 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-black text-lg shadow-2xl shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all hover:-translate-y-1"
              >
                {lang === 'id' ? 'Mulai Gratis →' : 'Get Started Free →'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-12 px-6 bg-slate-950 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-8">
            {/* Logo */}
            <div className="flex items-center gap-2.5">
              <img 
                src="https://i.ibb.co.com/zVt528k3/Logo-Web-Slide-Fix-Mayar.png" 
                alt="WebSlide Logo" 
                className="h-8 w-auto object-contain" 
              />
              <div className="text-[10px] text-slate-500 ml-2">{t.footer.tagline}</div>
            </div>

            {/* Links */}
            <div className="flex items-center gap-6">
              {(['features', 'pricing', 'faq'] as const).map((k) => (
                <button
                  key={k}
                  onClick={() => scrollTo(k)}
                  className="text-sm text-slate-500 hover:text-white transition-colors"
                >
                  {t.nav[k]}
                </button>
              ))}
              <a href="mailto:hello@getwebslide.com" className="text-sm text-slate-500 hover:text-white transition-colors">
                {lang === 'id' ? 'Kontak' : 'Contact'}
              </a>
            </div>

            {/* Lang toggle */}
            <button
              onClick={() => setLang(l => l === 'id' ? 'en' : 'id')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-400 transition-all"
            >
              🌐 {lang === 'id' ? 'Switch to English' : 'Ganti ke Bahasa Indonesia'}
            </button>
          </div>

          <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-2">
            <p className="text-xs text-slate-600">{t.footer.copyright}</p>
            <p className="text-xs text-slate-600">{t.footer.madeWith}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
