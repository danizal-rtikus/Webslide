import pptxgen from 'pptxgenjs';
import { WebSlideJson } from './geminiApi';

interface ThemeColors {
  accent: string;
  accentLight: string;
  sectionBg: string;
  textMain: string;
  textMuted: string;
}

function getThemeColors(templateId: string): ThemeColors {
  const themes: Record<string, ThemeColors> = {
    'modern-indigo': {
      accent: '4f46e5',
      accentLight: 'EEF2FF',
      sectionBg: 'F0F0FF',
      textMain: '0f172a',
      textMuted: '475569',
    },
    'modern-emerald': {
      accent: '059669',
      accentLight: 'ECFDF5',
      sectionBg: 'F0FDF4',
      textMain: '0f172a',
      textMuted: '475569',
    },
    'glass': {
      accent: '0ea5e9',
      accentLight: 'F0F9FF',
      sectionBg: 'E0F2FE',
      textMain: '0f172a',
      textMuted: '475569',
    },
    'slate': {
      accent: '475569',
      accentLight: 'F8FAFC',
      sectionBg: 'F1F5F9',
      textMain: '0f172a',
      textMuted: '64748b',
    },
  };
  return themes[templateId] || themes['modern-indigo'];
}

/**
 * Exports WebSlide JSON data to a PowerPoint (.pptx) file using pptxgenjs.
 */
export async function exportToPptx(
  data: WebSlideJson,
  templateId: string,
  onProgress: (current: number, total: number) => void
): Promise<void> {
  const prs = new pptxgen();
  prs.layout = 'LAYOUT_16x9';

  const theme = getThemeColors(templateId);
  const totalSlides = data.slides.length;

  for (let i = 0; i < totalSlides; i++) {
    onProgress(i + 1, totalSlides);
    const slide = data.slides[i];
    const pptSlide = prs.addSlide();

    // --- COVER SLIDE ---
    if (slide.type === 'cover') {
      pptSlide.background = { color: 'F8FAFC' };

      // Left accent bar
      pptSlide.addShape(prs.ShapeType.rect, {
        x: 0, y: 0, w: 0.1, h: '100%',
        fill: { color: theme.accent },
        line: { color: theme.accent },
      });

      // Title
      pptSlide.addText((slide.title || data.title).toUpperCase(), {
        x: 0.4, y: 1.2, w: 8.8, h: 1.4,
        fontSize: 34, bold: true,
        color: theme.accent,
        fontFace: 'Calibri',
      });

      // Course / subject
      if (slide.content?.[0]) {
        pptSlide.addText(slide.content[0], {
          x: 0.4, y: 2.7, w: 8.8, h: 0.5,
          fontSize: 14,
          color: theme.textMuted,
          fontFace: 'Calibri',
        });
      }

      // Author
      pptSlide.addText(data.author, {
        x: 0.4, y: 3.3, w: 8.8, h: 0.5,
        fontSize: 14, bold: true,
        color: theme.textMain,
        fontFace: 'Calibri',
      });

    // --- OUTLINE SLIDE ---
    } else if (slide.type === 'outline') {
      pptSlide.background = { color: 'FFFFFF' };
      pptSlide.addShape(prs.ShapeType.rect, {
        x: 0, y: 0, w: 0.1, h: '100%',
        fill: { color: theme.accent },
        line: { color: theme.accent },
      });

      pptSlide.addText('Daftar Isi', {
        x: 0.4, y: 0.3, w: 8.8, h: 0.7,
        fontSize: 26, bold: true,
        color: theme.accent,
        fontFace: 'Calibri',
      });

      // Divider
      pptSlide.addShape(prs.ShapeType.line, {
        x: 0.4, y: 1.1, w: 8.6, h: 0,
        line: { color: theme.accent + '55', width: 1 },
      });

      const itemsPerCol = Math.ceil(slide.content.length / 2);
      slide.content.forEach((item, idx) => {
        if (idx >= 16) return;
        const col = idx < itemsPerCol ? 0 : 1;
        const row = idx < itemsPerCol ? idx : idx - itemsPerCol;
        pptSlide.addText(`${idx + 1}. ${item}`, {
          x: 0.4 + col * 4.5, y: 1.25 + row * 0.42, w: 4.2, h: 0.4,
          fontSize: 12,
          color: theme.textMain,
          fontFace: 'Calibri',
        });
      });

    // --- SECTION COVER ---
    } else if (slide.type === 'section-cover') {
      pptSlide.background = { color: theme.accentLight };

      // Centered section title
      pptSlide.addText(slide.title, {
        x: 0.5, y: 1.8, w: 8.5, h: 1.4,
        fontSize: 30, bold: true,
        color: theme.accent,
        align: 'center',
        fontFace: 'Calibri',
      });

      // Accent divider
      pptSlide.addShape(prs.ShapeType.rect, {
        x: 3.5, y: 3.35, w: 2.5, h: 0.06,
        fill: { color: theme.accent + '66' },
        line: { color: theme.accent + '66' },
      });

      if (slide.content?.[0]) {
        pptSlide.addText(slide.content[0], {
          x: 0.7, y: 3.55, w: 8.1, h: 0.8,
          fontSize: 13,
          color: theme.textMuted,
          align: 'center',
          fontFace: 'Calibri',
        });
      }

    // --- DEFAULT / CONTENT SLIDE ---
    } else {
      pptSlide.background = { color: 'FFFFFF' };

      // Left accent bar
      pptSlide.addShape(prs.ShapeType.rect, {
        x: 0, y: 0, w: 0.08, h: '100%',
        fill: { color: theme.accent },
        line: { color: theme.accent },
      });

      // Slide title
      pptSlide.addText(slide.title, {
        x: 0.3, y: 0.25, w: 9.2, h: 0.7,
        fontSize: 22, bold: true,
        color: theme.accent,
        fontFace: 'Calibri',
      });

      // Divider
      pptSlide.addShape(prs.ShapeType.line, {
        x: 0.3, y: 1.0, w: 9.2, h: 0,
        line: { color: theme.accent + '44', width: 1 },
      });

      // Content bullets
      const content = slide.content || [];
      content.forEach((item, idx) => {
        if (idx >= 14) return;
        pptSlide.addText(`• ${item}`, {
          x: 0.4, y: 1.15 + idx * 0.42, w: 9.1, h: 0.4,
          fontSize: 12,
          color: theme.textMain,
          fontFace: 'Calibri',
        });
      });
    }
  }

  const safeTitle = data.title.replace(/[^a-zA-Z0-9\s\-_]/g, '').trim() || 'WebSlide';
  await prs.writeFile({ fileName: `${safeTitle}.pptx` });
}
