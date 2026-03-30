import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  X, 
  Download, 
  Maximize2, 
  Edit3, 
  ChevronDown, 
  ChevronUp, 
  RefreshCw, 
  Palette,
  Layout as LayoutIcon,
  Check,
  FileText,
  Presentation,
  Loader2
} from 'lucide-react';
import { WebSlideJson } from '../utils/geminiApi';
import { TEMPLATES } from '../config/templates';
import { exportToPdf } from '../utils/exportPdf';
import { exportToPptx } from '../utils/exportPptx';
import { TourTooltip, TourStepConfig } from './TourTooltip';

interface WebSlidePreviewProps {
  html: string;
  data: WebSlideJson;
  title: string;
  templateId: string;
  onClose: () => void;
  onUpdateData: (newData: WebSlideJson, newTemplateId?: string) => void;
  onRegenerateImage: (index: number) => void;
  // Tour props (optional — only present when tour is active)
  tourStep?: number;       // local step index 0-3 within preview, -1 = hidden
  totalTourSteps?: number;
  globalTourStep?: number; // global index for progress
  onTourNext?: () => void;
  onTourBack?: () => void;
  onTourSkip?: () => void;
}

export function WebSlidePreview({
  html,
  data,
  title,
  templateId,
  onClose,
  onUpdateData,
  onRegenerateImage,
  tourStep = -1,
  totalTourSteps = 10,
  globalTourStep = -1,
  onTourNext,
  onTourBack,
  onTourSkip,
}: WebSlidePreviewProps) {
  const PREVIEW_TOUR_STEPS: TourStepConfig[] = [
    {
      targetId: 'tour-slide-sidebar',
      title: 'Daftar & Editor Slide 📝',
      message: 'Klik slide mana saja di sini untuk melompat langsung. Editor konten tampil otomatis di bawah — klik judul atau poin untuk mengedit.',
      position: 'right',
      padding: 6,
    },
    {
      targetId: 'tour-iframe-area',
      title: 'Tampilan Interaktif 📺',
      message: 'Ini tampilan WebSlide Anda yang sesungguhnya. Gunakan tombol ← → di dalam slide atau tekan keyboard Arrow Key untuk navigasi.',
      position: 'left',
      padding: 6,
    },
    {
      targetId: 'tour-export-btns',
      title: 'Download Hasil ⬇️',
      message: 'Unduh WebSlide dalam 3 format: HTML untuk web interaktif, PDF untuk dokumen, atau PPTX untuk diedit di PowerPoint.',
      position: 'bottom',
      padding: 6,
    },
    {
      targetId: 'tour-present-btn',
      title: 'Mode Presentasi 🎤',
      message: 'Klik untuk masuk fullscreen mode. Gunakan → untuk navigasi, tekan F untuk toggle layar penuh, ESC untuk keluar.',
      position: 'bottom',
      padding: 6,
    },
  ];
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState<number | null>(0);
  const [showEditor, setShowEditor] = useState(true);
  const [activeTab, setActiveTab] = useState<'content' | 'theme'>('content');
  const [iframeSrc, setIframeSrc] = useState(html);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastInternalIndex = useRef<number | null>(0); // Sync tracker to prevent message echo
  const slideItemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [exportStatus, setExportStatus] = useState<{
    type: 'pdf' | 'pptx';
    current: number;
    total: number;
  } | null>(null);
  const [isPresentationMode, setIsPresentationMode] = useState(false);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setIframeSrc(html);
    }, 600);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [html]);

  // Listen for slide change messages FROM the iframe (user navigated via arrow buttons)
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'WEBSLIDE_CHANGE') {
        const idx = e.data.index;
        if (idx < data.slides.length) {
          lastInternalIndex.current = idx; // Update sync tracker first
          setActiveSlideIndex(idx);
          setTimeout(() => {
            slideItemRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }, 50);
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [data.slides.length]);

  // Send GO_TO_SLIDE command TO the iframe when sidebar item is clicked
  // Loop prevention is handled on the iframe side via notifyParent flag
  useEffect(() => {
    // Only send GO_TO command if the change came from the parent (e.g. sidebar click)
    // and NOT from the iframe echoing its own state.
    if (activeSlideIndex !== null && iframeRef.current?.contentWindow && activeSlideIndex !== lastInternalIndex.current) {
      iframeRef.current.contentWindow.postMessage(
        { type: 'WEBSLIDE_GO_TO', index: activeSlideIndex },
        '*'
      );
    }
    // Always update the tracker to the current target after potential sync
    lastInternalIndex.current = activeSlideIndex;
  }, [activeSlideIndex]);

  // 3.3 Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      const isTyping = tag === 'input' || tag === 'textarea';

      // Esc — exit presentation mode or close modal
      if (e.key === 'Escape') {
        if (isPresentationMode) {
          setIsPresentationMode(false);
        } else {
          onClose();
        }
        return;
      }

      // F — toggle presentation/fullscreen
      if (e.key === 'f' || e.key === 'F') {
        if (!isTyping) {
          setIsPresentationMode((prev) => !prev);
          return;
        }
      }

      // Ctrl+D — download HTML
      if (e.ctrlKey && e.key === 'd') {
        e.preventDefault();
        handleDownload();
        return;
      }

      // Arrow keys — navigate slides (only when not typing in input)
      if (!isTyping) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          setActiveSlideIndex((prev) => {
            const next = (prev ?? -1) + 1;
            return next < data.slides.length ? next : prev;
          });
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          setActiveSlideIndex((prev) => {
            const next = (prev ?? 1) - 1;
            return next >= 0 ? next : prev;
          });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPresentationMode, data.slides.length, onClose]);

  const handleDownload = () => {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g, '_')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFullscreen = () => {
    if (iframeRef.current) {
      if (iframeRef.current.requestFullscreen) {
        iframeRef.current.requestFullscreen();
      } else {
        const anyIframe = iframeRef.current as any;
        if (anyIframe.webkitRequestFullscreen) anyIframe.webkitRequestFullscreen();
        else if (anyIframe.msRequestFullscreen) anyIframe.msRequestFullscreen();
      }
    }
  };

  const handleExportPdf = async () => {
    if (exportStatus) return;
    try {
      setExportStatus({ type: 'pdf', current: 0, total: data.slides.length });
      await exportToPdf(html, title, (current, total) => {
        setExportStatus({ type: 'pdf', current, total });
      });
    } catch (err: any) {
      alert(`Gagal export PDF: ${err.message || 'Terjadi kesalahan'}`);
    } finally {
      setExportStatus(null);
    }
  };

  const handleExportPptx = async () => {
    if (exportStatus) return;
    try {
      setExportStatus({ type: 'pptx', current: 0, total: data.slides.length });
      await exportToPptx(data, templateId, (current, total) => {
        setExportStatus({ type: 'pptx', current, total });
      });
    } catch (err: any) {
      alert(`Gagal export PPTX: ${err.message || 'Terjadi kesalahan'}`);
    } finally {
      setExportStatus(null);
    }
  };

  const updateSlideTitle = (idx: number, newTitle: string) => {
    const newData = { ...data };
    newData.slides[idx].title = newTitle;
    onUpdateData(newData);
  };

  const updateSlideContent = (slideIdx: number, itemIdx: number, val: string) => {
    const newData = { ...data };
    newData.slides[slideIdx].content[itemIdx] = val;
    onUpdateData(newData);
  };

  const addContentItem = (slideIdx: number) => {
    const newData = { ...data };
    newData.slides[slideIdx].content.push('Poin baru...');
    onUpdateData(newData);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-3xl flex flex-col font-outfit animate-in fade-in duration-500">

      {/* ── Presentation Mode Fullscreen ── */}
      {isPresentationMode && (
        <div className="absolute inset-0 z-[300] bg-black flex flex-col">
          <iframe
            src="about:blank"
            srcDoc={iframeSrc}
            className="flex-1 w-full border-none"
            allow="fullscreen"
          />

          {/* Exit + Navigation hint */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/60 backdrop-blur-md px-6 py-3 rounded-2xl text-white text-xs font-medium border border-white/10 opacity-30 hover:opacity-100 transition-opacity">
            <span>⬅️ ➡️ Navigasi</span>
            <div className="w-px h-4 bg-white/30" />
            <span>F Fullscreen</span>
            <div className="w-px h-4 bg-white/30" />
            <span
              className="font-bold text-red-400 cursor-pointer hover:text-red-300"
              onClick={() => setIsPresentationMode(false)}
            >ESC Keluar</span>
          </div>

          {/* ── Floating Download Menu (Presentation Mode) ── */}
          <PresentationFab
            onDownloadHtml={handleDownload}
            onPrintPdf={() => handleExportPdf()}
          />
        </div>
      )}

      {/* ── Export Progress Overlay ── */}
      {exportStatus && (
        <div className="absolute inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white rounded-3xl p-10 shadow-2xl flex flex-col items-center gap-5 min-w-[320px]">
            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center">
              <Loader2 size={32} className="text-indigo-600 animate-spin" />
            </div>
            <div className="text-center">
              <p className="font-bold text-slate-900 text-lg">
                {exportStatus.type === 'pdf' ? '📄 Membuka Dialog Print...' : '📊 Membuat PowerPoint...'}
              </p>
              <p className="text-slate-400 text-sm mt-1">
                {exportStatus.type === 'pdf'
                  ? 'Pilih "Save as PDF" di dialog print browser'
                  : `Slide ${exportStatus.current} dari ${exportStatus.total}`}
              </p>
            </div>
            {exportStatus.type === 'pptx' && (
              <div className="w-full bg-slate-100 rounded-full h-2.5">
                <div
                  className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${exportStatus.total > 0 ? (exportStatus.current / exportStatus.total) * 100 : 10}%` }}
                />
              </div>
            )}
            <p className="text-xs text-slate-400">
              {exportStatus.type === 'pdf' ? 'Window baru akan terbuka sebentar...' : 'Jangan tutup jendela ini...'}
            </p>
          </div>
        </div>
      )}

      {/* Preview Header */}
      <div className="h-[70px] bg-white border-b border-slate-100 flex items-center justify-between px-8 text-slate-900 shadow-sm z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowEditor(!showEditor)}
            className={`p-2.5 rounded-xl transition-all ${showEditor ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600'}`}
            title="Toggle Editor"
          >
            <Edit3 size={20} />
          </button>
          <div className="w-px h-6 bg-slate-200"></div>
          <div>
            <h2 className="font-bold text-lg text-slate-900 leading-none mb-1">{title}</h2>
            <p className="text-[10px] uppercase tracking-widest text-indigo-600 font-bold">Interactive Editor Mode</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Presentation Mode button */}
          <button
            id="tour-present-btn"
            onClick={() => setIsPresentationMode(true)}
            title="Mode Presentasi — tekan F atau klik untuk mulai (ESC untuk keluar)"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-sm font-bold transition-all active:scale-95 shadow-lg shadow-slate-200"
          >
            <Presentation size={16} />
            <span className="hidden lg:inline">Presentasi</span>
          </button>

          {/* Export Buttons Group */}
          <div id="tour-export-btns" className="flex items-center gap-1 bg-slate-50 rounded-xl p-1 border border-slate-100">
            <button
              onClick={handleDownload}
              disabled={!!exportStatus}
              title="Download HTML"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-sm transition-all disabled:opacity-40"
            >
              <Download size={16} />
              <span className="hidden xl:inline">HTML</span>
            </button>
            <div className="w-px h-5 bg-slate-200" />
            <button
              onClick={handleExportPdf}
              disabled={!!exportStatus}
              title="Download PDF (semua slide)"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold text-red-600 hover:bg-red-50 hover:shadow-sm transition-all disabled:opacity-40"
            >
              <FileText size={16} />
              <span className="hidden xl:inline">PDF</span>
            </button>
            <div className="w-px h-5 bg-slate-200" />
            <button
              onClick={handleExportPptx}
              disabled={!!exportStatus}
              title="Download PowerPoint (.pptx)"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold text-orange-600 hover:bg-orange-50 hover:shadow-sm transition-all disabled:opacity-40"
            >
              <Presentation size={16} />
              <span className="hidden xl:inline">PPTX</span>
            </button>
          </div>

          <div className="w-px h-8 bg-slate-200 mx-1"></div>
          <button 
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-xl transition-all border border-slate-100"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Editor */}
        {showEditor && (
          <div id="tour-slide-sidebar" className="w-[400px] bg-white border-r border-slate-100 flex flex-col animate-in slide-in-from-left duration-300">
            <div className="flex border-b border-slate-100">
              <button 
                onClick={() => setActiveTab('content')}
                className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'content' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Konten Slide
              </button>
              <button 
                onClick={() => setActiveTab('theme')}
                className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'theme' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Tema Visual
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4">
              {activeTab === 'content' ? (
                <>
                  {data.slides.map((slide, idx) => (
                    <div
                      key={idx}
                      ref={(el) => { slideItemRefs.current[idx] = el; }}
                      className={`border rounded-2xl transition-all ${activeSlideIndex === idx ? 'border-indigo-200 bg-indigo-50/20' : 'border-slate-100'}`}
                    >
                      <button 
                        onClick={() => setActiveSlideIndex(activeSlideIndex === idx ? null : idx)}
                        className="w-full flex items-center justify-between p-4 text-left"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded bg-slate-100 text-[10px] font-bold flex items-center justify-center text-slate-500">
                            {idx + 1}
                          </span>
                          <span className="text-sm font-bold text-slate-700 truncate max-w-[220px]">
                            {slide.title || 'Untitled Slide'}
                          </span>
                        </div>
                        {activeSlideIndex === idx ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>

                      {activeSlideIndex === idx && (
                        <div className="p-4 pt-0 space-y-4 animate-in fade-in slide-in-from-top-2">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Judul Slide</label>
                            <input 
                              type="text"
                              value={slide.title}
                              onChange={(e) => updateSlideTitle(idx, e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Poin Materi</label>
                            <div className="space-y-2">
                              {slide.content.map((point, pIdx) => (
                                <textarea 
                                  key={pIdx}
                                  value={point}
                                  onChange={(e) => updateSlideContent(idx, pIdx, e.target.value)}
                                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                                  rows={2}
                                />
                              ))}
                              <button 
                                onClick={() => addContentItem(idx)}
                                className="w-full py-2 border-2 border-dashed border-slate-200 rounded-xl text-[10px] font-bold text-slate-400 hover:border-indigo-300 hover:text-indigo-600 transition-all"
                              >
                                + Tambah Poin
                              </button>
                            </div>
                          </div>

                          {(slide.type === 'section-cover' || slide.imageUrl) && (
                            <div className="pt-4 border-t border-slate-100">
                              <button 
                                onClick={() => onRegenerateImage(idx)}
                                className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-2.5 rounded-xl text-[11px] font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                              >
                                <RefreshCw size={14} /> Regenerate Gambar AI
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {TEMPLATES.map((tmpl) => (
                    <button
                      key={tmpl.id}
                      onClick={() => onUpdateData(data, tmpl.id)}
                      className={`p-3 rounded-2xl border-2 transition-all text-left flex flex-col gap-2 relative ${
                        templateId === tmpl.id ? 'border-indigo-600 bg-indigo-50/30' : 'border-slate-100 bg-white hover:border-slate-200'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${templateId === tmpl.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                        <Palette size={16} />
                      </div>
                      <span className="text-[10px] font-bold text-slate-700">{tmpl.name}</span>
                      {templateId === tmpl.id && (
                        <div className="absolute top-2 right-2 w-4 h-4 bg-indigo-600 text-white rounded-full flex items-center justify-center">
                          <Check size={10} />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Iframe Area */}
        <div id="tour-iframe-area" className="flex-1 bg-slate-50 relative overflow-hidden flex flex-col">
          <div className="flex-1 p-8 lg:p-12 overflow-hidden flex justify-center items-center">
            <div className={`w-full max-w-5xl aspect-video bg-white shadow-[0_32px_64px_-16px_rgba(0,0,0,0.15)] rounded-[24px] overflow-hidden border border-slate-200 transition-all duration-500`}>
              <iframe 
                ref={iframeRef} 
                srcDoc={iframeSrc}
                title="WebSlide Preview" 
                className="w-full h-full border-none"
                sandbox="allow-scripts allow-same-origin"
                allowFullScreen
              />
            </div>
          </div>
          
          <div className="h-14 bg-white border-t border-slate-100 flex items-center justify-center text-slate-400 text-[10px] gap-8 font-bold uppercase tracking-widest">
            <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div> Navigation: Keyboard Arrow Key</span>
            <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div> Live Editor Enabled</span>
          </div>
        </div>
      </div>

      {/* Preview contextual tour (steps 6-9 → local 0-3) */}
      {tourStep >= 0 && onTourNext && (
        <TourTooltip
          steps={PREVIEW_TOUR_STEPS}
          currentStep={tourStep}
          totalSteps={totalTourSteps}
          globalStep={globalTourStep}
          onNext={onTourNext}
          onBack={onTourBack ?? (() => {})}
          onSkip={onTourSkip ?? (() => {})}
          isLast={tourStep === PREVIEW_TOUR_STEPS.length - 1}
        />
      )}
    </div>
  );
}

// ── Floating Action Button for Presentation Mode ──────────────────────────────
function PresentationFab({
  onDownloadHtml,
  onPrintPdf,
}: {
  onDownloadHtml: () => void;
  onPrintPdf: () => void;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <div
      className="absolute bottom-24 right-5 z-[400] flex flex-col items-end gap-2"
    >
      {/* Action buttons — slide in when open */}
      <div
        className={`flex flex-col items-end gap-2 transition-all duration-300 ${
          open
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 translate-y-2 pointer-events-none'
        }`}
      >
        <button
          onClick={() => { setOpen(false); onDownloadHtml(); }}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 rounded-2xl px-4 py-2.5 text-xs font-bold transition-all hover:-translate-y-0.5 shadow-2xl whitespace-nowrap"
        >
          <Download size={13} />
          Unduh HTML
        </button>
        <button
          onClick={() => { setOpen(false); onPrintPdf(); }}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-400 rounded-2xl px-4 py-2.5 text-xs font-bold transition-all hover:-translate-y-0.5 shadow-2xl whitespace-nowrap"
        >
          <FileText size={13} />
          Cetak / Save PDF
        </button>
      </div>

      {/* Toggle button — always visible, pill-shaped with icon + label */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-white text-xs font-bold shadow-2xl border transition-all duration-300 ${
          open
            ? 'bg-slate-600 border-slate-500 rotate-0'
            : 'bg-slate-900/80 border-slate-700 hover:bg-slate-800 hover:border-slate-500'
        }`}
        title="Menu Unduh & Cetak"
      >
        <Download size={13} />
        {open ? 'Tutup' : 'Unduh / Cetak'}
        <span className={`ml-0.5 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}>
          ▾
        </span>
      </button>
    </div>
  );
}
