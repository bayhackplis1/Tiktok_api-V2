export interface DownloadHistoryItem {
  id: string;
  url: string;
  title: string;
  thumbnail: string;
  type: "video" | "audio" | "image" | "slideshow";
  timestamp: number;
  creator?: string;
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
}

const HISTORY_KEY = 'tiktok_download_history';
const MAX_HISTORY_ITEMS = 20;

export function getDownloadHistory(): DownloadHistoryItem[] {
  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function addToHistory(item: DownloadHistoryItem): void {
  const history = getDownloadHistory();
  
  const filtered = history.filter(h => h.id !== item.id);
  
  filtered.unshift(item);
  
  const trimmed = filtered.slice(0, MAX_HISTORY_ITEMS);
  
  localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
  window.dispatchEvent(new CustomEvent('download-history-update'));
}

export function removeFromHistory(id: string): void {
  const history = getDownloadHistory();
  const updated = history.filter(h => h.id !== id);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  window.dispatchEvent(new CustomEvent('download-history-update'));
}

export function clearHistory(): void {
  localStorage.removeItem(HISTORY_KEY);
  window.dispatchEvent(new CustomEvent('download-history-update'));
}
