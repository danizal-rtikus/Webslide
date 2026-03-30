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
  Crown
} from 'lucide-react';
import { extractTextFromPDF } from './utils/pdfProcessor';
import { 
  generateWebSlideData, 
  WebSlideJson, 
  listAvailableModels, 
  GeminiModel, 
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

const PROMPT_EXAMPLES = [
  "Misal: Buat WebSlide mendalam tentang sejarah Kopi Luwak di Indonesia...",
  "Misal: Jelaskan konsep Quantum Computing untuk pemula dalam WebSlide...",
  "Misal: Susun strategi pemasaran digital untuk startup kopi kekinian...",
  "Misal: Ringkas materi tentang Perang Dunia II menjadi WebSlide interaktif...",
  "Misal: Buat panduan instalasi sistem operasi Linux Ubuntu Server...",
  "Misal: Analisis dampak perubahan iklim terhadap ekonomi pertanian..."
];

// Helper Components
function SidebarItem({ icon, label, active = false, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`
        w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 group
        ${active 
          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' 
          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}
      `}
    >
      <div className={`${active ? 'text-white' : 'text-slate-400 group-hover:text-indigo-600'} transition-colors`}>
        {icon}
      </div>
      {label && <span className="text-sm font-bold tracking-tight">{label}</span>}
    </button>
  );
}

function StepperItem({ num, label, active, done }: { num: number, label: string, active: boolean, done: boolean }) {
  return (
    <div className={`flex items-center gap-3 transition-all duration-500 ${active ? 'scale-110' : 'opacity-60'}`}>
      <div className={`
        w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black transition-all duration-500
        ${done ? 'bg-emerald-500 text-white' : active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-slate-100 text-slate-400'}
      `}>
        {done ? <Check size={14} /> : num}
      </div>
      <span className={`text-[11px] font-black uppercase tracking-widest ${active ? 'text-slate-900' : 'text-slate-400'}`}>{label}</span>
    </div>
  );
}

