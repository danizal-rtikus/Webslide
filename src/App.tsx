import React, { useState, useRef, useEffect } from 'react';
import { 
  FileUp, 
  Layout, 
  Settings, 
  History, 
  LogOut, 
  ChevronRight,
  Presentation,
  Play,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Key,
  Check,
  ChevronDown,
  Sparkles,
  ArrowRight,
  BookOpen,
  FileText,
  Rocket,
  Building2,
  UserCircle,
  Calendar,
  Wrench,
  Palette,
  List,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  X,
  Zap,
  Crown,
  Sun,
  Moon,
  Plus,
  Trash2,
  Shield
} from 'lucide-react';
import { extractTextFromPDF } from './utils/pdfProcessor';
import { 
  WebSlideJson, 
  identifyChapters, 
  Chapter,
  generateChapterSlides,
  generateQuizBatch,
  generateSkeletonFromPrompt,
  generateImageImagen4,
  generateVisualDescription
} from './utils/geminiApi';
import { generateWebSlideHtml } from './utils/htmlGenerator';
import { WebSlidePreview } from './components/WebSlidePreview';
import debounce from 'lodash.debounce';
import { CATEGORIES, Category } from './config/categories';
import { TEMPLATES } from './config/templates';
import { getFriendlyError, validatePrompt, validatePdfFile } from './utils/validation';
import { saveToHistory, loadHistory, removeFromHistory, formatRelativeTime, HistoryItem } from './utils/historyManager';
import { TourTooltip, TourStepConfig } from './components/TourTooltip';
import { supabase } from './lib/supabase';
import AuthModal from './components/AuthModal';
import UserMenu from './components/UserMenu';
import AdminDashboard from './components/AdminDashboard';
import { databaseService, CloudWebSlide } from './lib/database.service';

const PROMPT_EXAMPLES = [
  "Misal: Buat WebSlide mendalam tentang sejarah Kopi Luwak di Indonesia...",
  "Misal: Jelaskan konsep Quantum Computing untuk pemula dalam WebSlide...",
  "Misal: Susun strategi pemasaran digital untuk startup kopi kekinian...",
  "Misal: Ringkas materi tentang Perang Dunia II menjadi WebSlide interaktif...",
  "Misal: Buat panduan instalasi sistem operasi Linux Ubuntu Server...",
  "Misal: Analisis dampak perubahan iklim terhadap ekonomi pertanian..."
];

// Helper Components
function SidebarItem({ icon, label, active = false, onClick, isDark }: { icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void, isDark: boolean }) {
  return (
    <button 
      onClick={onClick}
      className={`
        w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 group
        ${active 
          ? (isDark ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-100') 
          : (isDark ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900')}
      `}
    >
      <div className={`${active ? 'text-white' : (isDark ? 'text-slate-500 group-hover:text-indigo-400' : 'text-slate-400 group-hover:text-indigo-600')} transition-colors`}>
        {icon}
      </div>
      {label && <span className="text-sm font-bold tracking-tight">{label}</span>}
    </button>
  );
}

function StepperItem({ num, label, active, done, isDark }: { num: number, label: string, active: boolean, done: boolean, isDark: boolean }) {
  return (
    <div className={`flex items-center gap-3 transition-all duration-500 ${active ? 'scale-110' : 'opacity-60'}`}>
      <div className={`
        w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black transition-all duration-500
        ${done ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : active ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/30' : (isDark ? 'bg-slate-800 text-slate-500 shadow-inner' : 'bg-slate-100 text-slate-400')}
      `}>
        {done ? <Check size={16} /> : num}
      </div>
      <span className={`text-[11px] font-black uppercase tracking-widest ${active ? (isDark ? 'text-white' : 'text-slate-900') : 'text-slate-400'}`}>{label}</span>
    </div>
  );
}

