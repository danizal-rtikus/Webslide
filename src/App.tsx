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
  X
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

const PROMPT_EXAMPLES = [
  "Misal: Buat WebSlide mendalam tentang sejarah Kopi Luwak di Indonesia...",
  "Misal: Jelaskan konsep Quantum Computing untuk pemula dalam WebSlide...",
  "Misal: Susun strategi pemasaran digital untuk startup kopi kekinian...",
  "Misal: Ringkas materi tentang Perang Dunia II menjadi WebSlide interaktif...",
  "Misal: Buat panduan instalasi sistem operasi Linux Ubuntu Server...",
  "Misal: Analisis dampak perubahan iklim terhadap ekonomi pertanian..."
];

function App() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStatus, setProcessStatus] = useState<'idle' | 'extracting' | 'analyzing' | 'done' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [generatedHtml, setGeneratedHtml] = useState('');
  const [slideData, setSlideData] = useState<WebSlideJson | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [apiKey, setApiKey] = useState(localStorage.getItem('gemini_api_key') || '');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [availableModels, setAvailableModels] = useState<GeminiModel[]>([]);
  const [isScanningModels, setIsScanningModels] = useState(false);
  const [scanStatus, setScanStatus] = useState<{type: 'error' | 'success', msg: string} | null>(null);
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
  
  // SEO & Metadata States
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  
  // Dashboard Input States
  const [inputMode, setInputMode] = useState<'quick' | 'advanced'>('quick');
  const [quickPrompt, setQuickPrompt] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Local history state
  const [history, setHistory] = useState<HistoryItem[]>(() => loadHistory());
  const refreshHistory = () => setHistory(loadHistory());

  // 4.1 Onboarding state — show once for new users
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(
    () => !localStorage.getItem('webslide_onboarded')
  );

  // Tour state — starts after onboarding dismissed
  const [globalTourStep, setGlobalTourStep] = useState<number>(
    () => localStorage.getItem('webslide_tour_done') ? -1 : -1 // starts after onboarding
  );
  const TOTAL_TOUR_STEPS = 10; // 6 dashboard + 4 preview
  const DASHBOARD_TOUR_STEPS: TourStepConfig[] = [
    {
      targetId: 'tour-quick-input',
      title: 'Mulai dari Sini 🎯',
      message: 'Ketikkan topik apa saja — judul bab, nama mata kuliah, atau ide presentasi. AI akan membangun slide lengkap untuknya.',
      position: 'top',
    },
    {
      targetId: 'tour-mode-toggle',
      title: 'Dua Mode Input 📂',
      message: 'Quick Mode untuk topik singkat via teks. Klik "Mode Lanjutan" untuk upload file PDF yang lebih panjang dan detail.',
      position: 'top',
    },
    {
      targetId: 'tour-ai-toggle',
      title: 'Ilustrasi AI ✨',
      message: 'Aktifkan untuk menambahkan gambar ilustrasi realistis di setiap bab. Membutuhkan waktu lebih lama tapi hasilnya memukau.',
      position: 'bottom',
    },
    {
      targetId: 'tour-category',
      title: 'Pilih Konteks 📚',
      message: 'Pilih kategori yang sesuai agar AI memahami gaya penulisan — kuliah, bisnis, startup, atau riset.',
      position: 'bottom',
    },
    {
      targetId: 'tour-generate-btn',
      title: 'Generate WebSlide ⚡',
      message: 'Klik tombol ini untuk mulai! AI akan menyusun outline dulu, lalu Anda memilih bab yang ingin dibuat slide-nya.',
      position: 'top',
    },
    {
      targetId: 'tour-history',
      title: 'Riwayat Pembuatan 🗂️',
      message: 'WebSlide yang sudah Anda buat tersimpan di sini. Klik untuk langsung membuka kembali tanpa perlu generate ulang.',
      position: 'left',
    },
  ];

  const dismissOnboarding = () => {
    localStorage.setItem('webslide_onboarded', '1');
    setShowOnboarding(false);
    // Start the contextual tour after welcome modal
    if (!localStorage.getItem('webslide_tour_done')) {
      setGlobalTourStep(0);
    }
  };

  const handleTourNext = () => {
    const next = globalTourStep + 1;
    if (next >= TOTAL_TOUR_STEPS) {
      localStorage.setItem('webslide_tour_done', '1');
      setGlobalTourStep(-1);
    } else {
      setGlobalTourStep(next);
    }
  };
  const handleTourBack = () => setGlobalTourStep((s) => Math.max(0, s - 1));
  const handleTourSkip = () => {
    localStorage.setItem('webslide_tour_done', '1');
    setGlobalTourStep(-1);
  };

  // Dashboard tour: steps 0-5; Preview tour: steps 6-9
  const dashboardTourStep = globalTourStep >= 0 && globalTourStep < 6 ? globalTourStep : -1;
  const previewTourStep = globalTourStep >= 6 ? globalTourStep - 6 : -1;

  useEffect(() => {
    localStorage.setItem('gemini_api_key', apiKey);
  }, [apiKey]);

  useEffect(() => {
    // Pick a random placeholder once on mount
    const randomIdx = Math.floor(Math.random() * PROMPT_EXAMPLES.length);
    setPlaceholderText(PROMPT_EXAMPLES[randomIdx]);
  }, []);

  const getQuota = () => {
    const today = new Date().toDateString();
    const stored = localStorage.getItem('webslide_quota');
    if (!stored) return { count: 0, date: today };
    const parsed = JSON.parse(stored);
    if (parsed.date !== today) return { count: 0, date: today };
    return parsed;
  };

  const checkQuota = () => {
    return true; // QUOTA DISABLED - re-enable before public launch
    // const quota = getQuota();
    // return quota.count < 2;
  };

  const incrementQuota = () => {
    const quota = getQuota();
    quota.count += 1;
    localStorage.setItem('webslide_quota', JSON.stringify(quota));
  };

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
    setInputMode('quick');
  };

  /**
   * Updates slide data and regenerates HTML (debounced)
   */
  const handleUpdateSlideData = (newData: WebSlideJson, newTemplateId?: string) => {
    setSlideData(newData);
    const tid = newTemplateId || selectedTemplate;
    if (newTemplateId) setSelectedTemplate(newTemplateId);
    
    // Regenerate HTML immediately for the preview
    const newHtml = generateWebSlideHtml(newData, tid);
    setGeneratedHtml(newHtml);
  };

  /**
   * Specifically regenerates exactly one image for a slide
   */
  const handleRegenerateImage = async (slideIndex: number) => {
    if (!slideData || !apiKey) return;
    
    try {
      const slide = slideData.slides[slideIndex];
      const safeTitle = slide.title || 'Slide';
      const safeContent = (slide.content && slide.content.length > 0) ? slide.content[0] : 'Professional illustration';
      
      // 1. Get visual description
      const visualDesc = await generateVisualDescription(safeTitle, safeContent, apiKey);
      
      // 2. Detect best available image model
      const imgModel = availableModels.find(m => 
        (m.name || '').toLowerCase().includes('imagen') || 
        (m.displayName || '').toLowerCase().includes('imagen')
      );

      const imgPrompt = `High-resolution hyper-realistic professional photography of ${visualDesc}. Style: Professional commercial photography, award-winning composition, cinematic lighting, shadow depth of field, 8k, photorealistic, National Geographic style. Absolutely NO TEXT, NO WORDS, NO LETTERS, CLEAN COMPOSITION, NO TYPOGRAPHY, NO LABELS, NO WATERMARK.`;
      
      const imageUrl = await generateImageImagen4(imgPrompt, apiKey, imgModel?.name);
      
      if (imageUrl) {
        const newData = { ...slideData };
        newData.slides[slideIndex].imageUrl = imageUrl;
        handleUpdateSlideData(newData);
      }
    } catch (err) {
      console.error("Single image regeneration failed:", err);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!apiKey) {
      setErrorMessage('Harap masukkan AI APII Key di menu Settings terlebih dahulu.');
      setProcessStatus('error');
      setShowKeyInput(true);
      return;
    }

    // 1.1 Validate PDF file
    const pdfError = validatePdfFile(file);
    if (pdfError) {
      setErrorMessage(pdfError);
      setProcessStatus('error');
      return;
    }

    if (!checkQuota()) {
      setErrorMessage('Limit harian tercapai (2/hari). Silakan coba lagi besok atau upgrade ke Pro.');
      setProcessStatus('error');
      return;
    }

    try {
      setIsProcessing(true);
      setProcessStatus('extracting');
      
      const { text } = await extractTextFromPDF(file);
      setExtractedText(text);
      
      setProcessStatus('analyzing');
      const result = await identifyChapters(text, apiKey, selectedCategory);
      setChapters(result.chapters);
      setSelectedChapters(result.chapters.map((c: any) => c.id));
      
      // Store metadata temporarily in slideData placeholder
      setSlideData({
        title: result.title,
        author: result.author,
        course: result.course,
        slides: [],
        quiz: []
      });
      
      setCurrentStep('skeleton');
      setProcessStatus('idle');
      setIsProcessing(false);
    } catch (error: any) {
      console.error('Error processing PDF:', error);
      setErrorMessage(getFriendlyError(error));
      setProcessStatus('error');
      setIsProcessing(false);
    }
  };

  const handleScanModels = async () => {
    if (!apiKey) {
      setScanStatus({ type: 'error', msg: 'Harap masukkan API Key terlebih dahulu.' });
      return;
    }

    try {
      setIsScanningModels(true);
      setScanStatus(null);
      const models = await listAvailableModels(apiKey);
      setAvailableModels(models);
      setScanStatus({ type: 'success', msg: `Ditemukan ${models.length} model tersedia.` });
    } catch (err: any) {
      setScanStatus({ type: 'error', msg: err.message || 'Gagal memindai model.' });
    } finally {
      setIsScanningModels(false);
    }
  };

  const handleExportCSV = () => {
    if (availableModels.length === 0) return;

    // CSV Header
    const headers = ["Display Name", "Model ID", "Description", "Supported Methods", "Image Support"];
    
    // CSV Rows
    const rows = availableModels.map(m => {
      const nameStr = (m.name || '').toLowerCase();
      const descStr = (m.description || '').toLowerCase();
      const dispStr = (m.displayName || '').toLowerCase();
      const isImageModel = nameStr.includes('image') || descStr.includes('image') || dispStr.includes('imagen');
      
      return [
        `"${(m.displayName || '').replace(/"/g, '""')}"`,
        `"${(m.name || '').replace(/"/g, '""')}"`,
        `"${(m.description || 'Tidak ada deskripsi').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
        `"${(m.supportedGenerationMethods || []).join(', ')}"`,
        isImageModel ? "YA" : "TIDAK"
      ].join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `webslide_models_scan_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
  };

  const handleQuickGenerate = async () => {
    // 1.1 Validate prompt
    const promptError = validatePrompt(quickPrompt);
    if (promptError) {
      setErrorMessage(promptError);
      setProcessStatus('error');
      return;
    }

    if (!apiKey) {
      setErrorMessage('Harap masukkan AI APII Key di menu Settings terlebih dahulu.');
      setProcessStatus('error');
      setShowKeyInput(true);
      return;
    }

    if (!checkQuota()) {
      setErrorMessage('Limit harian tercapai (2/hari). Silakan coba lagi besok atau upgrade ke Pro.');
      setProcessStatus('error');
      return;
    }

    try {
      setIsProcessing(true);
      setProcessStatus('analyzing');
      setCurrentProgressText('🧠 AI sedang menyusun outline berdasarkan ide Anda...');
      setProgressPercent(15);
      
      const result = await generateSkeletonFromPrompt(quickPrompt, apiKey, selectedCategory);
      setChapters(result.chapters);
      setSelectedChapters(result.chapters.map((c: any) => c.id));
      
      setSlideData({
        title: result.title,
        author: result.author,
        course: result.course,
        slides: [],
        quiz: []
      });
      
      setCurrentStep('skeleton');
      setProcessStatus('idle');
      setProgressPercent(0);
      setIsProcessing(false);
    } catch (error: any) {
      console.error('Quick generate failed:', error);
      setErrorMessage(getFriendlyError(error));
      setProcessStatus('error');
      setIsProcessing(false);
    }
  };

  const startGeneration = async () => {
    if (selectedChapters.length === 0) {
      alert('Pilih setidaknya satu bab untuk dilanjutkan.');
      return;
    }

    try {
      setIsProcessing(true);
      setProcessStatus('analyzing');
      setCurrentStep('generating');
      setProgressPercent(3);
      setCurrentProgressText('⚙️ Menyiapkan bab-bab yang dipilih...');

      const selectedChapterObjects = chapters.filter(c => selectedChapters.includes(c.id));
      let allSlides: any[] = [
        {
          type: 'cover',
          title: slideData?.title || 'WebSlide Presentation',
          content: [slideData?.course || '']
        },
        {
          type: 'outline',
          title: 'Daftar Isi / Outline',
          content: selectedChapterObjects.map(c => c.title)
        }
      ];

      // Batch Processing Chapters
      const MAX_SLIDES = 100;

      for (let i = 0; i < selectedChapterObjects.length; i++) {
        if (allSlides.length >= MAX_SLIDES) {
          console.warn('Reached maximum slide limit (100). Truncating further generation.');
          break;
        }

        const chapter = selectedChapterObjects[i];
        const progress = Math.round(10 + ((i) / selectedChapterObjects.length) * 75);
        setProgressPercent(progress);
        setCurrentProgressText(`🧠 Memproses Bab ${i + 1} dari ${selectedChapterObjects.length}: "${chapter.title}"...`);

        const chapterSlides = await generateChapterSlides(chapter, extractedText, apiKey, selectedCategory);
        console.log(`Chapter ${i+1} ("${chapter.title}") returned ${chapterSlides.length} slides.`);

        // --- Imagen 4 Orchestration (Trial: Section Covers only) ---
        if (isImageGenEnabled && chapterSlides && chapterSlides.length > 0) {
          try {
            const sectionCoverIndex = chapterSlides.findIndex(s => s && s.type === 'section-cover');
            if (sectionCoverIndex !== -1) {
              const sectionCover = chapterSlides[sectionCoverIndex];
              setCurrentProgressText(`🎨 AI sedang melukis ilustrasi untuk Bab ${i + 1}...`);

              const imgModel = availableModels.find(m =>
                (m.name || '').toLowerCase().includes('image') ||
                (m.displayName || '').toLowerCase().includes('imagen')
              );

              const safeTitle = sectionCover?.title || 'Slide';
              const safeContent = (sectionCover?.content && sectionCover.content.length > 0) ? sectionCover.content[0] : 'Professional illustration';

              const visualDesc = await generateVisualDescription(safeTitle, safeContent, apiKey);
              const imgPrompt = `High-resolution hyper-realistic professional photography of ${visualDesc}. Style: Professional commercial photography, award-winning composition, cinematic lighting, shadow depth of field, 8k, photorealistic, National Geographic style. Absolutely NO TEXT, NO WORDS, NO LETTERS, CLEAN COMPOSITION, NO TYPOGRAPHY, NO LABELS, NO WATERMARK.`;

              console.log(`[Image Generation] Using model: ${imgModel?.name || 'default'} for prompt: ${imgPrompt.substring(0, 50)}...`);

              const imageUrl = await generateImageImagen4(imgPrompt, apiKey, imgModel?.name);
              if (imageUrl) {
                chapterSlides[sectionCoverIndex].imageUrl = imageUrl;
                console.log(`Successfully generated Imagen illustration for chapter ${i+1}`);
              } else {
                console.warn(`Imagen generation returned null for chapter ${i+1}. Falling back to default.`);
              }
            }
          } catch (imgErr) {
            console.error("Imagen generation failed mid-loop:", imgErr);
          }
        }
        // --- End of Imagen Orchestration ---

        const remainingCapacity = MAX_SLIDES - allSlides.length;
        if (chapterSlides.length > remainingCapacity) {
          allSlides = [...allSlides, ...chapterSlides.slice(0, remainingCapacity)];
          console.warn(`Partially truncated slides for chapter "${chapter.title}" to stay within 100 limit.`);
          break;
        } else {
          allSlides = [...allSlides, ...chapterSlides];
        }

        console.log(`Total cumulative slides: ${allSlides.length}`);
      }

      // Generate Quiz (Optional Add-On)
      let quiz: any[] = [];
      if (includeQuiz) {
        setProgressPercent(88);
        setCurrentProgressText('📝 Menyusun kuis evaluasi 10 soal...');
        quiz = await generateQuizBatch(selectedChapterObjects, extractedText, apiKey);
        console.log(`Quiz generated with ${quiz.length} questions`);
      }

      setProgressPercent(95);
      setCurrentProgressText('✅ Menyatukan semua konten dan membangun WebSlide...');

      const finalData: WebSlideJson = {
        title: slideData?.title || 'WebSlide Presentation',
        author: slideData?.author || 'Author',
        course: slideData?.course || 'Module',
        slides: allSlides,
        quiz: quiz
      };

      console.log(`[DEBUG] Final data slides count: ${allSlides.length}`);
      setSlideData(finalData);

      setSeoTitle(finalData.title);
      setSeoDescription(finalData.slides[0]?.content[0] || finalData.title);

      const html = generateWebSlideHtml(finalData, selectedTemplate, finalData.title, finalData.slides[0]?.content[0] || finalData.title);
      setGeneratedHtml(html);

      // Telemetry
      console.log("--- WebSlide Generation Telemetry ---");
      console.table({
        "Project Title": finalData.title,
        "Total Slides": finalData.slides.length,
        "Category": selectedCategory,
        "Has Images": isImageGenEnabled ? "YES" : "NO",
        "Has Quiz": includeQuiz ? "YES" : "NO",
        "Template": selectedTemplate,
        "Timestamp": new Date().toISOString()
      });
      console.log("-------------------------------------");

      setProgressPercent(100);
      setProcessStatus('done');
      incrementQuota();
      setCurrentStep('done');
      setIsProcessing(false);

      // 3.1 Save to local history
      saveToHistory(finalData, html, selectedTemplate);
      refreshHistory();

    } catch (error: any) {
      console.error('Generation failed:', error);
      setErrorMessage(getFriendlyError(error));
      setProcessStatus('error');
      setIsProcessing(false);
    }

  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
    {/* Welcome Modal — 2 steps, no API info */}
    {showOnboarding && (
      <div className="fixed inset-0 z-[500] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-[40px] shadow-2xl max-w-md w-full p-10 relative animate-in fade-in slide-in-from-bottom-4 duration-500">
          <button
            onClick={dismissOnboarding}
            className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-400 transition-all"
          >
            <X size={16} />
          </button>

          <div className="flex items-center gap-2 mb-8">
            {[0, 1].map((s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  s <= onboardingStep ? 'bg-indigo-600' : 'bg-slate-100'
                } ${s === onboardingStep ? 'flex-1' : 'w-8'}`}
              />
            ))}
          </div>

          {onboardingStep === 0 && (
            <div>
              <div className="w-16 h-16 bg-indigo-50 rounded-3xl flex items-center justify-center mb-6 text-3xl">🚀</div>
              <h3 className="text-2xl font-black text-slate-900 mb-3">Selamat Datang di WebSlide!</h3>
              <p className="text-slate-500 text-sm leading-relaxed mb-6">
                Ubah topik atau file PDF menjadi presentasi interaktif yang siap ditampilkan — hanya dalam hitungan menit, ditenagai kecerdasan buatan.
              </p>
              <div className="bg-gradient-to-br from-indigo-50 to-violet-50 rounded-2xl p-4 border border-indigo-100">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🧠</span>
                  <p className="text-sm text-indigo-700 font-medium leading-snug">
                    <strong>Powered by AI</strong> — teknologi kecerdasan buatan terbaru untuk hasil presentasi terbaik.
                  </p>
                </div>
              </div>
            </div>
          )}

          {onboardingStep === 1 && (
            <div>
              <div className="w-16 h-16 bg-emerald-50 rounded-3xl flex items-center justify-center mb-6 text-3xl">🗺️</div>
              <h3 className="text-2xl font-black text-slate-900 mb-3">Sekilas Cara Kerja</h3>
              <div className="space-y-3">
                {[
                  { icon: '✏️', text: 'Ketik topik atau upload PDF di area utama' },
                  { icon: '⚡', text: 'AI menyusun outline dan membuat slide satu per satu' },
                  { icon: '🎨', text: 'Edit, ganti tema, lalu download atau presentasikan' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 rounded-2xl bg-slate-50">
                    <span className="text-xl w-8 text-center">{item.icon}</span>
                    <p className="text-sm text-slate-700 font-medium leading-snug">{item.text}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-4 text-center">
                Kami akan memandu Anda dengan tooltip interaktif setelah ini 👇
              </p>
            </div>
          )}

          <div className="flex justify-between items-center mt-8">
            {onboardingStep > 0 ? (
              <button
                onClick={() => setOnboardingStep((s) => s - 1)}
                className="text-sm font-bold text-slate-400 hover:text-slate-700 transition-colors"
              >
                ← Kembali
              </button>
            ) : <div />}

            {onboardingStep < 1 ? (
              <button
                onClick={() => setOnboardingStep((s) => s + 1)}
                className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-bold text-sm hover:bg-indigo-700 transition-all hover:scale-105 shadow-lg shadow-indigo-100"
              >
                Lanjut →
              </button>
            ) : (
              <button
                onClick={dismissOnboarding}
                className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-bold text-sm hover:bg-indigo-700 transition-all hover:scale-105 shadow-lg shadow-indigo-100"
              >
                Mulai &amp; Lihat Panduan 🗺️
              </button>
            )}
          </div>

          <p className="text-center mt-4">
            <button onClick={dismissOnboarding} className="text-xs text-slate-300 hover:text-slate-500 transition-colors">
              Lewati panduan
            </button>
          </p>
        </div>
      </div>
    )}

    {/* Dashboard contextual tour (steps 0-5) */}
    {!showOnboarding && dashboardTourStep >= 0 && (
      <TourTooltip
        steps={DASHBOARD_TOUR_STEPS}
        currentStep={dashboardTourStep}
        totalSteps={TOTAL_TOUR_STEPS}
        globalStep={globalTourStep}
        onNext={handleTourNext}
        onBack={handleTourBack}
        onSkip={handleTourSkip}
        isLast={globalTourStep === TOTAL_TOUR_STEPS - 1}
      />
    )}

    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden font-jakarta">
      {/* Sidebar */}
      <aside className={`
        ${isSidebarCollapsed ? 'w-20' : 'w-72'}
        bg-white border-r border-slate-100 flex flex-col transition-all duration-500 ease-in-out z-30 shadow-sm relative
      `}>
        {/* Toggle Button */}
        <button
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="absolute -right-3 top-10 w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-600 shadow-sm z-50 transition-all"
        >
          {isSidebarCollapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
        </button>

        <div className={`p-8 mb-4 flex items-center gap-3 transition-opacity duration-300 ${isSidebarCollapsed ? 'justify-center' : ''}`}>
          <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 shrink-0">
            <Layout className="text-white" size={24} />
          </div>
          {!isSidebarCollapsed && (
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">WebSlide</h1>
              <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">SaaS Engine</p>
            </div>
          )}
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1">
          <SidebarItem
            icon={<Layout size={20} />}
            label={isSidebarCollapsed ? "" : "Dashboard"}
            active={!showKeyInput && currentStep === 'category'}
            onClick={() => { setShowKeyInput(false); resetFlow(); }}
          />
          <SidebarItem
            icon={<History size={20} />}
            label={isSidebarCollapsed ? "" : "Riwayat Konversi"}
          />
          <SidebarItem
            icon={<Settings size={20} />}
            label={isSidebarCollapsed ? "" : "Pengaturan API"}
            active={showKeyInput}
            onClick={() => setShowKeyInput(true)}
          />
        </nav>

        <div className="px-4 py-8 mt-auto">
          <div className={`bg-slate-900 rounded-[32px] p-6 text-white relative overflow-hidden group transition-all duration-500 ${isSidebarCollapsed ? 'opacity-0 scale-90 pointer-events-none' : 'opacity-100'}`}>
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-600/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
            <div className="relative z-10">
              <p className="text-[10px] font-bold text-indigo-400 mb-2">PRO PLAN</p>
              <h4 className="font-bold text-sm mb-4">Ubah Ide Jadi Visual Tanpa Batas</h4>
              <button className="w-full bg-white text-slate-900 py-3 rounded-xl text-xs font-black hover:bg-slate-100 transition-all active:scale-95">Upgrade Now</button>
            </div>
          </div>

          <SidebarItem
            icon={<LogOut size={20} />}
            label={isSidebarCollapsed ? "" : "Keluar"}
          />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative bg-[#F8FAFC]">
        <div className="max-w-[1600px] p-8 lg:p-12">
          {/* Header Dashboard */}
          <header className="flex justify-between items-center mb-10">
            <div>
              <h2 className="text-2xl font-black text-slate-900">Halo, Selamat Datang! 👋</h2>
              <p className="text-slate-500 text-sm font-medium mt-1">Siap untuk membuat WebSlide yang memukau hari ini?</p>
            </div>
            
            <div className="flex items-center gap-4">
               {/* Model Selector Card (Integrated into Header) */}
               <div className="hidden md:flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-2xl border border-emerald-100 shadow-sm mr-2">
                 <Sparkles size={16} className="text-emerald-500" />
                 <span className="text-[10px] font-black uppercase tracking-wider">AI Connected</span>
               </div>
               
               <span id="tour-category"><CategoryDropdown value={selectedCategory} onChange={setSelectedCategory} /></span>
               
               <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center border border-slate-100 shadow-sm cursor-pointer hover:bg-slate-50 transition-all group">
                 <Settings size={20} className="text-slate-400 group-hover:text-indigo-600 group-hover:rotate-45 transition-all duration-500" />
               </div>
            </div>
          </header>

          <div className="flex flex-col gap-8">
            {showKeyInput ? (
              <div className="bg-white rounded-[40px] border border-slate-100 p-12 shadow-sm max-w-2xl mx-auto w-full">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                    <Key size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">Konfigurasi API Key</h2>
                    <p className="text-sm text-slate-500">Masukkan API Key Anda untuk mulai menggunakan WebSlide.</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">AI API Key</label>
                    <div className="relative">
                      <input 
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="Paste your API key here..."
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono text-sm"
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300">
                        <Key size={18} />
                      </div>
                    </div>
                  </div>

                  <div className="bg-indigo-50/50 rounded-[24px] p-6 border border-indigo-100/50">
                    <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs mb-2">
                       <AlertCircle size={14} /> Keamanan Data
                    </div>
                    <p className="text-[11px] text-indigo-600/70 leading-relaxed">
                      API Key Anda disimpan secara lokal di browser dan tidak pernah dikirim ke server kami. Anda bisa mendapatkannya secara gratis di <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="underline font-bold hover:text-indigo-800">Google AI Studio</a>.
                    </p>
                  </div>

                  {/* Scan Model Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                       <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">AI Model Scanner</label>
                       <div className="flex items-center gap-3">
                         {availableModels.length > 0 && (
                           <button 
                             onClick={handleExportCSV}
                             className="text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-800 flex items-center gap-1 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 transition-all hover:shadow-sm"
                           >
                             <FileText size={12} />
                             Export CSV
                           </button>
                         )}
                         <button 
                           onClick={handleScanModels}
                           disabled={isScanningModels || !apiKey}
                           className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-800 disabled:opacity-50 flex items-center gap-1 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 transition-all hover:shadow-sm"
                         >
                           {isScanningModels ? <Loader2 size={12} className="animate-spin" /> : <Rocket size={12} />}
                           Scan Tersedia Model
                         </button>
                       </div>
                    </div>

                    {scanStatus && (
                      <div className={`p-3 rounded-xl text-[10px] font-bold ${scanStatus.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                        {scanStatus.msg}
                      </div>
                    )}

                    {availableModels.length > 0 && (
                      <div className="max-h-[200px] overflow-y-auto border border-slate-100 rounded-2xl bg-slate-50/30 p-2 custom-scrollbar space-y-2">
                        {availableModels.map((m, idx) => {
                          const nameStr = (m.name || '').toLowerCase();
                          const descStr = (m.description || '').toLowerCase();
                          const dispStr = (m.displayName || '').toLowerCase();
                          const isImageModel = nameStr.includes('image') || descStr.includes('image') || dispStr.includes('imagen');
                          return (
                            <div key={idx} className={`p-4 rounded-xl border bg-white shadow-sm transition-all hover:border-indigo-200 ${isImageModel ? 'border-emerald-200 ring-2 ring-emerald-50 font-bold' : 'border-slate-100'}`}>
                               <div className="flex justify-between items-start mb-2">
                                  <div>
                                    <span className="text-[11px] font-black text-slate-900 block">{m.displayName}</span>
                                    <span className="text-[9px] font-mono text-slate-400 bg-slate-50 px-1 py-0.5 rounded uppercase">{m.name}</span>
                                  </div>
                                  {isImageModel && (
                                    <span className="bg-emerald-600 text-white text-[8px] px-1.5 py-0.5 rounded-full uppercase font-black">Image Support</span>
                                  )}
                               </div>
                               <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed mb-2">{m.description}</p>
                               <div className="flex flex-wrap gap-1 mt-2">
                                 {(m.supportedGenerationMethods || []).map((method, midx) => (
                                   <span key={midx} className="text-[8px] px-1.5 py-0.5 bg-indigo-50 text-indigo-500 rounded font-bold uppercase tracking-tighter">
                                     {method}
                                   </span>
                                 ))}
                               </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <button 
                    onClick={() => setShowKeyInput(false)}
                    className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 active:scale-[0.98]"
                  >
                    Simpan Konfigurasi
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Stepper with focused width */}
                <div className="bg-white/40 backdrop-blur-md p-4 rounded-[32px] border border-white max-w-4xl w-full">
                  <div className="flex justify-between px-4">
                    <StepperItem num={1} label="Mulai" active={['category', 'upload'].includes(currentStep)} done={['skeleton', 'generating', 'done'].includes(currentStep)} />
                    <div className="h-px bg-slate-200 flex-1 my-auto mx-4 opacity-40"></div>
                    <StepperItem num={2} label="Outline" active={currentStep === 'skeleton'} done={['generating', 'done'].includes(currentStep)} />
                    <div className="h-px bg-slate-200 flex-1 my-auto mx-4 opacity-40"></div>
                    <StepperItem num={3} label="Magic" active={currentStep === 'generating'} done={currentStep === 'done'} />
                    <div className="h-px bg-slate-200 flex-1 my-auto mx-4 opacity-40"></div>
                    <StepperItem num={4} label="Selesai" active={currentStep === 'done'} done={false} />
                  </div>
                </div>

                {/* Main Workspace Frame - Centered and Clean */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  <div className="lg:col-span-8 xl:col-span-9 space-y-8">
                  <div className="transition-all duration-500">
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileChange} 
                      className="hidden" 
                      accept=".pdf"
                    />

                    {currentStep === 'category' && (
                      <div className="flex flex-col items-center">
                        <div className="max-w-3xl w-full text-center mb-12">
                          <h2 className="text-4xl lg:text-5xl font-black text-slate-900 mb-6 leading-tight">
                            Mau bikin <span className="text-indigo-600">WebSlide</span> apa hari ini?
                          </h2>
                          <div className="relative group" id="tour-quick-input">
                            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-[32px] blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
                            <div className="relative flex bg-white rounded-[32px] shadow-2xl shadow-indigo-100/50 p-2 border border-slate-100">
                              <textarea 
                                value={quickPrompt}
                                onChange={(e) => setQuickPrompt(e.target.value)}
                                placeholder={placeholderText}
                                className="flex-1 bg-transparent px-6 py-4 text-lg text-slate-900 placeholder:text-slate-300 focus:outline-none resize-none h-24 font-medium"
                              />
                              <div className="flex flex-col justify-end p-2">
                                <button
                                  id="tour-generate-btn"
                                  onClick={handleQuickGenerate}
                                  disabled={!quickPrompt.trim() || isProcessing}
                                  className="bg-indigo-600 text-white p-4 rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95 disabled:opacity-50 disabled:grayscale"
                                >
                                  {isProcessing ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Sparkles size={24} />}
                                </button>
                              </div>
                            </div>
                          </div>
                          
                          {/* AI Illustration Toggle (Targeting Imagen 4) */}
                          <div className="mt-6 flex justify-center" id="tour-ai-toggle">
                            <button 
                              onClick={() => setIsImageGenEnabled(!isImageGenEnabled)}
                              className={`group relative flex items-center gap-4 px-6 py-4 rounded-[24px] border transition-all duration-500 overflow-hidden ${
                                isImageGenEnabled 
                                ? 'bg-emerald-50 border-emerald-200 shadow-lg shadow-emerald-100/50' 
                                : 'bg-white border-slate-100 hover:border-indigo-200 hover:shadow-xl'
                              }`}
                            >
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-500 ${
                                isImageGenEnabled ? 'bg-emerald-600 text-white rotate-[15deg]' : 'bg-slate-100 text-slate-400'
                              }`}>
                                <Palette size={24} />
                              </div>
                              <div className="text-left">
                                <div className="flex items-center gap-2">
                                  <span className={`text-sm font-black uppercase tracking-widest ${isImageGenEnabled ? 'text-emerald-700' : 'text-slate-500'}`}>
                                    ✨ AI Illustrations (Imagen 4)
                                  </span>
                                  <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${isImageGenEnabled ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                    EXPERIMENTAL
                                  </span>
                                </div>
                                <p className={`text-[10px] font-bold ${isImageGenEnabled ? 'text-emerald-600/70' : 'text-slate-400'}`}>
                                  {isImageGenEnabled ? '⚡ Proses lebih lama (+30-60 detik). Kualitas Ultra.' : 'Hasil standar (SVG). Aktifkan untuk ilustrasi kustom.'}
                                </p>
                              </div>
                              <div className={`ml-4 w-12 h-6 rounded-full relative transition-all duration-500 ${isImageGenEnabled ? 'bg-emerald-600' : 'bg-slate-200'}`}>
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-500 ${isImageGenEnabled ? 'left-7' : 'left-1'}`} />
                              </div>
                            </button>
                          </div>
                          
                          <div className="mt-8 flex flex-wrap justify-center gap-3">
                            {['Materi Kuliah', 'Laporan Bisnis', 'Startup Pitch', 'Panduan Instalasi'].map(s => (
                              <button 
                                key={s}
                                onClick={() => setQuickPrompt(`Buat materi ${s} tentang `)}
                                className="px-5 py-2.5 rounded-full bg-slate-100 text-slate-500 text-xs font-bold hover:bg-indigo-50 hover:text-indigo-600 transition-all border border-transparent hover:border-indigo-100"
                              >
                                + {s}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="w-full flex flex-col items-center gap-6">
                           <div className="flex items-center gap-4 w-full max-w-lg">
                             <div className="h-px bg-slate-200 flex-1"></div>
                             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white px-4">Atau Gunakan Mode Lanjutan</span>
                             <div className="h-px bg-slate-200 flex-1"></div>
                           </div>

                           <button 
                             onClick={() => setInputMode(inputMode === 'quick' ? 'advanced' : 'quick')}
                             className={`px-10 py-4 rounded-2xl font-bold transition-all flex items-center gap-3 ${
                               inputMode === 'advanced' ? 'bg-indigo-50 text-indigo-600 shadow-inner' : 'bg-white border border-slate-100 text-slate-600 hover:shadow-lg'
                             }`}
                           >
                             <Settings size={20} />
                             {inputMode === 'advanced' ? 'Tutup Mode Lanjutan' : 'Pilihan PDF & Kategori (Manual)'}
                           </button>

                           {inputMode === 'advanced' && (
                             <div className="w-full max-w-5xl animate-in slide-in-from-top-4 duration-500">
                               <div className="bg-white rounded-[40px] border border-slate-100 p-8 shadow-sm">
                                  <div className="mb-8">
                                    <h3 className="text-xl font-bold text-slate-900">Advanced Mode: Pilih Kategori & Upload</h3>
                                    <p className="text-sm text-slate-500">Tentukan konteks secara manual untuk hasil yang lebih spesifik.</p>
                                  </div>
                                  
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <CategoryCard 
                                      icon={<BookOpen size={20} />} 
                                      title="Pembelajaran" 
                                      desc="Materi kuliah & modul sekolah."
                                      color="indigo"
                                      selected={selectedCategory === 'Pembelajaran'}
                                      onClick={() => setSelectedCategory('Pembelajaran')}
                                    />
                                    <CategoryCard 
                                      icon={<FileText size={20} />} 
                                      title="Skripsi / TA" 
                                      desc="Formal & riset mendalam."
                                      color="blue"
                                      selected={selectedCategory === 'Skripsi / TA'}
                                      onClick={() => setSelectedCategory('Skripsi / TA')}
                                    />
                                    <CategoryCard 
                                      icon={<Rocket size={20} />} 
                                      title="Pitching Program" 
                                      desc="Persuasif & komersial."
                                      color="amber"
                                      selected={selectedCategory === 'Pitching Program'}
                                      onClick={() => setSelectedCategory('Pitching Program')}
                                    />
                                    <CategoryCard 
                                      icon={<Building2 size={20} />} 
                                      title="Corporation" 
                                      desc="Bisnis & laporan KPI."
                                      color="slate"
                                      selected={selectedCategory === 'Corporation'}
                                      onClick={() => setSelectedCategory('Corporation')}
                                    />
                                  </div>

                                  <div className="mt-8 pt-6 border-t border-slate-50 flex justify-end">
                                    <button 
                                      onClick={() => setCurrentStep('upload')}
                                      className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center gap-2"
                                    >
                                      Lanjut ke Upload PDF <ArrowRight size={20} />
                                    </button>
                                  </div>
                               </div>
                             </div>
                           )}
                        </div>
                      </div>
                    )}

                    {currentStep === 'upload' && (
                      <div className="flex flex-col gap-6">
                        <div 
                          onClick={triggerFileUpload}
                          className={`
                            border-2 border-dashed rounded-[40px] p-12 flex flex-col items-center justify-center transition-all cursor-pointer min-h-[440px] group
                            ${isProcessing ? 'border-indigo-400 bg-indigo-50/20 shadow-inner' : 'border-slate-200 bg-white hover:border-indigo-400 hover:bg-slate-50/30 hover:shadow-2xl hover:shadow-indigo-500/5'}
                          `}
                        >
                          {processStatus === 'idle' && (
                            <div className="text-center">
                              <div className="w-24 h-24 bg-slate-50 rounded-[32px] flex items-center justify-center mb-8 mx-auto -rotate-3 group-hover:rotate-0 group-hover:bg-indigo-50 group-hover:scale-110 transition-all duration-500">
                                <FileUp size={48} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
                              </div>
                              <h3 className="text-2xl font-bold text-slate-900 mb-3 tracking-tight">Klik untuk mengunggah PDF</h3>
                              <p className="text-slate-500 text-center max-w-sm mb-12 mx-auto leading-relaxed font-medium">
                                Unggah modul Anda. AI akan mengidentifikasi bab/outline secara cerdas sebelum menyusun slide.
                              </p>
                              {!apiKey && (
                                <div className="flex items-center gap-2 text-amber-700 bg-amber-50 px-5 py-3 rounded-2xl text-xs font-bold mb-8 justify-center border border-amber-100 animate-pulse">
                                  <AlertCircle size={16} />
                                  API Key belum dikonfigurasi
                                </div>
                              )}
                              <button className="bg-indigo-600 text-white px-12 py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 active:scale-95">
                                Pilih File PDF
                              </button>
                            </div>
                          )}

                          {(processStatus === 'extracting' || processStatus === 'analyzing') && (
                            <div className="flex flex-col items-center text-center">
                              <div className="relative mb-10">
                                <div className="w-32 h-32 border-4 border-indigo-50 border-t-indigo-600 rounded-full animate-spin"></div>
                                <Presentation className="w-12 h-12 text-indigo-400 absolute top-1/2 left-1/2 -mt-6 -ml-6 animate-pulse" />
                              </div>
                              <h3 className="text-2xl font-bold text-slate-900 mb-3">
                                {processStatus === 'extracting' ? 'Membaca Isi PDF...' : 'AI Sedang Menganalisis Struktur...'}
                              </h3>
                              <p className="text-slate-500 max-w-xs mx-auto text-sm leading-relaxed font-medium">
                                Mohon tunggu sebentar, kami sedang memetakan bab dan materi utama dari dokumen Anda.
                              </p>
                            </div>
                          )}

                          {processStatus === 'error' && <ErrorView message={errorMessage} onRetry={() => setProcessStatus('idle')} />}
                        </div>
                      </div>
                    )}

                    {currentStep === 'skeleton' && (
                      <div className="bg-white rounded-[40px] border border-slate-100 p-8 shadow-sm">
                        <div className="flex items-center justify-between mb-8">
                          <div>
                            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Skeleton Preview</h2>
                            <p className="text-sm text-slate-500 font-medium">AI mendeteksi bab berikut. Pilih yang ingin Anda buat slidenya.</p>
                          </div>
                          <button 
                            onClick={startGeneration}
                            className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center gap-2"
                          >
                             Generate WebSlide <ArrowRight size={18} />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {chapters.map((c) => (
                            <ChapterCard 
                               key={c.id} 
                               chapter={c} 
                               selected={selectedChapters.includes(c.id)}
                               onToggle={() => {
                                 if (selectedChapters.includes(c.id)) {
                                   setSelectedChapters(prev => prev.filter(id => id !== c.id));
                                 } else {
                                   setSelectedChapters(prev => [...prev, c.id]);
                                 }
                               }}
                            />
                          ))}
                        </div>
                         
                         {/* Template Selection */}
                         <div className="mt-8 border-t border-slate-50 pt-8">
                           <div className="flex items-center gap-3 mb-6">
                             <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                               <Palette size={20} />
                             </div>
                             <div>
                               <h3 className="font-bold text-slate-900">Pilih Gaya Visual (Template)</h3>
                               <p className="text-xs text-slate-500">Pilih tema yang paling sesuai dengan audiens Anda.</p>
                             </div>
                           </div>
                           
                           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                             {TEMPLATES.map((tmpl) => (
                               <button
                                 key={tmpl.id}
                                 onClick={() => setSelectedTemplate(tmpl.id)}
                                 className={`p-4 rounded-3xl border-2 transition-all text-left flex flex-col gap-3 group ${
                                   selectedTemplate === tmpl.id 
                                     ? 'border-indigo-600 bg-indigo-50/30' 
                                     : 'border-slate-100 hover:border-indigo-200 bg-white'
                                 }`}
                               >
                                 <div className="flex justify-between items-start">
                                   <div className={`p-2 rounded-xl ${
                                     selectedTemplate === tmpl.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600'
                                   }`}>
                                     <tmpl.icon size={18} />
                                   </div>
                                   <div className="flex gap-1">
                                     {tmpl.colors.map((c, i) => (
                                       <div key={i} className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c }} />
                                     ))}
                                   </div>
                                 </div>
                                 <div>
                                   <div className="font-bold text-slate-900 text-sm">{tmpl.name}</div>
                                   <p className="text-[10px] text-slate-500 leading-tight mt-1">{tmpl.description}</p>
                                 </div>
                               </button>
                             ))}
                           </div>
                         </div>

                         {/* Add-Ons Selection */}
                         <div className="mt-8 border-t border-slate-50 pt-8">
                           <div className="flex items-center gap-3 mb-6">
                             <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                               <Sparkles size={20} />
                             </div>
                             <div>
                               <h3 className="font-bold text-slate-900">Fitur Tambahan (Add-Ons)</h3>
                               <p className="text-xs text-slate-500">Tingkatkan WebSlide Anda dengan fitur interaktif tambahan.</p>
                             </div>
                           </div>
                           
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <button
                               onClick={() => setIncludeQuiz(!includeQuiz)}
                               className={`p-5 rounded-[32px] border-2 transition-all text-left flex items-center gap-4 group ${
                                 includeQuiz 
                                   ? 'border-emerald-600 bg-emerald-50/30' 
                                   : 'border-slate-100 hover:border-emerald-200 bg-white'
                               }`}
                             >
                               <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                                 includeQuiz ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' : 'bg-slate-100 text-slate-400 group-hover:bg-emerald-100 group-hover:text-emerald-600'
                               }`}>
                                 <FileText size={20} />
                               </div>
                               <div className="flex-1">
                                  <div className="flex items-center justify-between mb-0.5">
                                    <span className="font-bold text-slate-900 text-sm">Smart Evaluation (Kuis)</span>
                                    {includeQuiz && <CheckCircle2 size={16} className="text-emerald-600" />}
                                  </div>
                                  <p className="text-[10px] text-slate-500 leading-tight">AI akan menyusun 10 soal evaluasi pilihan ganda di akhir materi.</p>
                               </div>
                             </button>
                             
                             <div className="p-5 rounded-[32px] border-2 border-slate-50 bg-slate-50/50 flex items-center gap-4 grayscale opacity-50 cursor-not-allowed">
                               <div className="w-12 h-12 rounded-2xl bg-slate-200 text-slate-400 flex items-center justify-center">
                                 <List size={20} />
                               </div>
                               <div className="flex-1">
                                  <div className="font-bold text-slate-900 text-sm">AI Glossary (Soon)</div>
                                  <p className="text-[10px] text-slate-500 leading-tight">Daftar istilah penting yang muncul secara otomatis di panel samping.</p>
                               </div>
                             </div>
                           </div>
                         </div>

                        <div className="mt-10 pt-6 border-t border-slate-50 flex justify-between items-center text-sm text-slate-400 font-medium">
                          <p>Total terpilih: <span className="text-indigo-600 font-bold">{selectedChapters.length} Bab</span></p>
                          <button onClick={resetFlow} className="hover:text-slate-600 transition-colors">Batal & Ganti File</button>
                        </div>
                      </div>
                    )}

                    {currentStep === 'generating' && (
                      <div className="bg-white rounded-[40px] border border-slate-100 p-12 shadow-sm flex flex-col items-center justify-center min-h-[480px]">
                        <div className="relative mb-12">
                           <div className="w-32 h-32 border-4 border-indigo-50 border-t-indigo-600 rounded-full animate-spin"></div>
                           <Sparkles className="w-12 h-12 text-indigo-400 absolute top-1/2 left-1/2 -mt-6 -ml-6 animate-pulse" />
                        </div>
                        <div className="w-full max-w-xs bg-slate-100 h-2 rounded-full mb-8 overflow-hidden">
                          <div 
                            className="h-full bg-indigo-600 transition-all duration-500 shadow-[0_0_10px_rgba(79,70,229,0.3)]" 
                            style={{ width: `${progressPercent}%` }}
                          ></div>
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900 mb-4 text-center tracking-tight">{currentProgressText || 'Menenun Materi Menjadi Slide...'}</h3>
                        <p className="text-slate-500 text-center max-w-sm font-medium leading-relaxed opacity-70">
                          Jangan tutup halaman ini. AI sedang bekerja keras menyusun WebSlide terbaik untuk Anda.
                        </p>
                      </div>
                    )}

                    {currentStep === 'done' && (
                      <div className="bg-white rounded-[40px] border border-slate-100 p-12 shadow-sm flex flex-col items-center justify-center min-h-[480px]">
                         <div className="w-24 h-24 bg-emerald-50 rounded-[32px] flex items-center justify-center mb-8 rotate-3 shadow-sm animate-in zoom-in-75 duration-500">
                            <CheckCircle2 size={48} className="text-emerald-500" />
                          </div>
                          <h3 className="text-3xl font-bold text-slate-900 mb-3 tracking-tight">WebSlide Siap!</h3>
                          <p className="text-slate-500 mb-12 text-center max-w-sm font-medium leading-relaxed">
                             Berhasil menghasilkan WebSlide lengkap dengan materi terpilih dan evaluasi interaktif.
                          </p>

                          <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
                            <button
                               onClick={() => setShowPreview(true)}
                               className="bg-indigo-600 text-white px-6 py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-xl shadow-indigo-100 hover:-translate-y-1"
                            >
                               <Play size={18} fill="currentColor" /> Preview
                            </button>
                            <button
                              onClick={resetFlow}
                              className="bg-slate-100 text-slate-600 px-6 py-4 rounded-2xl font-bold hover:bg-slate-200 transition-all border border-slate-200"
                            >
                              Buat Baru
                            </button>
                          </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Sidebar - Dynamic Info & Recent */}
                <div className="lg:col-span-4 xl:col-span-3 space-y-6">
                  <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                       <h4 className="font-bold text-slate-900 text-xs uppercase tracking-widest">Riwayat WebSlide</h4>
                       <span className="text-[10px] text-indigo-600 px-2.5 py-1 bg-indigo-50 rounded-lg font-black">{history.length} FILES</span>
                    </div>
                    <div className="space-y-1">
                      {history.length === 0 ? (
                        <div className="text-center py-6">
                          <p className="text-sm text-slate-400 font-medium">Belum ada riwayat</p>
                          <p className="text-xs text-slate-300 mt-1">WebSlide yang dibuat akan muncul di sini</p>
                        </div>
                      ) : (
                        history.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-2xl transition-all cursor-pointer group border border-transparent hover:border-slate-100"
                            onClick={() => {
                              setSlideData(item.data);
                              setGeneratedHtml(item.html);
                              setSelectedTemplate(item.templateId);
                              setShowPreview(true);
                            }}
                          >
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-50 text-emerald-500 shrink-0 shadow-sm">
                              <Presentation size={18} />
                            </div>
                            <div className="overflow-hidden flex-1 min-w-0">
                              <p className="text-sm font-bold truncate text-slate-700 group-hover:text-indigo-700 transition-colors">{item.title}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <p className="text-[11px] text-slate-400 font-medium">{formatRelativeTime(item.createdAt)}</p>
                                <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                                <p className="text-[11px] text-slate-400">{item.slideCount} slide</p>
                              </div>
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); removeFromHistory(item.id); refreshHistory(); }}
                              className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400 transition-all p-1 rounded-lg"
                              title="Hapus dari riwayat"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-8 rounded-[32px] text-white shadow-2xl shadow-indigo-200 relative overflow-hidden group">
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-700"></div>
                    
                    <div className="relative z-10">
                      <p className="font-bold text-indigo-200 text-[10px] mb-2 flex items-center gap-2 uppercase tracking-widest">
                        <Sparkles size={12} />
                        AI Power
                      </p>
                      <h4 className="font-bold text-xl mb-4 leading-tight tracking-tight">Engine AI terbaik dan terbaru</h4>
                      <p className="text-xs text-indigo-100/80 mb-8 leading-relaxed font-medium">
                        2 WebSlide per hari, 60 WebSlide per bulan untuk akun Pro tanpa dibatasi per hari.
                      </p>
                      <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-md border border-white/10">
                         <div className="flex items-center justify-between mb-2 text-white">
                            <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Limit Harian</span>
                            <span className="text-[10px] font-black">{getQuota().count} / 2</span>
                         </div>
                         <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-white rounded-full shadow-[0_0_8px_white] transition-all duration-1000" 
                              style={{ width: `${(getQuota().count / 2) * 100}%` }}
                            ></div>
                         </div>
                      </div>
                    </div>
                  </div>
            </div>
          </div>
        </>
      )}
    </div>
  </div>
</main>

      {/* Slide Preview Modal */}
          {showPreview && generatedHtml && slideData && (
        <WebSlidePreview
          html={generatedHtml}
          data={slideData}
          title={slideData?.title || 'WebSlide'}
          templateId={selectedTemplate}
          onClose={() => setShowPreview(false)}
          onUpdateData={handleUpdateSlideData}
          onRegenerateImage={handleRegenerateImage}
          tourStep={previewTourStep}
          totalTourSteps={TOTAL_TOUR_STEPS}
          globalTourStep={globalTourStep}
          onTourNext={handleTourNext}
          onTourBack={handleTourBack}
          onTourSkip={handleTourSkip}
        />
      )}
    </div>
    </>
  );
}

function SidebarItem({ icon, label, active = false, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void }) {
  return (
    <div 
      onClick={onClick}
      className={`
        flex items-center gap-3 px-5 py-3.5 rounded-2xl cursor-pointer transition-all duration-300
        ${active ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 group'}
      `}
    >
      <div className={`${active ? 'text-indigo-600' : 'text-slate-400 group-hover:text-indigo-400'} transition-colors`}>{icon}</div>
      <span className="text-sm">{label}</span>
      {active && <div className="ml-auto w-1.5 h-6 rounded-full bg-indigo-600 animate-in fade-in slide-in-from-right-1"></div>}
    </div>
  );
}

function StepperItem({ num, label, active, done }: { num: number, label: string, active: boolean, done: boolean }) {
  return (
    <div className={`flex items-center gap-2 transition-all duration-500 ${active ? 'scale-110' : 'opacity-60'}`}>
      <div className={`
        w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold border
        ${done ? 'bg-indigo-600 border-indigo-600 text-white' : active ? 'bg-white border-indigo-600 text-indigo-600' : 'bg-white border-slate-200 text-slate-400'}
      `}>
        {done ? <Check size={14} /> : num}
      </div>
      <span className={`text-[11px] font-bold uppercase tracking-wider ${active ? 'text-indigo-600' : 'text-slate-400'}`}>{label}</span>
    </div>
  );
}

function CategoryDropdown({ value, onChange }: { value: string, onChange: (val: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selected = CATEGORIES.find(c => c.id === value) || CATEGORIES[0];

  return (
    <div className="relative" ref={containerRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 bg-slate-100 hover:bg-white hover:shadow-xl hover:shadow-indigo-50/50 border border-transparent hover:border-indigo-100 px-4 py-2.5 rounded-2xl transition-all duration-300 group"
      >
        <div className={`p-1.5 rounded-lg bg-white shadow-sm text-indigo-600 transition-colors group-hover:text-indigo-700`}>
          {selected.icon({ size: 16 })}
        </div>
        <span className="text-sm font-black text-slate-700 group-hover:text-indigo-700">Mode: {selected.label}</span>
        <ChevronDown size={16} className={`text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-64 bg-white/80 backdrop-blur-xl border border-white rounded-[24px] shadow-2xl shadow-indigo-100/50 z-50 py-3 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="px-4 py-2 mb-1">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pilih Konteks AI</p>
          </div>
          <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  onChange(cat.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 transition-all hover:bg-indigo-50/50 group/item ${value === cat.id ? 'bg-indigo-50/30' : ''}`}
              >
                <div className={`p-2 rounded-xl transition-colors ${value === cat.id ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-400 group-hover/item:bg-indigo-100 group-hover/item:text-indigo-600'}`}>
                  {cat.icon({ size: 16 })}
                </div>
                <div className="text-left">
                  <p className={`text-sm font-bold ${value === cat.id ? 'text-indigo-600' : 'text-slate-700 group-hover/item:text-indigo-600'}`}>
                    {cat.label}
                  </p>
                </div>
                {value === cat.id && (
                  <Check size={14} className="ml-auto text-indigo-600" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CategoryCard({ icon, title, desc, color, selected, onClick }: { 
  icon: React.ReactNode, 
  title: string, 
  desc: string, 
  color: string,
  selected: boolean, 
  onClick: () => void 
}) {
  const colorMap: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-600',
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    slate: 'bg-slate-100 text-slate-700',
    emerald: 'bg-emerald-50 text-emerald-600',
    rose: 'bg-rose-50 text-rose-600',
    cyan: 'bg-cyan-50 text-cyan-600',
  };

  const activeBorder = {
    indigo: 'border-indigo-600 bg-indigo-50/30',
    blue: 'border-blue-600 bg-blue-50/30',
    amber: 'border-amber-600 bg-amber-50/30',
    slate: 'border-slate-600 bg-slate-100',
    emerald: 'border-emerald-600 bg-emerald-50/30',
    rose: 'border-rose-600 bg-rose-50/30',
    cyan: 'border-cyan-600 bg-cyan-50/30',
  }[color] || 'border-indigo-600 bg-indigo-50/30';

  return (
    <div 
      onClick={onClick}
      className={`
        p-6 rounded-[32px] border transition-all cursor-pointer group relative flex flex-col items-start
        ${selected ? activeBorder : 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-lg hover:shadow-slate-100'}
      `}
    >
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 ${colorMap[color]}`}>
        {icon}
      </div>
      <h4 className={`text-lg font-bold mb-2 transition-colors ${selected ? 'text-slate-900' : 'text-slate-800'}`}>{title}</h4>
      <p className="text-xs text-slate-500 leading-relaxed font-medium">{desc}</p>
      
      {selected && (
        <div className="absolute top-4 right-4 w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center animate-in zoom-in duration-300">
          <Check size={14} />
        </div>
      )}
    </div>
  );
}

function ChapterCard({ chapter, selected, onToggle }: { chapter: Chapter, selected: boolean, onToggle: () => void }) {
  return (
    <div 
      onClick={onToggle}
      className={`
        p-5 rounded-3xl border transition-all cursor-pointer group relative
        ${selected ? 'border-indigo-600 bg-indigo-50/30' : 'border-slate-100 bg-white hover:border-indigo-200'}
      `}
    >
      <div className="flex items-start justify-between mb-3">
        <h4 className={`font-bold transition-colors ${selected ? 'text-indigo-700' : 'text-slate-800'}`}>{chapter.title}</h4>
        <div className={`
          w-6 h-6 rounded-full flex items-center justify-center transition-all
          ${selected ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-300 group-hover:bg-slate-100'}
        `}>
          {selected && <Check size={14} />}
        </div>
      </div>
      <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed mb-4">{chapter.summary}</p>
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-md uppercase tracking-tight">Est. {chapter.suggestedSlides} slides</span>
      </div>
    </div>
  );
}

function ErrorView({ message, onRetry }: { message: string, onRetry: () => void }) {
  // Detect if this is an API key issue to show a settings hint
  const isApiKeyError = message.toLowerCase().includes('api key') || message.toLowerCase().includes('settings');

  return (
    <div className="flex flex-col items-center text-center px-4">
      <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mb-6 shadow-sm">
        <span className="text-4xl">⚠️</span>
      </div>
      <h3 className="text-xl font-bold text-slate-900 mb-2">Oops, ada yang tidak beres</h3>
      <div className="bg-red-50 border border-red-100 rounded-2xl px-5 py-4 mb-6 max-w-sm">
        <p className="text-red-600 text-sm font-medium leading-relaxed">{message}</p>
      </div>
      {isApiKeyError && (
        <p className="text-xs text-slate-400 mb-4">
          💡 Buka menu <span className="font-bold text-indigo-500">Settings</span> di sidebar untuk memperbarui API Key.
        </p>
      )}
      <button
        onClick={(e) => { e.stopPropagation(); onRetry(); }}
        className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-bold transition-all hover:scale-105 hover:bg-indigo-700 shadow-lg shadow-indigo-100"
      >
        ↩ Coba Lagi
      </button>
    </div>
  );
}


function RecentItem({ title, date, status = 'idle' }: { title: string, date: string, status?: 'success' | 'idle' }) {
  return (
    <div className="flex items-center gap-3 p-4 hover:bg-slate-50 rounded-2xl transition-all cursor-pointer group border border-transparent hover:border-slate-100">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors shadow-sm ${status === 'success' ? 'bg-emerald-50 text-emerald-500' : 'bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500'}`}>
        <Presentation size={20} />
      </div>
      <div className="overflow-hidden flex-1">
        <p className={`text-sm font-bold truncate transition-colors ${status === 'success' ? 'text-slate-900' : 'text-slate-700 group-hover:text-indigo-700'}`}>{title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-[11px] text-slate-400 font-medium">{date}</p>
          {status === 'success' && <div className="w-1 h-1 rounded-full bg-slate-300"></div>}
          {status === 'success' && <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-tight">Terbit</p>}
        </div>
      </div>
      <ChevronRight size={14} className="text-slate-300 group-hover:translate-x-1 group-hover:text-indigo-400 transition-all" />
    </div>
  );
}

export default App;
