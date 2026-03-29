/**
 * Converts raw technical errors from Gemini/PDF into human-friendly messages.
 */
export function getFriendlyError(error: any): string {
  const raw = (error?.message || error?.toString() || '').toLowerCase();

  // Network / connectivity
  if (raw.includes('failed to fetch') || raw.includes('networkerror') || raw.includes('network error')) {
    return 'Koneksi internet terputus. Periksa jaringan Anda dan coba lagi.';
  }

  // API Key issues
  if (raw.includes('api key') || raw.includes('api_key') || raw.includes('invalid key') || raw.includes('401') || raw.includes('unauthorized')) {
    return 'API Key tidak valid atau sudah kadaluarsa. Periksa kembali API Key di menu Settings.';
  }

  // Rate limiting / quota
  if (raw.includes('429') || raw.includes('resource_exhausted') || raw.includes('quota') || raw.includes('rate limit')) {
    return 'Server AI sedang sangat sibuk atau kuota Anda habis. Tunggu beberapa menit lalu coba lagi.';
  }

  // Timeout
  if (raw.includes('timeout') || raw.includes('timed out') || raw.includes('deadline')) {
    return 'Permintaan membutuhkan waktu terlalu lama. Coba dengan topik yang lebih singkat atau coba beberapa saat lagi.';
  }

  // Content safety / blocked
  if (raw.includes('safety') || raw.includes('blocked') || raw.includes('harmful') || raw.includes('recitation')) {
    return 'Konten tidak dapat diproses karena melanggar kebijakan AI. Coba dengan topik yang berbeda.';
  }

  // Model not found
  if (raw.includes('model') && (raw.includes('not found') || raw.includes('404'))) {
    return 'Model AI yang dipilih tidak tersedia. Coba pilih model lain di menu Settings.';
  }

  // Server errors
  if (raw.includes('500') || raw.includes('503') || raw.includes('internal server')) {
    return 'Server AI sedang mengalami gangguan. Ini bukan kesalahan Anda — coba lagi dalam beberapa menit.';
  }

  // PDF specific
  if (raw.includes('pdf') || raw.includes('extract') || raw.includes('parse')) {
    return 'Gagal membaca file PDF. Pastikan file tidak terenkripsi, tidak rusak, dan berisi teks (bukan gambar scan).';
  }

  // JSON parsing (bad AI response)
  if (raw.includes('json') || raw.includes('unexpected token') || raw.includes('syntax error')) {
    return 'AI menghasilkan respons yang tidak terbaca. Cobalah generate ulang — biasanya berhasil pada percobaan berikutnya.';
  }

  // Generic fallback
  return error?.message || 'Terjadi kesalahan yang tidak terduga. Silakan coba lagi.';
}

/**
 * Validates input prompt before generation.
 * Returns an error string if invalid, or null if valid.
 */
export function validatePrompt(prompt: string): string | null {
  const trimmed = prompt.trim();

  if (!trimmed) {
    return 'Topik tidak boleh kosong. Ketik topik atau judul WebSlide yang ingin dibuat.';
  }

  if (trimmed.length < 10) {
    return 'Topik terlalu singkat. Tuliskan minimal 10 karakter agar AI bisa memahami konteksnya.';
  }

  if (trimmed.length > 2000) {
    return 'Topik terlalu panjang. Maksimal 2000 karakter untuk mode Quick Generate.';
  }

  // Detect if input looks like random characters
  const wordCount = trimmed.split(/\s+/).length;
  const avgWordLen = trimmed.replace(/\s/g, '').length / wordCount;
  if (wordCount >= 3 && avgWordLen > 20) {
    return 'Input terlihat seperti teks acak. Masukkan topik yang jelas dan bermakna.';
  }

  return null;
}

/**
 * Validates an uploaded PDF file.
 * Returns an error string if invalid, or null if valid.
 */
export function validatePdfFile(file: File): string | null {
  if (!file) {
    return 'Tidak ada file yang dipilih.';
  }

  if (file.type !== 'application/pdf') {
    return 'Hanya file PDF yang didukung. Konversi dokumen Anda ke PDF terlebih dahulu.';
  }

  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return `Ukuran file terlalu besar (${(file.size / 1024 / 1024).toFixed(1)}MB). Maksimal 10MB. Coba kompres PDF Anda terlebih dahulu.`;
  }

  if (file.size < 1024) { // Less than 1KB = almost certainly empty
    return 'File PDF tampak kosong atau rusak. Pastikan file berisi konten yang valid.';
  }

  return null;
}

/**
 * Progress step definitions for the generation pipeline.
 */
export interface ProgressStep {
  label: string;
  icon: string;
  description: string;
}

export const GENERATION_STEPS: ProgressStep[] = [
  { label: 'Mempersiapkan', icon: '⚙️', description: 'Menyiapkan data dan parameter generasi...' },
  { label: 'Analisis AI', icon: '🧠', description: 'AI sedang membaca dan memahami konten...' },
  { label: 'Strukturisasi', icon: '📐', description: 'Menyusun struktur bab dan alur materi...' },
  { label: 'Render Slide', icon: '🎨', description: 'Membuat setiap slide secara detail...' },
  { label: 'Ilustrasi', icon: '🖼️', description: 'Menghasilkan gambar ilustrasi AI...' },
  { label: 'Kuis', icon: '📝', description: 'Membuat soal kuis evaluasi...' },
  { label: 'Finalisasi', icon: '✅', description: 'Menyatukan dan memvalidasi semua konten...' },
];