function CategoryDropdown({ value, onChange, isDark }: { value: string, onChange: (v: string) => void, isDark: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const selected = CATEGORIES.find(c => c.id === value) || CATEGORIES[0];

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-3 ${isDark ? 'bg-slate-800 border-slate-700 hover:bg-slate-750' : 'bg-white border-slate-100 hover:bg-slate-50'} border px-5 py-3 rounded-2xl shadow-sm transition-all min-w-[180px] h-full`}
      >
        <span className="text-xl">
          {typeof selected.icon === 'function' ? selected.icon({ size: 20 }) : selected.icon}
        </span>
        <div className="text-left">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kategori</p>
          <p className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{selected.label}</p>
        </div>
        <ChevronDown size={14} className={`ml-auto text-slate-300 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className={`absolute top-full mt-3 w-64 ${isDark ? 'bg-slate-800 border-slate-700 shadow-3xl' : 'bg-white border-slate-100 shadow-2xl'} border rounded-3xl p-2 z-[100] animate-in fade-in slide-in-from-top-2 duration-300`}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => { onChange(cat.id); setIsOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${value === cat.id ? (isDark ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-700') : (isDark ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-50 text-slate-600')}`}
            >
              <span className="text-lg">
                {typeof cat.icon === 'function' ? cat.icon({ size: 18 }) : cat.icon}
              </span>
              <span className="text-xs font-bold">{cat.label}</span>
              {value === cat.id && <CheckCircle2 size={14} className="ml-auto" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ModeCard({ icon, title, desc, active, onClick, id, isDark }: { icon: React.ReactNode, title: string, desc: string, active: boolean, onClick: () => void, id?: string, isDark: boolean }) {
  return (
    <button 
      id={id}
      onClick={onClick}
      className={`
        px-5 py-4 rounded-2xl border-2 transition-all group flex items-center gap-4 flex-1 min-w-[200px]
        ${active 
          ? (isDark ? 'border-indigo-600 bg-indigo-600/20 text-white' : 'border-indigo-600 bg-indigo-50 text-indigo-700') 
          : (isDark ? 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700' : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200')}
      `}
    >
      <div className={`
        w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 shrink-0
        ${active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : (isDark ? 'bg-slate-800 text-slate-500 group-hover:scale-110' : 'bg-slate-50 text-slate-400 group-hover:scale-110')}
      `}>
        {icon}
      </div>
      <div className="text-left flex-1 min-w-0">
        <h4 className={`font-black text-xs truncate ${active ? (isDark ? 'text-white' : 'text-indigo-700') : (isDark ? 'text-slate-200' : 'text-slate-900')}`}>{title}</h4>
        <p className={`text-[10px] font-medium leading-tight mt-0.5 line-clamp-1 ${active ? (isDark ? 'text-indigo-300/80' : 'text-indigo-600/70') : 'text-slate-500'}`}>{desc}</p>
      </div>
      {active && <CheckCircle2 size={16} className={`shrink-0 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />}
    </button>
  );
}

function ToggleItem({ icon, label, enabled, onChange, tooltip, isDark }: { icon: React.ReactNode, label: string, enabled: boolean, onChange: (v: boolean) => void, tooltip?: string, isDark: boolean }) {
  return (
    <div className="flex items-center gap-3 group relative cursor-help">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${enabled ? (isDark ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : 'bg-indigo-50 text-indigo-600 border border-indigo-100') : (isDark ? 'bg-slate-800 text-slate-500 border border-transparent' : 'bg-slate-50 text-slate-400 border border-transparent')}`}>
        {icon}
      </div>
      <div className="flex flex-col">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer">{label}</label>
        <button 
          onClick={() => onChange(!enabled)}
          className={`w-10 h-5 rounded-full relative transition-all duration-300 ${enabled ? 'bg-indigo-600' : (isDark ? 'bg-slate-700' : 'bg-slate-200')}`}
        >
          <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-300 ${enabled ? 'left-6' : 'left-1'}`} />
        </button>
      </div>
      {tooltip && (
        <div className="absolute bottom-full left-0 mb-3 w-48 bg-slate-900 text-white text-[10px] p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
          {tooltip}
        </div>
      )}
    </div>
  );
}

