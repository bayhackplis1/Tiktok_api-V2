import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getFavorites, removeFavorite, type Favorite } from "@/lib/favorites";
import { Star, Trash2, ExternalLink, Eye, Heart } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export function FavoritesPanel() {
  const [favorites, setFavorites] = useState<Favorite[]>([]);

  const loadFavorites = () => {
    setFavorites(getFavorites());
  };

  useEffect(() => {
    loadFavorites();

    const handleUpdate = () => {
      loadFavorites();
    };

    window.addEventListener('favorites-update', handleUpdate);
    
    return () => {
      window.removeEventListener('favorites-update', handleUpdate);
    };
  }, []);

  const handleRemove = (id: string) => {
    removeFavorite(id);
    toast({
      title: "Removed from favorites",
      description: "Video removed from your favorites",
      duration: 2000,
    });
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (favorites.length === 0) {
    return null;
  }

  return (
    <Card className="cyber-card fade-in-up" data-testid="card-favorites">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-yellow-400">
          <Star className="h-5 w-5 fill-yellow-400" />
          Favorites ({favorites.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {favorites.map((fav) => (
            <div 
              key={fav.id}
              className="group relative p-3 rounded-lg border border-yellow-500/20 bg-black/30 hover:border-yellow-500/40 transition-all hover:scale-[1.02]"
              data-testid={`favorite-${fav.id}`}
            >
              <div className="relative mb-2 overflow-hidden rounded">
                <img 
                  src={fav.thumbnail} 
                  alt={fav.title}
                  className="w-full h-32 object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              </div>

              <h4 className="text-sm font-semibold text-yellow-200 mb-2 line-clamp-2">
                {fav.title}
              </h4>

              <p className="text-xs text-yellow-300/60 mb-2">
                by {fav.creator}
              </p>

              {(fav.views || fav.likes) && (
                <div className="flex items-center gap-3 text-xs text-yellow-200/60 mb-3">
                  {fav.views && (
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {formatNumber(fav.views)}
                    </span>
                  )}
                  {fav.likes && (
                    <span className="flex items-center gap-1">
                      <Heart className="h-3 w-3" />
                      {formatNumber(fav.likes)}
                    </span>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 h-7 text-xs border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/10"
                  onClick={() => window.open(fav.url, '_blank')}
                  data-testid={`button-open-${fav.id}`}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Open
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 text-red-400 hover:bg-red-500/10"
                  onClick={() => handleRemove(fav.id)}
                  data-testid={`button-remove-fav-${fav.id}`}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
