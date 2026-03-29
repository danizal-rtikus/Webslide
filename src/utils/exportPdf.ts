/**
 * Exports a WebSlide HTML to PDF via browser native print.
 * We inject a robust @media print stylesheet that overrides all slide animations,
 * forces landscape A4 dimensions, hides all UI controls, and breaks each slide
 * onto its own page correctly.
 */
export async function exportToPdf(
  html: string,
  title: string,
  onProgress: (current: number, total: number) => void
): Promise<void> {
  onProgress(1, 1);

  // Stronger print CSS — uses absolute mm dimensions for reliable landscape layout
  const printCss = `
<style id="webslide-print-override">
@media print {
  @page {
    size: 297mm 210mm;  /* A4 landscape exact */
    margin: 0 !important;
  }

  /* Hide ALL navigation and UI elements */
  .slide-header-global,
  .nav-controls,
  .fab-menu,
  .quiz-section,
  #fabMenu,
  .bg-decoration {
    display: none !important;
    visibility: hidden !important;
  }

  html, body {
    margin: 0 !important;
    padding: 0 !important;
    width: 297mm !important;
    height: 210mm !important;
    overflow: visible !important;
    background: white !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    color-adjust: exact !important;
  }

  .presentation-container {
    display: block !important;
    width: 297mm !important;
    height: auto !important;
    overflow: visible !important;
    position: static !important;
  }

  .slides-wrapper {
    display: block !important;
    position: static !important;
    width: 297mm !important;
    height: auto !important;
    overflow: visible !important;
  }

  /* Each slide = one landscape A4 page */
  .slide {
    display: flex !important;
    flex-direction: column !important;
    opacity: 1 !important;
    visibility: visible !important;
    transform: none !important;
    position: relative !important;
    width: 297mm !important;
    height: 210mm !important;
    min-height: 210mm !important;
    max-height: 210mm !important;
    overflow: hidden !important;
    box-sizing: border-box !important;
    page-break-after: always !important;
    break-after: page !important;
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }

  .slide:last-child {
    page-break-after: avoid !important;
    break-after: avoid !important;
  }

  /* Ensure content area fills slide */
  .content-area {
    flex: 1 !important;
    overflow: hidden !important;
  }

  /* Preserve colors and backgrounds */
  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
}
</style>`;

  // Also inject a small script to remove all transitions before printing
  const printScript = `
<script id="webslide-print-script">
window.addEventListener('load', function() {
  // Make all slides visible for print
  var slides = document.querySelectorAll('.slide');
  slides.forEach(function(s) {
    s.style.opacity = '1';
    s.style.visibility = 'visible';
    s.style.transform = 'none';
    s.style.position = 'relative';
    s.style.display = 'flex';
  });
  // Hide controls
  var controls = document.querySelectorAll('.nav-controls, .slide-header-global, .fab-menu, #fabMenu');
  controls.forEach(function(el) { el.style.display = 'none'; });
  // Trigger print after short delay for render
  setTimeout(function() { window.print(); }, 800);
});
</script>`;

  // Inject BEFORE </head> and BEFORE </body>
  let htmlWithPrint = html;
  if (htmlWithPrint.includes('</head>')) {
    htmlWithPrint = htmlWithPrint.replace('</head>', printCss + '</head>');
  } else {
    htmlWithPrint = printCss + htmlWithPrint;
  }
  if (htmlWithPrint.includes('</body>')) {
    htmlWithPrint = htmlWithPrint.replace('</body>', printScript + '</body>');
  } else {
    htmlWithPrint = htmlWithPrint + printScript;
  }

  // Open in a new window via Blob URL
  const blob = new Blob([htmlWithPrint], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, '_blank');

  if (!printWindow) {
    // Popup blocked fallback — download HTML with print instruction
    URL.revokeObjectURL(url);
    const safeTitle = title.replace(/[^a-zA-Z0-9\s\-_]/g, '').trim() || 'WebSlide';
    const fallbackBlob = new Blob([htmlWithPrint], { type: 'text/html;charset=utf-8' });
    const fallbackUrl = URL.createObjectURL(fallbackBlob);
    const a = document.createElement('a');
    a.href = fallbackUrl;
    a.download = `${safeTitle}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(fallbackUrl), 2000);
    alert(
      'Pop-up diblokir.\n\nFile HTML sudah diunduh. Buka file di browser, lalu:\n' +
      '• Tekan Ctrl+P\n• Atur Layout: Landscape\n• Atur Margin: None\n• Klik Save as PDF'
    );
    return;
  }

  setTimeout(() => URL.revokeObjectURL(url), 15000);
}
