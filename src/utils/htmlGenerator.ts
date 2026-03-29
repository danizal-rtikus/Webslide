import { WebSlideJson } from './geminiApi';
import { TEMPLATES } from '../config/templates';
import { SVG_TEMPLATES, SvgTemplateParams } from '../config/svgLibrary';

export function generateWebSlideHtml(
  data: WebSlideJson,
  templateId: string = 'modern-indigo',
  pageTitle?: string,
  pageDescription?: string
): string {
  const template = TEMPLATES.find(t => t.id === templateId) || TEMPLATES[0];
  const finalTitle = pageTitle || data.title || 'WebSlide';
  const finalDesc = pageDescription || (data.slides[0]?.content[0] || 'WebSlide Presentation');

  let cssVariables = '';
  let customCss = '';

  if (templateId === 'modern-indigo') {
    cssVariables = `
      --bg-base: #f8fafc;
      --text-main: #0f172a;
      --text-muted: #475569;
      --accent-primary: #4f46e5;
      --accent-gradient: linear-gradient(135deg, #4338ca, #6366f1, #818cf8);
      --card-bg: rgba(255, 255, 255, 0.9);
    `;
  } else if (templateId === 'dark-emerald') {
    cssVariables = `
      --bg-base: #020617;
      --text-main: #ffffff;
      --text-muted: #10b981;
      --accent-primary: #10b981;
      --accent-gradient: linear-gradient(135deg, #064e3b, #10b981, #34d399);
      --card-bg: rgba(15, 23, 42, 0.8);
    `;
    customCss = `
      .slide-header-global { background: linear-gradient(to bottom, rgba(2,6,23,0.95), rgba(2,6,23,0)) !important; border-top-color: #10b981 !important; }
      .nav-controls { background: rgba(15, 23, 42, 0.85) !important; color: white !important; }
      .nav-btn { color: white !important; }
      .outline-item, .interactive-card, .quiz-container { background: #0f172a !important; border-color: #334155 !important; }
      .bg-blob-1 { background: radial-gradient(circle, rgba(16,185,129,0.15) 0%, rgba(2,6,23,0) 70%) !important; }
      .bg-blob-2 { background: radial-gradient(circle, rgba(16,185,129,0.1) 0%, rgba(2,6,23,0) 70%) !important; }
    `;
  } else if (templateId === 'glass-violet') {
    cssVariables = `
      --bg-base: #fdf2f8;
      --text-main: #4a044e;
      --text-muted: #701a75;
      --accent-primary: #a855f7;
      --accent-gradient: linear-gradient(135deg, #7e22ce, #a855f7, #ec4899);
      --card-bg: rgba(255, 255, 255, 0.6);
    `;
    customCss = `
      .content-block, .outline-item, .interactive-card, .quiz-container { backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.4) !important; }
      .bg-blob-1 { background: radial-gradient(circle, rgba(168,85,247,0.12) 0%, rgba(253,242,248,0) 70%) !important; }
      .bg-blob-2 { background: radial-gradient(circle, rgba(236,72,153,0.1) 0%, rgba(253,242,248,0) 70%) !important; }
    `;
  } else if (templateId === 'minimalist-slate') {
    cssVariables = `
      --bg-base: #ffffff;
      --text-main: #000000;
      --text-muted: #64748b;
      --accent-primary: #334155;
      --accent-gradient: linear-gradient(135deg, #000000, #334155, #64748b);
      --card-bg: #f8fafc;
    `;
    customCss = `
      h1, .sub-topic { background: none !important; -webkit-text-fill-color: initial !important; color: black !important; border-bottom: 4px solid black !important; }
      .outline-item span { background: black !important; }
      .content-block { border-left-color: black !important; box-shadow: none !important; border: 1px solid #e2e8f0 !important; }
    `;
  }

  const slidesHtml = data.slides.map((slide, index) => {
    const activeClass = index === 0 ? 'active' : '';
    const contentArray = Array.isArray(slide.content) ? slide.content : [];
    const referencesArray = Array.isArray(slide.references) ? slide.references : [];
    const footerRefs = referencesArray.length > 0
      ? `<div class="slide-footer-refs"><strong>References:</strong> ${referencesArray.join('; ')}</div>`
      : '';

    if (slide.type === 'cover') {
      return `
        <section class="slide ${activeClass}">
            <div class="content-area cover-slide">
                <img src="https://i.ibb.co.com/kgV7WDhF/Logo-SYS.png" alt="Logo" style="height: 140px; margin-bottom: 4rem; filter: drop-shadow(0 10px 20px rgba(0,0,0,0.1));" onerror="this.style.display='none'">
                <h1>${(slide.title || data.title).toUpperCase()}</h1>
                <p>${contentArray[0] || ''}</p>
                <div class="author-box">
                    <p style="font-weight: 700; color: var(--text-main); margin-bottom: 0.5rem; font-size: 2rem;">${data.author}</p>
                    <p style="margin-bottom: 0; font-size: 1.6rem;">STIKOM Yos Sudarso</p>
                </div>
            </div>
        </section>`;
    }

    if (slide.type === 'outline') {
      const items = contentArray.map((item, i) => `
        <div class="outline-item" onclick="goToSlide(${i + 2})"><span>${i + 1}</span> ${item}</div>
      `).join('');
      return `
        <section class="slide ${activeClass}">
            <div class="content-area">
                <h2>${slide.title}</h2>
                <div class="outline-list">${items}</div>
            </div>
        </section>`;
    }

    if (slide.type === 'interactive') {
      const cards = contentArray.map(item => {
        const parts = (item || '').split('|');
        const cardTitle = parts[0] || 'Detail';
        const answer = parts[1] || 'Klik untuk melihat informasi.';
        return `
          <div class="interactive-card" onclick="this.classList.toggle('revealed')">
              <div class="card-title">${cardTitle}</div>
              <div class="answer"><p>${answer}</p></div>
          </div>`;
      }).join('');
      return `
        <section class="slide ${activeClass}">
            <div class="content-area">
                <h3 class="sub-topic">${slide.title}</h3>
                <p style="margin-bottom: 3rem;">Klik pada kartu di bawah ini untuk mempelajari detail lebih lanjut:</p>
                ${cards}
                ${footerRefs}
            </div>
        </section>`;
    }

    if (slide.type === 'visual') {
      let svgContent = slide.svgSnippet || '<!-- No SVG Provided -->';
      if (!slide.svgSnippet && slide.visualTheme && SVG_TEMPLATES[slide.visualTheme]) {
        const themeColors: Record<string, SvgTemplateParams> = {
          'modern-indigo': { primaryColor: '#4f46e5', secondaryColor: '#818cf8' },
          'dark-emerald': { primaryColor: '#10b981', secondaryColor: '#34d399' },
          'glass-violet': { primaryColor: '#a855f7', secondaryColor: '#ec4899' },
          'minimalist-slate': { primaryColor: '#334155', secondaryColor: '#64748b' }
        };
        const params = themeColors[templateId] || themeColors['modern-indigo'];
        svgContent = SVG_TEMPLATES[slide.visualTheme](params);
      }
      return `
        <section class="slide ${activeClass}">
            <div class="content-area">
                <h3 class="sub-topic">${slide.title || 'Visualization'}</h3>
                <p style="margin-bottom: 2rem;">${contentArray[0] || ''}</p>
                <div class="svg-container" style="width: 100%; max-width: 800px; margin: 0 auto; aspect-ratio: 16/9; display: flex; align-items: center; justify-content: center; background: white; border-radius: 20px; box-shadow: var(--shadow-soft); overflow: hidden; padding: 2rem;">
                    ${svgContent}
                </div>
                ${footerRefs}
            </div>
        </section>`;
    }

    if (slide.type === 'section-cover') {
      const hasAiImage = !!slide.imageUrl;
      if (hasAiImage) {
        return `
          <section class="slide ${activeClass}">
              <div class="content-area full-bleed-content">
                  <div class="section-split">
                      <div class="section-text">
                          <div class="section-badge">Topik Baru</div>
                          <h2 class="section-title" style="background: var(--accent-gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">${slide.title || 'Judul Bab'}</h2>
                          <p class="section-desc">${contentArray[0] || 'Mari kita pelajari bagian ini bersama-sama.'}</p>
                      </div>
                      <div class="section-visual">
                          <img src="${slide.imageUrl}" alt="Section Illustration">
                      </div>
                  </div>
              </div>
          </section>`;
      }
      return `
        <section class="slide ${activeClass}" style="display:flex; align-items:center; justify-content:center; text-align:center; background: radial-gradient(circle at center, rgba(37,99,235,0.03) 0%, transparent 70%);">
            <div class="content-area">
                <div style="max-width: 900px; margin: 0 auto; display: flex; flex-direction: column; align-items: center;">
                    <div class="section-badge" style="margin-bottom: 3rem;">Topik Baru</div>
                    <h2 class="section-title" style="font-size: 6.5rem; margin-bottom: 3rem; background: var(--accent-gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">${slide.title || 'Judul Bab'}</h2>
                    <div style="width: 100px; height: 6px; background: var(--accent-primary); border-radius: 10px; margin-bottom: 4rem; opacity: 0.3;"></div>
                    <p class="section-desc" style="font-size: 2.8rem; border-left: none; padding-left: 0; color: var(--text-muted); line-height: 1.4; font-weight: 500;">${contentArray[0] || 'Mari kita pelajari bagian ini bersama-sama.'}</p>
                </div>
            </div>
        </section>`;
    }

    if (slide.type === 'table') {
      const rows = (slide.tableData || []).map((row, i) => {
        const cells = row.map(cell => i === 0 ? `<th>${cell}</th>` : `<td>${cell}</td>`).join('');
        return `<tr>${cells}</tr>`;
      }).join('');
      return `
        <section class="slide ${activeClass}">
            <div class="content-area">
                <h3 class="sub-topic">${slide.title || 'Data Tabular'}</h3>
                <p style="margin-bottom: 2rem;">${contentArray[0] || ''}</p>
                <div class="table-wrapper">
                    <table>${rows}</table>
                </div>
                ${footerRefs}
            </div>
        </section>`;
    }

    if (slide.type === 'chart') {
      return `
        <section class="slide ${activeClass}">
            <div class="content-area">
                <h3 class="sub-topic">${slide.title || 'Visualisasi Data'}</h3>
                <p style="margin-bottom: 2rem;">${contentArray[0] || ''}</p>
                <div class="chart-container">
                    ${slide.svgSnippet || '<!-- No Chart Data -->'}
                </div>
                ${footerRefs}
            </div>
        </section>`;
    }

    if (slide.type === 'references') {
      const refItems = contentArray.map(item => `
        <div class="outline-item" style="cursor: default; font-size: 1.6rem;">
            <span style="background: var(--accent-gradient); min-width: 35px;">📚</span>
            ${item}
        </div>
      `).join('');
      return `
        <section class="slide ${activeClass}">
            <div class="content-area">
                <h3 class="sub-topic">Sumber &amp; Referensi</h3>
                <h2>${slide.title}</h2>
                <div class="outline-list" style="grid-template-columns: 1fr;">${refItems}</div>
            </div>
        </section>`;
    }

    // Default content slide
    return `
    <section class="slide ${activeClass}">
        <div class="content-area">
            ${slide.subtopic ? `<h3 class="sub-topic">${slide.subtopic}</h3>` : ''}
            <h2>${slide.title || 'Materi'}</h2>
            <div class="content-block">
                <ul>
                    ${contentArray.map(c => `<li>${c}</li>`).join('')}
                </ul>
            </div>
            ${footerRefs}
        </div>
    </section>`;
  }).join('');

  const hasQuiz = data.quiz && data.quiz.length > 0;
  const quizDataJs = hasQuiz ? JSON.stringify(data.quiz) : '[]';
  const totalSlidesCount = data.slides.length + (hasQuiz ? 1 : 0) + 1;

  return `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${finalTitle} - WebSlide</title>
    <meta name="description" content="${finalDesc}">
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        :root {
            ${cssVariables}
            --shadow-soft: 0 10px 40px -10px rgba(0, 0, 0, 0.08);
            --shadow-float: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
            --border-radius-lg: 16px;
            --header-h: 80px;
            --footer-h: 60px;
        }
        ${customCss}
        html { font-size: 62.5%; box-sizing: border-box; }
        *, *::before, *::after { box-sizing: inherit; margin: 0; padding: 0; }
        body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: var(--bg-base); color: var(--text-main); overflow: hidden; }
        .presentation-container { width: 100vw; height: 100vh; position: relative; z-index: 1; }
        .slides-wrapper { width: 100%; height: 100%; position: relative; }
        .slide { position: absolute; top: 0; left: 0; right: 0; bottom: 0; opacity: 0; visibility: hidden; transform: scale(0.97) translateX(30px); transition: all 0.6s cubic-bezier(0.25, 1, 0.5, 1); display: flex; flex-direction: column; padding-top: var(--header-h); padding-bottom: calc(var(--footer-h) + 60px); z-index: 1; }
        .slide.active { opacity: 1; visibility: visible; transform: scale(1) translateX(0); z-index: 10; }
        .content-area { flex: 1; overflow-y: auto; padding: 4rem 12%; scroll-behavior: smooth; }
        .slide-header-global { position: absolute; top: 0; left: 0; right: 0; height: var(--header-h); background: linear-gradient(to bottom, rgba(255,255,255,0.95), rgba(255,255,255,0)); display: flex; justify-content: space-between; align-items: center; padding: 0 40px; z-index: 100; border-top: 4px solid var(--accent-primary); }
        .header-logo { height: 45px; }
        .nav-controls { position: absolute; bottom: 30px; left: 50%; transform: translateX(-50%); z-index: 150; display: flex; align-items: center; gap: 10px; background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(15px); padding: 10px 20px; border-radius: 50px; box-shadow: var(--shadow-float); }
        .nav-btn { background-color: transparent; color: var(--text-main); border: none; width: 40px; height: 40px; border-radius: 50%; display: flex; justify-content: center; align-items: center; cursor: pointer; transition: all 0.2s; font-size: 18px; }
        .nav-btn:hover { background-color: var(--accent-primary); color: white; }
        .content-block { background-color: var(--card-bg); padding: 3rem 4rem; border-radius: var(--border-radius-lg); box-shadow: var(--shadow-soft); border-left: 6px solid var(--accent-primary); margin-bottom: 2rem; }
        .interactive-card { background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 2rem 3rem; cursor: pointer; margin-bottom: 1.5rem; transition: all 0.3s; position: relative; }
        .interactive-card .answer { display: none; margin-top: 2rem; border-top: 1px solid #e2e8f0; padding-top: 2rem; font-size: 1.8rem; }
        .interactive-card.revealed .answer { display: block; }
        .outline-list { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; }
        .outline-item { background: white; padding: 2rem; border-radius: 12px; font-size: 1.8rem; font-weight: 700; cursor: pointer; transition: all 0.3s; box-shadow: var(--shadow-soft); display:flex; align-items:center; gap:1.5rem; }
        .outline-item span { background: var(--accent-gradient); color: white; width: 35px; height: 35px; border-radius: 8px; display: flex; justify-content: center; align-items: center; }
        h1 { font-size: 4.5rem; font-weight: 800; background: var(--accent-gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        h2 { font-size: 4.8rem; font-weight: 800; margin-bottom: 2rem; }
        .sub-topic { font-size: 3.5rem; font-weight: 700; margin-bottom: 1.5rem; border-bottom: 3px solid var(--accent-primary); display: inline-block; }
        p, li { font-size: 1.8rem; line-height: 1.7; color: var(--text-muted); }
        ul { padding-left: 2.5rem; }
        .quiz-container { background: white; padding: 5rem; border-radius: 20px; box-shadow: var(--shadow-float); }
        .quiz-option { background: #f8fafc; border: 2px solid #e2e8f0; padding: 1.8rem 2.5rem; border-radius: 12px; font-size: 1.8rem; cursor: pointer; margin-bottom: 1rem; }
        .quiz-option.correct { border-color: #22c55e; background: #f0fdf4; }
        .quiz-option.wrong { border-color: #ef4444; background: #fef2f2; }
        .btn { background: var(--accent-gradient); color: white; padding: 1.5rem 4rem; border: none; border-radius: 50px; font-size: 1.8rem; font-weight: 700; cursor: pointer; }
        .bg-decoration { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 0; pointer-events: none; overflow: hidden; }
        .bg-blob-1 { position: absolute; top: -10%; left: -5%; width: 50vw; height: 50vw; background: radial-gradient(circle, rgba(37,99,235,0.08) 0%, rgba(255,255,255,0) 70%); border-radius: 50%; }
        .bg-blob-2 { position: absolute; bottom: -20%; right: -10%; width: 60vw; height: 60vw; background: radial-gradient(circle, rgba(6,182,212,0.06) 0%, rgba(255,255,255,0) 70%); border-radius: 50%; }
        .slide-footer-refs { position: absolute; bottom: 20px; left: 12%; right: 12%; font-size: 1.1rem; color: var(--text-muted); opacity: 0.6; border-top: 1px solid #e2e8f0; padding-top: 10px; font-style: italic; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        strong { color: var(--text-main); font-weight: 800; }
        em { font-style: italic; color: var(--accent-primary); }
        .section-split { display: flex; align-items: stretch; height: 100%; width: 100%; gap: 0; }
        .section-visual { flex: 1; position: relative; overflow: hidden; height: 100%; min-height: 100%; }
        .section-visual img { width: 100%; height: 100%; object-fit: cover; display: block; filter: brightness(0.95); }
        .section-text { flex: 1.1; display: flex; flex-direction: column; justify-content: center; padding: 6rem 8rem 6rem 12%; text-align: left; }
        .section-badge { display: inline-block; padding: 0.8rem 2rem; background: var(--accent-gradient); color: white; border-radius: 100px; font-weight: 800; font-size: 1.4rem; text-transform: uppercase; margin-bottom: 2rem; letter-spacing: 2px; align-self: flex-start; }
        .section-title { font-size: 5.5rem; font-weight: 800; margin-bottom: 2.5rem; line-height: 1.1; }
        .section-desc { font-size: 2.2rem; color: var(--text-muted); font-weight: 500; border-left: 4px solid var(--accent-primary); padding-left: 3rem; }
        .full-bleed-content { padding: 0 !important; }
        .table-wrapper { width: 100%; overflow-x: auto; background: var(--card-bg); padding: 2rem; border-radius: 20px; box-shadow: var(--shadow-soft); border: 1px solid rgba(255,255,255,0.4); backdrop-filter: blur(10px); }
        table { width: 100%; border-collapse: collapse; font-size: 1.6rem; }
        th { background: var(--accent-gradient); color: white; padding: 1.5rem; text-align: left; font-weight: 800; }
        th:first-child { border-radius: 12px 0 0 0; }
        th:last-child { border-radius: 0 12px 0 0; }
        td { padding: 1.5rem; border-bottom: 1px solid #f1f5f9; color: var(--text-main); font-weight: 500; }
        tr:nth-child(even) { background: rgba(0,0,0,0.02); }
        tr:last-child td { border-bottom: none; }
        .chart-container { width: 100%; background: white; padding: 3rem; border-radius: 24px; box-shadow: var(--shadow-float); display: flex; align-items: center; justify-content: center; min-height: 400px; }
        .chart-container svg { max-width: 100%; height: auto; }
        .cover-slide { height: 100%; }
        .author-box { margin-top: 4rem; }
        @media (max-width: 1024px) {
            html { font-size: 55%; }
            .section-split { flex-direction: column; }
            .section-text { padding: 4rem; order: 2; }
            .section-visual { height: 40vh; min-height: 40vh; order: 1; }
            .slide { padding-top: var(--header-h); padding-bottom: 100px; }
            .content-area { padding: 4rem 6%; }
        }
        @media (max-width: 768px) {
            html { font-size: 50%; }
            .outline-list { grid-template-columns: 1fr; }
            .section-title { font-size: 4rem; }
            .slide-header-global { padding: 0 20px; }
            .header-logo { height: 35px; }
        }

        /* ── Print / PDF CSS ── */
        @media print {
            @page {
                size: landscape;
                margin: 0;
            }
            html, body {
                overflow: visible !important;
                background: white !important;
                height: auto !important;
            }
            .presentation-container {
                display: block !important;
                height: auto !important;
                overflow: visible !important;
            }
            .slide-header-global,
            .nav-controls,
            .quiz-section {
                display: none !important;
            }
            .slides-wrapper {
                display: block !important;
                position: static !important;
                height: auto !important;
                overflow: visible !important;
            }
            .slide {
                position: relative !important;
                display: block !important;
                opacity: 1 !important;
                transform: none !important;
                width: 100vw !important;
                height: 100vh !important;
                page-break-after: always !important;
                break-after: page !important;
                overflow: hidden !important;
            }
            .slide:last-child {
                page-break-after: avoid !important;
                break-after: avoid !important;
            }
        }
    </style>
</head>
<body>
    <div class="presentation-container">
        <div class="bg-decoration"><div class="bg-blob-1"></div><div class="bg-blob-2"></div></div>

        <header class="slide-header-global">
            <div style="display:flex; align-items:center; gap:15px;">
                <img src="https://i.ibb.co.com/kgV7WDhF/Logo-SYS.png" class="header-logo">
                <div>
                   <div style="font-size:16px; font-weight:800;">${data.course}</div>
                   <div style="font-size:12px; color:var(--text-muted);">${data.author}</div>
                </div>
            </div>
            <div style="font-size:14px; font-weight:800; color:var(--accent-primary); text-transform:uppercase;">${data.title}</div>
        </header>

        <div class="slides-wrapper">
            ${slidesHtml}

            ${hasQuiz ? `
            <section class="slide" id="quiz-slide">
                <div class="content-area">
                    <div id="quiz-ui" class="quiz-container">
                        <div style="display:flex; justify-content:space-between; margin-bottom:3rem; border-bottom:1px solid #f1f5f9; padding-bottom:1rem;">
                            <h2 style="margin:0; font-size:3rem;">Kuis Evaluasi 📝</h2>
                            <div style="font-size:2rem; font-weight:800; color:var(--accent-primary);">Soal <span id="q-current">1</span>/${data.quiz?.length}</div>
                        </div>
                        <div id="question-text" style="font-size:2.4rem; font-weight:800; margin-bottom:2rem;"></div>
                        <div id="options-container"></div>
                        <div style="display:flex; justify-content:flex-end; margin-top:3rem;">
                           <button id="next-q-btn" class="btn" onclick="nextQuestion()" disabled>Selanjutnya ➔</button>
                        </div>
                    </div>
                    <div id="quiz-result" style="display:none; text-align:center;">
                        <h2 style="font-size:5rem; margin:2rem 0;">Skor: <span id="final-score">0</span>%</h2>
                        <button class="btn" onclick="resetQuiz()">↻ Ulangi</button>
                    </div>
                </div>
            </section>` : ''}

            <!-- CLOSING -->
            <section class="slide">
                 <div class="content-area cover-slide">
                    <h1>TERIMA KASIH</h1>
                    <p>Materi Selesai di Sini.</p>
                 </div>
            </section>
        </div>

        <div class="nav-controls">
            <button class="nav-btn" onclick="changeFontSize(-2)" title="Perkecil Font">A-</button>
            <button class="nav-btn" onclick="changeFontSize(2)" title="Perbesar Font">A+</button>
            <div style="width: 1px; height: 20px; background: #e2e8f0; margin: 0 5px;"></div>
            <button class="nav-btn" onclick="prevSlide()">◀</button>
            <div style="font-size: 15px; font-weight: 700; min-width: 60px; text-align: center;"><span id="currentSlideNum">1</span> / <span id="totalSlideNum">${totalSlidesCount}</span></div>
            <button class="nav-btn" onclick="nextSlide()">▶</button>
        </div>
    </div>

    <script>
        let currentSlide = 0;
        let baseFontSize = 62.5;
        let slides = [];
        let notifyParent = true; // prevents echo loop when iframe receives GO_TO

        function initApp() {
            try {
                slides = document.querySelectorAll('.slide');
                if (slides.length > 0) {
                    updateNav();
                    return true;
                }
            } catch (err) {
                console.error("Init Error:", err);
            }
            return false;
        }

        // Persistent polling until slides are found (robust for iframes)
        const initInterval = setInterval(() => {
            if (initApp()) clearInterval(initInterval);
        }, 100);
        window.onload = initApp;
        setTimeout(() => clearInterval(initInterval), 5000);

        function changeFontSize(delta) {
            baseFontSize += delta;
            if (baseFontSize < 40) baseFontSize = 40;
            if (baseFontSize > 100) baseFontSize = 100;
            document.documentElement.style.fontSize = baseFontSize + "%";
        }

        function updateNav() {
            slides.forEach((s, i) => { s.classList.toggle('active', i === currentSlide); });
            document.getElementById('currentSlideNum').innerText = currentSlide + 1;
            // Only notify parent if this was a user-initiated navigation (not a command from parent)
            if (notifyParent) {
                try { window.parent.postMessage({ type: 'WEBSLIDE_CHANGE', index: currentSlide }, '*'); } catch(e) {}
            }
        }
        function nextSlide() { if (currentSlide < slides.length - 1) { currentSlide++; updateNav(); } }
        function prevSlide() { if (currentSlide > 0) { currentSlide--; updateNav(); } }
        function goToSlide(i) { currentSlide = i; updateNav(); }

        // Listen for GO_TO_SLIDE commands from the sidebar (disables echo during handling)
        window.addEventListener('message', function(e) {
            if (e.data && e.data.type === 'WEBSLIDE_GO_TO') {
                notifyParent = false;
                currentSlide = e.data.index;
                updateNav();
                notifyParent = true;
            }
        });

        ${hasQuiz ? `
        const quizData = JSON.parse(decodeURIComponent("${encodeURIComponent(quizDataJs)}"));
        let currentQ = 0; let score = 0; let answered = false;
        function loadQuestion() {
            answered = false; document.getElementById('next-q-btn').disabled = true;
            const q = quizData[currentQ];
            document.getElementById('q-current').innerText = currentQ + 1;
            document.getElementById('question-text').innerText = q.q;
            const optDiv = document.getElementById('options-container');
            optDiv.innerHTML = '';
            q.o.forEach((opt, idx) => {
                const b = document.createElement('div'); b.className = 'quiz-option'; b.innerText = opt;
                b.onclick = () => {
                    if (answered) return; answered = true;
                    if (idx === q.a) { b.classList.add('correct'); score += 10; }
                    else { b.classList.add('wrong'); optDiv.children[q.a].classList.add('correct'); }
                    document.getElementById('next-q-btn').disabled = false;
                };
                optDiv.appendChild(b);
            });
        }
        function nextQuestion() {
            if (currentQ < quizData.length - 1) { currentQ++; loadQuestion(); }
            else {
                document.getElementById('quiz-ui').style.display = 'none';
                document.getElementById('quiz-result').style.display = 'block';
                document.getElementById('final-score').innerText = score;
            }
        }
        function resetQuiz() {
            currentQ = 0; score = 0; answered = false;
            document.getElementById('quiz-ui').style.display = 'block';
            document.getElementById('quiz-result').style.display = 'none';
            loadQuestion();
        }
        loadQuestion();` : ''}
    </script>

    <!-- ── Floating Action Menu ── -->
    <style>
        @media print { .fab-menu { display:none !important; } }
        .fab-menu {
            position: fixed;
            bottom: 80px;
            right: 24px;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 10px;
        }
        .fab-actions {
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 8px;
            transition: all 0.25s cubic-bezier(0.4,0,0.2,1);
        }
        .fab-actions.fab-hidden {
            opacity: 0;
            pointer-events: none;
            transform: translateY(10px);
        }
        .fab-action-btn {
            display: flex;
            align-items: center;
            gap: 8px;
            background: white;
            border: 1.5px solid #e2e8f0;
            border-radius: 24px;
            padding: 10px 18px;
            font-size: 13px;
            font-weight: 700;
            color: #1e293b;
            cursor: pointer;
            box-shadow: 0 4px 20px rgba(0,0,0,0.12);
            white-space: nowrap;
            transition: all 0.2s ease;
            font-family: 'Plus Jakarta Sans', sans-serif;
        }
        .fab-action-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.15); }
        .fab-action-btn.fab-primary { background: #4f46e5; color: white; border-color: #4f46e5; }
        .fab-action-btn.fab-primary:hover { background: #4338ca; }
        .fab-toggle-btn {
            width: 50px;
            height: 50px;
            border-radius: 50%;
            background: #4f46e5;
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 20px rgba(79,70,229,0.45);
            font-size: 22px;
            font-weight: 300;
            line-height: 1;
            transition: all 0.25s ease;
            color: white;
        }
        .fab-toggle-btn:hover { transform: scale(1.1); box-shadow: 0 8px 28px rgba(79,70,229,0.55); }
        .fab-toggle-btn.fab-open { background: #64748b; transform: rotate(45deg); }
    </style>
    <div class="fab-menu" id="fabMenu">
        <div class="fab-actions fab-hidden" id="fabActions">
            <button class="fab-action-btn" onclick="fabDownloadSelf()" title="Simpan file HTML ini ke komputer">
                <span>⬇️</span> Unduh HTML
            </button>
            <button class="fab-action-btn fab-primary" onclick="window.print()" title="Cetak atau simpan sebagai PDF">
                <span>🖨️</span> Cetak / Save PDF
            </button>
        </div>
        <button class="fab-toggle-btn" id="fabToggle" onclick="fabToggle()" title="Menu Unduh">+</button>
    </div>
    <script>
        var fabIsOpen = false;
        function fabToggle() {
            fabIsOpen = !fabIsOpen;
            document.getElementById('fabActions').classList.toggle('fab-hidden', !fabIsOpen);
            document.getElementById('fabToggle').classList.toggle('fab-open', fabIsOpen);
        }
        function fabDownloadSelf() {
            try {
                var html = '<!DOCTYPE html>' + document.documentElement.outerHTML;
                var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
                var a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = (document.title || 'WebSlide') + '.html';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setTimeout(function() { URL.revokeObjectURL(a.href); }, 1000);
            } catch(e) {
                alert('Gagal mengunduh. Gunakan Ctrl+S untuk menyimpan halaman ini.');
            }
        }
    </script>
</body>
</html>`;
}
