/**
 * Local History Manager — saves up to MAX_HISTORY WebSlide items in localStorage.
 * Records are automatically cleaned up after EXPIRY_DAYS days.
 */

import { WebSlideJson } from './geminiApi';

const STORAGE_KEY = 'webslide_history';
const MAX_HISTORY = 5;
const EXPIRY_DAYS = 7;

export interface HistoryItem {
  id: string;
  title: string;
  author: string;
  course: string;
  slideCount: number;
  templateId: string;
  html: string;
  data: WebSlideJson;
  createdAt: number; // timestamp ms
}

/** Load all history items from localStorage (cleaned of expired ones). */
export function loadHistory(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    
    const items: HistoryItem[] = JSON.parse(raw);
    const cutoff = Date.now() - EXPIRY_DAYS * 24 * 60 * 60 * 1000;
    
    // Filter out expired items
    return items.filter((item) => item.createdAt > cutoff);
  } catch {
    return [];
  }
}

/** Save a new WebSlide to history (prepend, keep max MAX_HISTORY). */
export function saveToHistory(
  data: WebSlideJson,
  html: string,
  templateId: string
): void {
  try {
    const existing = loadHistory();

    const newItem: HistoryItem = {
      id: `ws_${Date.now()}`,
      title: data.title || 'Tanpa Judul',
      author: data.author || '',
      course: data.course || '',
      slideCount: data.slides?.length || 0,
      templateId,
      html,
      data,
      createdAt: Date.now(),
    };

    // Remove duplicate with same title if exists
    const filtered = existing.filter(
      (item) => item.title.toLowerCase() !== newItem.title.toLowerCase()
    );

    // Prepend and keep max
    const updated = [newItem, ...filtered].slice(0, MAX_HISTORY);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage errors (e.g. quota exceeded for large HTML)
    console.warn('Failed to save WebSlide to history (storage may be full).');
  }
}

/** Remove a specific item by id. */
export function removeFromHistory(id: string): void {
  try {
    const existing = loadHistory();
    const updated = existing.filter((item) => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {}
}

/** Format a timestamp relative to now (e.g. "Baru Saja", "2 Jam Lalu"). */
export function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 2) return 'Baru Saja';
  if (minutes < 60) return `${minutes} Menit Lalu`;
  if (hours < 24) return `${hours} Jam Lalu`;
  if (days === 1) return 'Kemarin';
  return `${days} Hari Lalu`;
}
