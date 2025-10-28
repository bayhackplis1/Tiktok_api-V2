const FAVORITES_KEY = 'tiktok_favorites';

export interface Favorite {
  id: string;
  url: string;
  title: string;
  thumbnail: string;
  creator: string;
  timestamp: number;
  views?: number;
  likes?: number;
}

export function getFavorites(): Favorite[] {
  try {
    const data = localStorage.getItem(FAVORITES_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function addFavorite(favorite: Omit<Favorite, 'timestamp'>): void {
  const favorites = getFavorites();
  
  const exists = favorites.some(f => f.id === favorite.id);
  if (exists) return;
  
  const newFavorite: Favorite = {
    ...favorite,
    timestamp: Date.now()
  };
  
  favorites.unshift(newFavorite);
  
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  window.dispatchEvent(new CustomEvent('favorites-update'));
}

export function removeFavorite(id: string): void {
  const favorites = getFavorites();
  const updated = favorites.filter(f => f.id !== id);
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
  window.dispatchEvent(new CustomEvent('favorites-update'));
}

export function isFavorite(id: string): boolean {
  const favorites = getFavorites();
  return favorites.some(f => f.id === id);
}

export function toggleFavorite(favorite: Omit<Favorite, 'timestamp'>): boolean {
  if (isFavorite(favorite.id)) {
    removeFavorite(favorite.id);
    return false;
  } else {
    addFavorite(favorite);
    return true;
  }
}