function CategoryDropdown({ value, onChange }: { value: string, onChange: (v: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const selected = CATEGORIES.find(c => c.id === value) || CATEGORIES[0];

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 bg-white border border-slate-100 px-5 py-3 rounded-2xl shadow-sm hover:bg-slate-50 transition-all min-w-[180px]"
      >
        <span className="text-xl">
          {typeof selected.icon === 'function' ? selected.icon({ size: 20 }) : selected.icon}
        </span>
        <div className="text-left">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kategori</p>
          <p className="text-xs font-bold text-slate-900">{selected.label}</p>
        </div>
        <ChevronDown size={14} className={`ml-auto text-slate-300 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-3 w-64 bg-white border border-slate-100 rounded-3xl shadow-2xl p-2 z-[60] animate-in fade-in slide-in-from-top-2 duration-300">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => { onChange(cat.id); setIsOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${value === cat.id ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50 text-slate-600'}`}
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

function ModeCard({ icon, title, desc, active, onClick, id }: { icon: React.ReactNode, title: string, desc: string, active: boolean, onClick: () => void, id?: string }) {
  return (
    <div 
      id={id}
      onClick={onClick}
      className={`
        relative p-6 rounded-3xl border-2 transition-all cursor-pointer group flex flex-col gap-4
        ${active 
          ? 'border-indigo-600 bg-indigo-50/30' 
          : 'border-slate-100 bg-white hover:border-slate-200'}
      `}
    >
      <div className={`
        w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500
        ${active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-slate-50 text-slate-400 group-hover:scale-110'}
      `}>
        {icon}
      </div>
      <div>
        <h4 className="font-black text-slate-900 text-sm mb-1">{title}</h4>
        <p className="text-[11px] text-slate-500 leading-relaxed">{desc}</p>
      </div>
      {active && (
        <div className="absolute top-4 right-4 text-indigo-600">
          <CheckCircle2 size={20} />
        </div>
      )}
    </div>
  );
}

function ToggleItem({ icon, label, enabled, onChange, tooltip }: { icon: React.ReactNode, label: string, enabled: boolean, onChange: (v: boolean) => void, tooltip?: string }) {
  return (
    <div className="flex items-center gap-3 group relative cursor-help">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${enabled ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-slate-50 text-slate-400 border border-transparent'}`}>
        {icon}
      </div>
      <div className="flex flex-col">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer">{label}</label>
        <button 
          onClick={() => onChange(!enabled)}
          className={`w-10 h-5 rounded-full relative transition-all duration-300 ${enabled ? 'bg-indigo-600' : 'bg-slate-200'}`}
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
  const [slideData, setSlideData] = useState<WebSlideJson | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  
  // Deprecated/Hidden logic for SaaS
  const [apiKey, setApiKey] = useState(localStorage.getItem('gemini_api_key') || '');
  const [availableModels, setAvailableModels] = useState<GeminiModel[]>([]);
  const [placeholderText, setPlaceholderText] = useState("");
  
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

  useEffect(() => {
    if (session?.user) {
      fetchProfile();
    } else {
      setProfile(null);
    }
  }, [session]);

  const fetchProfile = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();
    
    if (data) setProfile(data);
    if (error) console.error('Error fetching profile:', error);
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
    if (!slideData || !apiKey) return;
    try {
      const slide = slideData.slides[slideIndex];
      const visualDesc = await generateVisualDescription(slide.title, slide.content[0], apiKey);
      const imageUrl = await generateImageImagen4(visualDesc, apiKey);
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
    if (!file || !apiKey) return;
    try {
      setIsProcessing(true);
      setProcessStatus('extracting');
      const { text } = await extractTextFromPDF(file);
      setExtractedText(text);
      setProcessStatus('analyzing');
      const result = await identifyChapters(text, apiKey, selectedCategory);
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
    if (!apiKey) return;
    try {
      setIsProcessing(true);
      setProcessStatus('analyzing');
      const result = await generateSkeletonFromPrompt(quickPrompt, apiKey, selectedCategory);
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

  const startGeneration = async () => {
    if (selectedChapters.length === 0 || !apiKey) return;
    try {
      setIsProcessing(true);
      setProcessStatus('generating');
      setCurrentStep('generating');
      const selectedChapterObjects = chapters.filter(c => selectedChapters.includes(c.id));
      let allSlides: any[] = [
        { type: 'cover', title: slideData?.title || 'WebSlide Presentation', content: [slideData?.course || ''] },
        { type: 'outline', title: 'Daftar Isi', content: selectedChapterObjects.map(c => c.title) }
      ];

      for (let i = 0; i < selectedChapterObjects.length; i++) {
        const chapter = selectedChapterObjects[i];
        setCurrentProgressText(`Memproses Bab ${i+1}/${selectedChapterObjects.length}...`);
        setProgressPercent(Math.floor(((i+1)/selectedChapterObjects.length)*100));
        const chapterSlides = await generateChapterSlides(chapter, extractedText, apiKey, selectedCategory);
        allSlides = [...allSlides, ...chapterSlides];
      }

      const finalData: WebSlideJson = {
        title: slideData?.title || 'Presentation',
        author: slideData?.author || 'Author',
        course: slideData?.course || 'Module',
        slides: allSlides,
        quiz: []
      };
      setSlideData(finalData);
      setGeneratedHtml(generateWebSlideHtml(finalData, selectedTemplate));
      saveToHistory(finalData, generatedHtml, selectedTemplate);
      refreshHistory();
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
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden font-jakarta">
      <aside className={`${isSidebarCollapsed ? 'w-20' : 'w-72'} bg-white border-r border-slate-100 flex flex-col transition-all duration-500 z-30 shadow-sm relative`}>
        <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="absolute -right-3 top-10 w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-indigo-600 shadow-sm">
          {isSidebarCollapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
        </button>
        <div className={`p-8 mb-4 flex items-center gap-3 ${isSidebarCollapsed ? 'justify-center' : ''}`}>
          <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200"><Layout className="text-white" size={24} /></div>
          {!isSidebarCollapsed && (<div><h1 className="text-xl font-black text-slate-900 leading-tight">WebSlide</h1><p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">SaaS Engine</p></div>)}
        </div>
        <nav className="flex-1 px-4 space-y-1">
          <SidebarItem icon={<Layout size={20} />} label={isSidebarCollapsed ? "" : "Dashboard"} active={currentStep !== 'done'} onClick={resetFlow} />
          <SidebarItem icon={<History size={20} />} label={isSidebarCollapsed ? "" : "Riwayat"} />
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto relative bg-[#F8FAFC]">
        <div className="max-w-[1600px] p-8 lg:p-12">
          <header className="flex justify-between items-center mb-10">
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Halo, {session?.user?.user_metadata?.full_name?.split(' ')[0] || 'User'}! 👋</h2>
              <p className="text-slate-500 text-sm font-medium mt-1">Siap untuk membuat WebSlide yang memukau hari ini?</p>
            </div>
            <div className="flex items-center gap-4">
               {profile?.role === 'pro' && (<div className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-2xl border border-indigo-100"><Crown size={16} /><span className="text-[10px] font-black uppercase">PRO</span></div>)}
               <CategoryDropdown value={selectedCategory} onChange={setSelectedCategory} />
               {session && <UserMenu user={session.user} profile={profile} />}
            </div>
          </header>

          <div className="flex flex-col gap-8">
            <div className="bg-white/40 backdrop-blur-md p-4 rounded-[32px] border border-white max-w-4xl">
              <div className="flex justify-between px-4">
                <StepperItem num={1} label="Mulai" active={['category', 'upload'].includes(currentStep)} done={['skeleton', 'generating', 'done'].includes(currentStep)} />
                <StepperItem num={2} label="Outline" active={currentStep === 'skeleton'} done={['generating', 'done'].includes(currentStep)} />
                <StepperItem num={3} label="Magic" active={currentStep === 'generating'} done={currentStep === 'done'} />
                <StepperItem num={4} label="Selesai" active={currentStep === 'done'} done={false} />
              </div>
            </div>

            {currentStep === 'category' && (
              <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-50 relative overflow-hidden">
                <h3 className="text-xl font-black text-slate-900 mb-2">Pilih Strategi Konten 🧠</h3>
                <p className="text-slate-500 mb-10 text-sm">Gunakan Quick Mode untuk teks singkat, atau Mode Lanjutan untuk file PDF.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <ModeCard icon={<Zap size={24} />} title="Quick Mode" desc="Teks atau judul singkat" active={inputMode === 'quick'} onClick={() => setInputMode('quick')} id="tour-quick-input" />
                  <ModeCard icon={<FileUp size={24} />} title="Mode Lanjutan" desc="Konten dari file PDF" active={inputMode === 'advanced'} onClick={() => setInputMode('advanced')} />
                </div>
                <div className="mt-10 space-y-6">
                  {inputMode === 'advanced' ? (
                    <div onClick={triggerFileUpload} className="border-2 border-dashed border-slate-200 rounded-[32px] p-12 flex flex-col items-center justify-center gap-4 hover:border-indigo-400 hover:bg-indigo-50/30 cursor-pointer bg-slate-50/50">
                      <FileUp size={32} className="text-slate-400" /><p className="font-bold text-slate-900 text-center">Klik atau seret PDF ke sini</p>
                      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".pdf" className="hidden" />
                    </div>
                  ) : (
                    <textarea 
                      value={quickPrompt} onChange={(e) => setQuickPrompt(e.target.value)} placeholder={placeholderText} 
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-5 text-slate-900 focus:ring-2 focus:ring-indigo-500/20 min-h-[140px] text-sm font-medium" 
                    />
                  )}
                  <div className="flex justify-between items-center pt-4 border-t border-slate-50">
                    <div className="flex gap-8">
                      <ToggleItem icon={<Palette size={18} />} label="Ilustrasi AI" enabled={isImageGenEnabled} onChange={setIsImageGenEnabled} />
                      <ToggleItem icon={<List size={18} />} label="Kuis" enabled={includeQuiz} onChange={setIncludeQuiz} />
                    </div>
                    <button id="tour-generate-btn" disabled={isProcessing || (inputMode === 'quick' && !quickPrompt)} onClick={handleQuickGenerate} className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black shadow-xl shadow-indigo-100 flex items-center gap-3">
                      {isProcessing ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />} Mulai Generate
                    </button>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 'skeleton' && (
              <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-50 animate-in slide-in-from-bottom-4">
                <h3 className="text-xl font-black text-slate-900 mb-2">Outline Telah Siap ✨</h3>
                <p className="text-slate-500 mb-8 text-sm">Pilih bab yang ingin dibuatkan slide-nya.</p>
                <div className="space-y-3 mb-10">
                  {chapters.map((chapter) => (
                    <div 
                      key={chapter.id} onClick={() => { setSelectedChapters(prev => prev.includes(chapter.id) ? prev.filter(id => id !== chapter.id) : [...prev, chapter.id]); }}
                      className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-4 ${selectedChapters.includes(chapter.id) ? 'border-indigo-600 bg-indigo-50/30' : 'border-slate-50 bg-slate-50/50 hover:bg-slate-100'}`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${selectedChapters.includes(chapter.id) ? 'bg-indigo-600 text-white' : 'bg-white text-slate-300'}`}>
                        {selectedChapters.includes(chapter.id) ? <Check size={18} /> : chapter.id}
                      </div>
                      <h4 className="font-bold text-slate-900 text-sm">{chapter.title}</h4>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center pt-6 border-t border-slate-50">
                  <button onClick={resetFlow} className="text-sm font-bold text-slate-400 hover:text-slate-600">Batal</button>
                  <button onClick={startGeneration} className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black shadow-xl flex items-center gap-3">
                    Generate Slides <ArrowRight size={18} />
                  </button>
                </div>
              </div>
            )}

            {currentStep === 'generating' && (
              <div className="bg-white p-16 rounded-[40px] shadow-sm flex flex-col items-center justify-center text-center">
                <div className="w-24 h-24 border-8 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-8"></div>
                <h3 className="text-2xl font-black text-slate-900 mb-4">AI Sedang Bekerja...</h3>
                <p className="text-slate-500 mb-8 text-sm">Kami sedang merangkai konten WebSlide Anda.</p>
                <div className="w-full max-w-md bg-slate-100 h-2 rounded-full overflow-hidden mb-4">
                  <div className="bg-indigo-600 h-full transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
                </div>
                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{currentProgressText}</p>
              </div>
            )}

            {currentStep === 'done' && (
              <div className="bg-white p-16 rounded-[40px] shadow-sm text-center animate-in zoom-in-95">
                <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-6"><CheckCircle2 size={40} /></div>
                <h3 className="text-3xl font-black text-slate-900 mb-2">WebSlide Berhasil Dibuat!</h3>
                <p className="text-slate-500 mb-10">Klik Preview untuk melihat presentasi interaktif Anda.</p>
                <div className="flex justify-center gap-4">
                  <button onClick={() => setShowPreview(true)} className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black shadow-xl transition-all">Lihat Preview</button>
                  <button onClick={resetFlow} className="bg-slate-100 text-slate-600 px-10 py-4 rounded-2xl font-black transition-all">Buat Baru</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <AuthModal isOpen={!isAuthLoading && !session} />
      {showTour && <TourTooltip steps={DASHBOARD_TOUR_STEPS} currentStep={0} totalSteps={2} globalStep={0} onNext={()=>{}} onBack={()=>{}} onSkip={()=>{}} isLast={true} />}
    </div>
  );
}

export default App;