function App() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStatus, setProcessStatus] = useState<'idle' | 'extracting' | 'analyzing' | 'generating' | 'done' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [generatedHtml, setGeneratedHtml] = useState('');
  const [placeholderText, setPlaceholderText] = useState('');
  const [slideData, setSlideData] = useState<WebSlideJson | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('webslide_theme') === 'dark');
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);

  useEffect(() => {
    localStorage.setItem('webslide_theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);
  
  // Modular Workflow States
  const [currentStep, setCurrentStep] = useState<'category' | 'upload' | 'skeleton' | 'generating' | 'done'>('category');
  const [selectedCategory, setSelectedCategory] = useState<string>('Pembelajaran');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('modern-indigo');
  const [includeQuiz, setIncludeQuiz] = useState<boolean>(false);
  const [isImageGenEnabled, setIsImageGenEnabled] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedChapters, setSelectedChapters] = useState<string[]>([]);
  const [extractedText, setExtractedText] = useState('');
  const [currentProgressText, setCurrentProgressText] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [cloudHistory, setCloudHistory] = useState<CloudWebSlide[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history'>('dashboard');
  
  // Input States
  const [inputMode, setInputMode] = useState<'quick' | 'advanced'>('quick');
  const [quickPrompt, setQuickPrompt] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Auth Logic ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (activeSession?: any) => {
    const s = activeSession ?? session;
    if (!s?.user) return;
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', s.user.id)
      .single();
    
    if (data) {
      console.log('[WebSlide] Profile fetched:', data);
      setProfile(data);
    }
    if (error) console.error('[WebSlide] Error fetching profile:', error);
  };

  const fetchCloudHistory = async () => {
    if (!session?.user) return;
    try {
      const history = await databaseService.fetchHistory(session.user.id);
      setCloudHistory(history);
    } catch (err) {
      console.error('Error loading cloud history:', err);
    }
  };

  useEffect(() => {
    if (session?.user) {
      // Pass session explicitly to avoid stale closure bug
      fetchProfile(session);
      fetchCloudHistory();

      // Real-time subscription to profile changes
      const channel = supabase
        .channel(`profile:${session.user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${session.user.id}`
          },
          (payload) => {
            console.log('[WebSlide] Profile changed in real-time:', payload.new);
            setProfile(payload.new);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      setProfile(null);
      setCloudHistory([]);
    }
  }, [session]);

  const refreshDashboard = async () => {
    await fetchProfile(session);
    await fetchCloudHistory();
  };

  // History state
  const [history, setHistory] = useState<HistoryItem[]>(() => loadHistory());
  const refreshHistory = () => setHistory(loadHistory());

  // Onboarding
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem('webslide_onboarded'));
  const [onboardingStep, setOnboardingStep] = useState(0);

  // Tour State
  const [globalTourStep, setGlobalTourStep] = useState(-1);
  const [showTour, setShowTour] = useState(false);
  const DASHBOARD_TOUR_STEPS: TourStepConfig[] = [
    { targetId: 'tour-quick-input', title: 'Mulai 🎯', message: 'Ketik topik apa saja.', position: 'top' },
    { targetId: 'tour-generate-btn', title: 'Generate ⚡', message: 'Klik untuk mulai.', position: 'top' }
  ];

  const dismissOnboarding = () => {
    localStorage.setItem('webslide_onboarded', '1');
    setShowOnboarding(false);
  };

  useEffect(() => {
    const randomIdx = Math.floor(Math.random() * PROMPT_EXAMPLES.length);
    setPlaceholderText(PROMPT_EXAMPLES[randomIdx]);
  }, []);

  const resetFlow = () => {
    setActiveTab('dashboard');
    setCurrentStep('category');
    setProcessStatus('idle');
    setQuickPrompt('');
    setExtractedText('');
    setChapters([]);
    setSelectedChapters([]);
    setSlideData(null);
    setGeneratedHtml('');
    setErrorMessage('');
    setProgressPercent(0);
    setCurrentProgressText('');
  };

  const handleUpdateSlideData = (newData: WebSlideJson, newTemplateId?: string) => {
    setSlideData(newData);
    const tid = newTemplateId || selectedTemplate;
    if (newTemplateId) setSelectedTemplate(tid);
    const newHtml = generateWebSlideHtml(newData, tid);
    setGeneratedHtml(newHtml);
  };

  const handleRegenerateImage = async (slideIndex: number) => {
    if (!slideData) return;
    try {
      const slide = slideData.slides[slideIndex];
      const visualDesc = await generateVisualDescription(slide.title, slide.content[0]);
      const imageUrl = await generateImageImagen4(visualDesc);
      if (imageUrl) {
        const newData = { ...slideData };
        newData.slides[slideIndex].imageUrl = imageUrl;
        handleUpdateSlideData(newData);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setIsProcessing(true);
      setProcessStatus('extracting');
      const { text } = await extractTextFromPDF(file);
      setExtractedText(text);
      setProcessStatus('analyzing');
      const result = await identifyChapters(text, selectedCategory);
      setChapters(result.chapters);
      setSelectedChapters(result.chapters.map((c: any) => c.id));
      setSlideData({ title: result.title, author: result.author, course: result.course, slides: [], quiz: [] });
      setCurrentStep('skeleton');
      setProcessStatus('idle');
      setIsProcessing(false);
    } catch (error: any) {
      setErrorMessage(getFriendlyError(error));
      setProcessStatus('error');
      setIsProcessing(false);
    }
  };

  const handleQuickGenerate = async () => {
    if (!quickPrompt.trim()) return;
    
    // Preliminary check: At least 20 credits needed to start
    const currentCredits = profile?.credits || 0;
    if (profile?.role !== 'pro' && currentCredits < 20) {
      setErrorMessage("Kredit Anda tidak cukup. Minimal 20 kredit diperlukan untuk memulai.");
      setProcessStatus('error');
      return;
    }

    try {
      setIsProcessing(true);
      setProcessStatus('analyzing');
      const result = await generateSkeletonFromPrompt(quickPrompt, selectedCategory);
      setChapters(result.chapters);
      setSelectedChapters(result.chapters.map((c: any) => c.id));
      setSlideData({ title: result.title, author: result.author, course: result.course, slides: [], quiz: [] });
      setCurrentStep('skeleton');
      setProcessStatus('idle');
      setIsProcessing(false);
    } catch (error: any) {
      setErrorMessage(getFriendlyError(error));
      setProcessStatus('error');
      setIsProcessing(false);
    }
  };

  const calculateEstimatedCost = () => {
    const selectedChaptersObjects = chapters.filter(c => selectedChapters.includes(c.id));
    const slideCount = selectedChaptersObjects.reduce((acc, c) => acc + (c.suggestedSlides || 2), 0);
    let total = slideCount * 10; // 10 per slide
    if (isImageGenEnabled) total += (selectedChaptersObjects.length * 100); // 100 per image (one per chapter usually or use different logic)
    if (includeQuiz) total += 50; // Flat quiz fee
    return total;
  };

  const startGeneration = async () => {
    if (selectedChapters.length === 0) return;
    
    const estimatedCost = calculateEstimatedCost();
    const currentCredits = profile?.credits || 0;

    if (profile?.role !== 'pro' && currentCredits < estimatedCost) {
      setErrorMessage(`Kredit Anda tidak cukup. Estimasi butuh ${estimatedCost} kredit.`);
      setProcessStatus('error');
      return;
    }

    try {
      setIsProcessing(true);
      setProcessStatus('generating');
      setCurrentStep('generating');
      const selectedChapterObjects = chapters.filter(c => selectedChapters.includes(c.id));
      let allSlides: any[] = [
        { type: 'cover', title: slideData?.title || 'WebSlide Presentation', content: [slideData?.course || ''] },
        { type: 'outline', title: 'Daftar Isi', content: selectedChapterObjects.map(c => c.title) }
      ];

      let totalSlideCount = 2; // Start with cover and outline
      for (let i = 0; i < selectedChapterObjects.length; i++) {
        const chapter = selectedChapterObjects[i];
        setCurrentProgressText(`Memproses Bab ${i+1}/${selectedChapterObjects.length}... (${totalSlideCount} Slide terangkai)`);
        setProgressPercent(Math.floor(((i+1)/selectedChapterObjects.length)*100));
        const chapterSlides = await generateChapterSlides(chapter, extractedText, selectedCategory);
        allSlides = [...allSlides, ...chapterSlides];
        totalSlideCount = allSlides.length;
      }

      const finalData: WebSlideJson = {
        title: slideData?.title || 'Presentation',
        author: slideData?.author || 'Author',
        course: slideData?.course || 'Module',
        slides: allSlides,
        quiz: []
      };
      
      const html = generateWebSlideHtml(finalData, selectedTemplate);
      setSlideData(finalData);
      setGeneratedHtml(html);
      
      // Post-Generation actions
      try {
        if (session?.user) {
          // Save to Cloud
          await databaseService.saveWebSlide({
            userId: session.user.id,
            title: finalData.title,
            author: finalData.author,
            course: finalData.course,
            data: finalData,
            html: html,
            templateId: selectedTemplate
          });
          
          // Deduct Credits if not PRO
          if (profile?.role !== 'pro') {
            await databaseService.deductCredits(session.user.id, estimatedCost);
          }
          
          await refreshDashboard();
        } else {
          // Fallback to local
          saveToHistory(finalData, html, selectedTemplate);
          refreshHistory();
        }
      } catch (dbError) {
        console.error("Database action failed, but presentation is generated in state:", dbError);
        // We catch this to prevent the UI from being stuck in 'generating' state
        // if only the DB sync fails. User already has the data in current session.
      }

      setProcessStatus('done');
      setCurrentStep('done');
      setIsProcessing(false);
    } catch (error: any) {
      setErrorMessage(getFriendlyError(error));
      setProcessStatus('error');
      setIsProcessing(false);
    }
  };

  const triggerFileUpload = () => fileInputRef.current?.click();

  if (showPreview && slideData) {
    return (
      <WebSlidePreview 
        html={generatedHtml} 
        data={slideData}
        title={slideData.title}
        templateId={selectedTemplate}
        onClose={() => setShowPreview(false)}
        onUpdateData={handleUpdateSlideData}
        onRegenerateImage={handleRegenerateImage}
      />
    );
  }

  return (
    <div className={`flex h-screen ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-[#F8FAFC] text-slate-900'} overflow-hidden font-jakarta transition-colors duration-500`}>
      <aside className={`${isSidebarCollapsed ? 'w-20' : 'w-80'} ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} border-r flex flex-col transition-all duration-500 z-30 shadow-sm relative`}>
        <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className={`absolute -right-3 top-10 w-6 h-6 ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-500' : 'bg-white border-slate-200 text-slate-400'} border rounded-full flex items-center justify-center hover:text-indigo-600 shadow-sm transition-all`}>
          {isSidebarCollapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
        </button>
        <div className={`p-8 mb-4 flex items-center gap-3 ${isSidebarCollapsed ? 'justify-center' : ''}`}>
          <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/20"><Layout className="text-white" size={24} /></div>
          {!isSidebarCollapsed && (<div><h1 className="text-xl font-black leading-tight">WebSlide</h1><p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">SaaS Engine</p></div>)}
        </div>
        <nav className="flex-1 px-4 space-y-1">
          <SidebarItem icon={<Layout size={20} />} label={isSidebarCollapsed ? "" : "Dashboard"} active={activeTab === 'dashboard'} onClick={resetFlow} isDark={isDarkMode} />
          <SidebarItem icon={<History size={20} />} label={isSidebarCollapsed ? "" : "Riwayat"} active={activeTab === 'history'} onClick={() => setActiveTab('history')} isDark={isDarkMode} />
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto relative">
        <div className="max-w-[1600px] p-8 lg:p-12">
          <header className="flex justify-between items-center mb-12">
            <div>
              <h2 className="text-3xl font-black tracking-tight">Halo, {session?.user?.user_metadata?.full_name?.split(' ')[0] || 'User'}! 👋</h2>
              <p className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'} text-sm font-medium mt-1`}>Siap untuk membuat WebSlide yang memukau hari ini?</p>
            </div>
            <div className="flex items-center gap-4">
               {profile?.role === 'pro' ? (
                 <div className="flex items-center gap-2 bg-indigo-600/10 text-indigo-400 px-4 py-2 rounded-2xl border border-indigo-500/20"><Crown size={16} /><span className="text-[10px] font-black uppercase">PRO</span></div>
               ) : (
                 <div className={`flex items-center gap-2 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'} px-4 py-2 rounded-2xl border text-xs font-bold`}>
                   <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                   <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>{profile?.credits || 0} Kredit</span>
                 </div>
               )}
               <div className="flex items-center gap-3">
                {profile?.role === 'admin' && (
                  <button 
                    onClick={() => setShowAdminDashboard(true)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border transition-all ${isDarkMode ? 'bg-indigo-600/10 border-indigo-500/30 text-indigo-400 hover:bg-indigo-600/20' : 'bg-indigo-50 border-indigo-100 text-indigo-600 hover:bg-indigo-100'}`}
                  >
                    <Shield size={18} />
                    <span className="text-xs font-black uppercase tracking-wider">Admin</span>
                  </button>
                )}
                <button 
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className={`w-12 h-12 rounded-2xl border flex items-center justify-center transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-yellow-400 hover:bg-slate-750' : 'bg-white border-slate-100 text-slate-400 hover:bg-slate-50'}`}
               >
                 {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
               </button>
               {session && <UserMenu user={session.user} profile={profile} />}
               </div>
            </div>
          </header>

          <div className="flex flex-col gap-10">
            {activeTab === 'dashboard' ? (
              <>
                <div className={`${isDarkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-white/40 border-white'} backdrop-blur-md p-5 rounded-[32px] border max-w-4xl shadow-sm`}>
                  <div className="flex justify-between px-4">
                    <StepperItem num={1} label="Mulai" active={['category', 'upload'].includes(currentStep)} done={['skeleton', 'generating', 'done'].includes(currentStep)} isDark={isDarkMode} />
                    <StepperItem num={2} label="Outline" active={currentStep === 'skeleton'} done={['generating', 'done'].includes(currentStep)} isDark={isDarkMode} />
                    <StepperItem num={3} label="Magic" active={currentStep === 'generating'} done={currentStep === 'done'} isDark={isDarkMode} />
                    <StepperItem num={4} label="Selesai" active={currentStep === 'done'} done={false} isDark={isDarkMode} />
                  </div>
                </div>

                {currentStep === 'category' && (
                  <div className={`${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-50'} p-10 rounded-[40px] shadow-sm border relative`}>
                    <div className="flex flex-col gap-6">
                      {processStatus === 'error' && errorMessage && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-2xl flex items-center gap-3 animate-in fade-in zoom-in slide-in-from-top-4">
                          <AlertCircle size={20} className="shrink-0" />
                          <p className="text-sm font-bold">{errorMessage}</p>
                        </div>
                      )}
                      <div>
                        <h3 className="text-xl font-black mb-2">Pilih Mode berikut untuk Generate WebSlide 🪄</h3>
                        <p className={`${isDarkMode ? 'text-slate-500' : 'text-slate-400'} text-sm font-medium`}>Tentukan sumber materi Anda dan kategori yang sesuai.</p>
                      </div>
                      
                      <div className="flex flex-col lg:flex-row gap-4">
                        <div className="flex flex-1 flex-col sm:flex-row gap-3">
                          <ModeCard icon={<Zap size={18} />} title="Quick Mode" desc="Input teks atau judul singkat" active={inputMode === 'quick'} onClick={() => setInputMode('quick')} id="tour-quick-input" isDark={isDarkMode} />
                          <ModeCard icon={<FileUp size={18} />} title="Mode Lanjutan" desc="Generate dari file PDF" active={inputMode === 'advanced'} onClick={() => setInputMode('advanced')} isDark={isDarkMode} />
                        </div>
                        <div className="flex shrink-0">
                          <CategoryDropdown value={selectedCategory} onChange={setSelectedCategory} isDark={isDarkMode} />
                        </div>
                      </div>
                    </div>

                    <div className="mt-8 space-y-6">
                      {inputMode === 'advanced' ? (
                        <div onClick={triggerFileUpload} className={`${isDarkMode ? 'border-slate-800 bg-slate-800/20 hover:bg-slate-800/40 hover:border-indigo-500/50' : 'border-slate-200 bg-slate-50/50 hover:bg-indigo-50/30 hover:border-indigo-400'} border-2 border-dashed rounded-[32px] p-16 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all`}>
                          <FileUp size={40} className={isDarkMode ? 'text-slate-600' : 'text-slate-300'} /><p className="font-bold text-center">Klik atau seret PDF ke sini</p>
                          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".pdf" className="hidden" />
                        </div>
                      ) : (
                        <textarea 
                          value={quickPrompt} onChange={(e) => setQuickPrompt(e.target.value)} placeholder={placeholderText} 
                          className={`w-full ${isDarkMode ? 'bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-100 text-slate-900 placeholder:text-slate-400'} border rounded-3xl px-6 py-5 focus:ring-2 focus:ring-indigo-500/20 min-h-[160px] text-sm font-medium transition-all outline-none`} 
                        />
                      )}
                      <div className={`flex flex-col sm:flex-row justify-between items-center pt-8 border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-50'} gap-6`}>
                        <div className="flex gap-10">
                          <ToggleItem icon={<Palette size={18} />} label="Ilustrasi AI" enabled={isImageGenEnabled} onChange={setIsImageGenEnabled} isDark={isDarkMode} />
                          <ToggleItem icon={<List size={18} />} label="Kuis" enabled={includeQuiz} onChange={setIncludeQuiz} isDark={isDarkMode} />
                        </div>
                        <button id="tour-generate-btn" disabled={isProcessing || (inputMode === 'quick' && !quickPrompt)} onClick={handleQuickGenerate} className="bg-indigo-600 hover:bg-indigo-500 text-white px-12 py-4 rounded-2xl font-black shadow-xl shadow-indigo-600/20 flex items-center gap-3 transition-all transform active:scale-[0.98]">
                          {isProcessing ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />} Generate WebSlide
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {currentStep === 'skeleton' && (
                  <div className={`${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-50'} p-10 rounded-[40px] shadow-sm border animate-in slide-in-from-bottom-4`}>
                    <h3 className="text-xl font-black mb-2">Outline Telah Siap ✨</h3>
                    <p className={`${isDarkMode ? 'text-slate-500' : 'text-slate-400'} mb-8 text-sm font-medium`}>Pilih bab yang ingin dibuatkan slide-nya.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
                      {chapters.map((chapter, idx) => (
                        <div 
                          key={chapter.id} 
                          onClick={() => { setSelectedChapters(prev => prev.includes(chapter.id) ? prev.filter(id => id !== chapter.id) : [...prev, chapter.id]); }}
                          className={`group cursor-pointer p-6 rounded-3xl border-2 transition-all flex flex-col gap-4 relative overflow-hidden ${selectedChapters.includes(chapter.id) ? (isDarkMode ? 'border-indigo-600 bg-indigo-600/10' : 'border-indigo-600 bg-indigo-50') : (isDarkMode ? 'border-slate-800 bg-slate-800/30 hover:border-slate-700' : 'border-slate-50 bg-slate-50/50 hover:bg-slate-100')}`}
                        >
                          <div className="flex justify-between items-start">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black shrink-0 ${selectedChapters.includes(chapter.id) ? 'bg-indigo-600 text-white' : (isDarkMode ? 'bg-slate-800 text-slate-600' : 'bg-white text-slate-300')}`}>
                              {selectedChapters.includes(chapter.id) ? <Check size={18} /> : (idx + 1)}
                            </div>
                            <div className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${selectedChapters.includes(chapter.id) ? 'bg-indigo-600/20 text-indigo-400' : (isDarkMode ? 'bg-slate-800 text-slate-500' : 'bg-white text-slate-400')} border ${isDarkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                              ± {chapter.suggestedSlides || 2} Slide
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="font-black text-sm mb-2 leading-tight">{chapter.title}</h4>
                            <p className={`text-[11px] leading-relaxed mb-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} line-clamp-2`}>{chapter.summary}</p>
                            
                            {chapter.subtopics && chapter.subtopics.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mb-4">
                                {chapter.subtopics.slice(0, 3).map((sub, sIdx) => (
                                  <span key={sIdx} className={`text-[9px] font-bold px-2 py-0.5 rounded-md ${isDarkMode ? 'bg-slate-800 text-slate-500' : 'bg-slate-200/50 text-slate-500'}`}>{sub}</span>
                                ))}
                                {chapter.subtopics.length > 3 && <span className="text-[9px] font-bold text-slate-400">+{chapter.subtopics.length - 3} lagi</span>}
                              </div>
                            )}

                            {chapter.references && chapter.references.length > 0 && (
                              <div className="flex items-center gap-2 mt-auto pt-4 border-t border-dashed border-slate-700/20">
                                <BookOpen size={12} className="text-indigo-500" />
                                <span className="text-[9px] font-bold text-indigo-500 truncate">{chapter.references[0]}</span>
                              </div>
                            )}
                          </div>
                          
                          {selectedChapters.includes(chapter.id) && (
                            <div className="absolute -right-2 -bottom-2 opacity-10">
                              <Sparkles size={80} className="text-indigo-600" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className={`flex justify-between items-center pt-6 border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-50'}`}>
                      <button onClick={resetFlow} className="text-sm font-semibold text-slate-500 hover:text-slate-400 transition-colors">Batal & Reset</button>
                      <button onClick={startGeneration} className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black shadow-xl flex items-center gap-3 hover:bg-slate-800 transition-all">
                        Generate Slides <ArrowRight size={18} />
                      </button>
                    </div>
                  </div>
                )}

                {currentStep === 'generating' && (
                  <div className={`${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-50'} p-16 rounded-[40px] shadow-sm flex flex-col items-center justify-center text-center border`}>
                    <div className="w-24 h-24 border-8 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-8"></div>
                    <h3 className="text-2xl font-black mb-4">AI Sedang Bekerja...</h3>
                    <p className={`${isDarkMode ? 'text-slate-500' : 'text-slate-400'} mb-8 text-sm font-medium`}>Kami sedang merangkai konten WebSlide Anda secara real-time.</p>
                    <div className={`w-full max-w-md ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'} h-2 rounded-full overflow-hidden mb-4`}>
                      <div className="bg-indigo-600 h-full transition-all duration-500 shadow-lg shadow-indigo-600/50" style={{ width: `${progressPercent}%` }}></div>
                    </div>
                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest animate-pulse">{currentProgressText}</p>
                  </div>
                )}

                {currentStep === 'done' && (
                  <div className={`${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-50'} p-16 rounded-[40px] shadow-sm text-center animate-in zoom-in-95 border`}>
                    <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 rounded-3xl flex items-center justify-center mx-auto mb-6"><CheckCircle2 size={40} /></div>
                    <h3 className="text-3xl font-black mb-2">WebSlide Berhasil Dibuat!</h3>
                    <p className={`${isDarkMode ? 'text-slate-500' : 'text-slate-400'} mb-10 font-medium`}>Klik Preview untuk melihat presentasi interaktif dan export hasilnya.</p>
                    <div className="flex justify-center gap-4">
                      <button onClick={() => setShowPreview(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-12 py-4 rounded-2xl font-black shadow-xl shadow-indigo-600/20 transition-all transition-all transform active:scale-[0.98]">Lihat Preview</button>
                      <button onClick={resetFlow} className={`${isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'} px-10 py-4 rounded-2xl font-black transition-all transform active:scale-[0.98]`}>Buat Baru</button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex justify-between items-end mb-8">
                  <div>
                    <h3 className="text-2xl font-black mb-1">Riwayat WebSlide 📚</h3>
                    <p className={`${isDarkMode ? 'text-slate-500' : 'text-slate-400'} text-sm font-medium`}>Akses kembali semua presentasi yang telah Anda buat di Cloud.</p>
                  </div>
                </div>

                {cloudHistory.length === 0 ? (
                  <div className={`${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} p-20 rounded-[40px] text-center border border-dashed`}>
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300"><History size={32} /></div>
                    <p className="text-slate-400 font-bold">Belum ada riwayat di Cloud.</p>
                    <button onClick={resetFlow} className="mt-4 text-indigo-600 font-black text-sm hover:underline">Mulai Buat Sekarang</button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {cloudHistory.map((item) => (
                      <div key={item.id} className={`${isDarkMode ? 'bg-slate-900 border-slate-800 hover:border-indigo-500/50' : 'bg-white border-slate-100 hover:border-indigo-400'} p-6 rounded-[32px] border-2 transition-all group relative overflow-hidden`}>
                        <div className="flex justify-between items-start mb-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isDarkMode ? 'bg-slate-800 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                            <Presentation size={24} />
                          </div>
                          <div className="text-right">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{formatRelativeTime(new Date(item.created_at).getTime())}</p>
                             <div className={`text-[9px] px-2 py-1 rounded-full font-bold inline-block ${item.is_public ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-400/10 text-slate-400'}`}>
                               {item.is_public ? 'PUBLIK' : 'PRIVATE'}
                             </div>
                          </div>
                        </div>
                        <h4 className="font-black text-sm mb-1 truncate pr-8">{item.title}</h4>
                        <p className={`text-[11px] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'} mb-6 line-clamp-1`}>{item.course || 'Tanpa Materi'}</p>
                        
                        <div className="flex gap-2">
                          <button 
                            onClick={() => {
                              setSlideData(item.data);
                              setGeneratedHtml(item.html);
                              setSelectedTemplate(item.template_id);
                              setShowPreview(true);
                            }}
                            className="flex-1 bg-indigo-600 text-white text-[11px] font-black py-3 rounded-xl shadow-lg shadow-indigo-600/10 hover:bg-indigo-500 transition-all flex items-center justify-center gap-2"
                          >
                            <Play size={14} fill="currentColor" /> Buka
                          </button>
                          <button 
                            onClick={async () => {
                              if (confirm('Hapus slide ini secara permanen?')) {
                                await databaseService.deleteWebSlide(item.id);
                                await fetchCloudHistory();
                              }
                            }}
                            className={`${isDarkMode ? 'bg-slate-800 text-slate-500 hover:bg-red-500/10 hover:text-red-500' : 'bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-600'} p-3 rounded-xl transition-all`}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Admin Dashboard Overlay */}
      {showAdminDashboard && (
        <AdminDashboard 
          isDark={isDarkMode} 
          onClose={() => setShowAdminDashboard(false)} 
        />
      )}

      {/* Auth Modal Overlay */}
      <AuthModal isOpen={!isAuthLoading && !session} />
      {showTour && <TourTooltip steps={DASHBOARD_TOUR_STEPS} currentStep={0} totalSteps={2} globalStep={0} onNext={()=>{}} onBack={()=>{}} onSkip={()=>{}} isLast={true} />}
    </div>
  );
}

export default App;


