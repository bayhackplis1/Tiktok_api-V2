const RECENT_URLS_KEY = 'tiktok_recent_urls';
const MAX_RECENT_URLS = 10;

export interface RecentUrl {
  url: string;
  timestamp: number;
  title?: string;
}

export function getRecentUrls(): RecentUrl[] {
  try {
    const data = localStorage.getItem(RECENT_URLS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function addRecentUrl(url: string, title?: string): void {
  const recent = getRecentUrls();
  
  const filtered = recent.filter(item => item.url !== url);
  
  const newEntry: RecentUrl = {
    url,
    timestamp: Date.now(),
    title
  };
  
  filtered.unshift(newEntry);
  
  const updated = filtered.slice(0, MAX_RECENT_URLS);
  
  localStorage.setItem(RECENT_URLS_KEY, JSON.stringify(updated));
}

export function clearRecentUrls(): void {
  localStorage.removeItem(RECENT_URLS_KEY);
}
