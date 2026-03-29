import React, { useEffect, useState } from 'react';
import { X, ArrowRight, ChevronLeft } from 'lucide-react';

export interface TourStepConfig {
  targetId: string;
  title: string;
  message: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  padding?: number;
}

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface TourTooltipProps {
  steps: TourStepConfig[];
  currentStep: number; // index within this steps array; -1 = hidden
  totalSteps: number;  // total across dashboard + preview
  globalStep: number;  // global index for progress display
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  isLast?: boolean;
}

function getTooltipPosition(
  rect: TargetRect,
  position: string,
  padding: number
): React.CSSProperties {
  const gap = 14;
  const tooltipW = 300;
  const spotTop = rect.top - padding;
  const spotLeft = rect.left - padding;
  const spotRight = rect.left + rect.width + padding;
  const spotBottom = rect.top + rect.height + padding;
  const viewW = window.innerWidth;
  const viewH = window.innerHeight;

  const clampLeft = (val: number) =>
    Math.max(12, Math.min(val, viewW - tooltipW - 12));

  switch (position) {
    case 'bottom':
      return {
        top: spotBottom + gap,
        left: clampLeft(rect.left + rect.width / 2 - tooltipW / 2),
        width: tooltipW,
      };
    case 'top':
      return {
        bottom: viewH - spotTop + gap,
        left: clampLeft(rect.left + rect.width / 2 - tooltipW / 2),
        width: tooltipW,
      };
    case 'right':
      return {
        top: Math.max(12, rect.top + rect.height / 2 - 100),
        left: Math.min(spotRight + gap, viewW - tooltipW - 12),
        width: tooltipW,
      };
    case 'left':
    default:
      return {
        top: Math.max(12, rect.top + rect.height / 2 - 100),
        right: Math.max(12, viewW - spotLeft + gap),
        width: tooltipW,
      };
  }
}

function getArrowStyle(position: string): React.CSSProperties {
  switch (position) {
    case 'bottom':
      return { top: -6, left: 'calc(50% - 6px)', position: 'absolute' };
    case 'top':
      return { bottom: -6, left: 'calc(50% - 6px)', position: 'absolute' };
    case 'right':
      return { top: 32, left: -6, position: 'absolute' };
    case 'left':
    default:
      return { top: 32, right: -6, position: 'absolute' };
  }
}

export function TourTooltip({
  steps,
  currentStep,
  totalSteps,
  globalStep,
  onNext,
  onBack,
  onSkip,
  isLast = false,
}: TourTooltipProps) {
  const [rect, setRect] = useState<TargetRect | null>(null);
  const step = steps[currentStep];

  useEffect(() => {
    if (!step) return;

    const update = () => {
      const el = document.getElementById(step.targetId);
      if (el) {
        const r = el.getBoundingClientRect();
        setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      } else {
        setRect(null);
      }
    };

    update();
    const timer = setInterval(update, 200); // re-poll during dynamic renders
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      clearInterval(timer);
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [step]);

  if (currentStep < 0 || !step) return null;

  const pad = step.padding ?? 10;

  // When element is not in DOM yet, show centered tooltip without spotlight
  if (!rect) {
    return (
      <>
        {/* Dim backdrop only (no spotlight hole) */}
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 8999,
            background: 'rgba(0,0,0,0.35)',
            pointerEvents: 'all',
          }}
        />
        {/* Centered tooltip */}
        <div
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 9001,
            width: 320,
          }}
          className="pointer-events-auto"
        >
          <div className="bg-white rounded-2xl shadow-2xl shadow-slate-900/20 overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-indigo-500 to-violet-500" />
            <div className="p-5">
              <div className="flex items-start justify-between mb-3">
                <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full uppercase tracking-widest">
                  {globalStep + 1} / {totalSteps}
                </span>
                <button onClick={onSkip} className="text-slate-300 hover:text-slate-500 transition-colors -mt-0.5">
                  <X size={15} />
                </button>
              </div>
              <h4 className="font-black text-slate-900 text-sm mb-2 leading-snug">{step.title}</h4>
              <p className="text-xs text-slate-500 leading-relaxed mb-4">{step.message}</p>
              <div className="flex items-center gap-1 mb-4">
                {Array.from({ length: totalSteps }).map((_, i) => (
                  <div key={i} className={`h-1 rounded-full transition-all duration-300 ${i === globalStep ? 'w-5 bg-indigo-600' : i < globalStep ? 'w-2 bg-indigo-300' : 'w-2 bg-slate-100'}`} />
                ))}
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  {globalStep > 0 && (
                    <button onClick={onBack} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all">
                      <ChevronLeft size={16} />
                    </button>
                  )}
                  <button onClick={onSkip} className="text-xs text-slate-400 hover:text-slate-600 transition-colors px-1">Lewati</button>
                </div>
                <button onClick={onNext} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all hover:scale-105 shadow-lg shadow-indigo-100 active:scale-95">
                  {isLast ? <>Selesai ✓</> : <>Lanjut <ArrowRight size={12} /></>}
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  const spotlightStyle: React.CSSProperties = {
    position: 'fixed',
    top: rect.top - pad,
    left: rect.left - pad,
    width: rect.width + pad * 2,
    height: rect.height + pad * 2,
    borderRadius: 16,
    boxShadow: '0 0 0 9999px rgba(0,0,0,0.52)',
    zIndex: 9000,
    pointerEvents: 'none',
    border: '2px solid rgba(99, 102, 241, 0.7)',
    transition: 'all 0.35s cubic-bezier(0.4,0,0.2,1)',
  };

  const tooltipStyle: React.CSSProperties = {
    position: 'fixed',
    zIndex: 9001,
    ...getTooltipPosition(rect, step.position, pad),
  };

  return (
    <>
      {/* Backdrop click-blocker (prevent clicking behind) */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 8999,
          pointerEvents: 'all',
          cursor: 'not-allowed',
        }}
      />

      {/* Spotlight frame */}
      <div style={spotlightStyle} />

      {/* Tooltip card */}
      <div style={tooltipStyle} className="pointer-events-auto">
        {/* Arrow */}
        <div
          style={{
            ...getArrowStyle(step.position),
            width: 12,
            height: 12,
            background: 'white',
            transform: 'rotate(45deg)',
            borderRadius: 2,
            boxShadow: '-1px -1px 3px rgba(0,0,0,0.06)',
          }}
        />

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl shadow-slate-900/20 overflow-hidden">
          {/* Indigo top bar */}
          <div className="h-1 bg-gradient-to-r from-indigo-500 to-violet-500" />

          <div className="p-5">
            {/* Step badge + close */}
            <div className="flex items-start justify-between mb-3">
              <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full uppercase tracking-widest">
                {globalStep + 1} / {totalSteps}
              </span>
              <button
                onClick={onSkip}
                className="text-slate-300 hover:text-slate-500 transition-colors -mt-0.5"
                title="Tutup panduan"
              >
                <X size={15} />
              </button>
            </div>

            <h4 className="font-black text-slate-900 text-sm mb-2 leading-snug">
              {step.title}
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              {step.message}
            </p>

            {/* Progress dots */}
            <div className="flex items-center gap-1 mb-4">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    i === globalStep
                      ? 'w-5 bg-indigo-600'
                      : i < globalStep
                      ? 'w-2 bg-indigo-300'
                      : 'w-2 bg-slate-100'
                  }`}
                />
              ))}
            </div>

            {/* Nav buttons */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                {globalStep > 0 && (
                  <button
                    onClick={onBack}
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all"
                    title="Kembali"
                  >
                    <ChevronLeft size={16} />
                  </button>
                )}
                <button
                  onClick={onSkip}
                  className="text-xs text-slate-400 hover:text-slate-600 transition-colors px-1"
                >
                  Lewati
                </button>
              </div>

              <button
                onClick={onNext}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all hover:scale-105 shadow-lg shadow-indigo-100 active:scale-95"
              >
                {isLast ? (
                  <>Selesai ✓</>
                ) : (
                  <>
                    Lanjut <ArrowRight size={12} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
