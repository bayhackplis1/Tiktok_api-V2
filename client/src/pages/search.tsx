import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Search, Video, User, Eye, Heart, MessageCircle, Share2, Clock, Calendar, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";

interface TikTokSearchResult {
  id: string;
  type: "video" | "user";
  url: string;
  thumbnail: string;
  title?: string;
  description?: string;
  username?: string;
  nickname?: string;
  avatar?: string;
  verified?: boolean;
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  duration?: string;
  uploadDate?: string;
  followerCount?: number;
  videoCount?: number;
  bio?: string;
}

interface SearchResponse {
  results: TikTokSearchResult[];
  query: string;
  totalResults: number;
}

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<TikTokSearchResult[]>([]);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Auto-cargar usuario desde búsqueda por palabras clave
  useEffect(() => {
    const pendingUser = localStorage.getItem("pendingUserSearch");
    if (pendingUser) {
      localStorage.removeItem("pendingUserSearch");
      setSearchQuery(pendingUser);
      // Auto-submit después de un pequeño delay
      setTimeout(() => {
        searchMutation.mutate(pendingUser);
      }, 100);
    }
  }, []);

  const searchMutation = useMutation({
    mutationFn: async (query: string) => {
      const response = await apiRequest("POST", "/api/tiktok/search", { query, limit: 15 });
      return await response.json() as SearchResponse;
    },
    onSuccess: (data) => {
      setResults(data.results);
      toast({
        title: "Búsqueda completada",
        description: `Se encontraron ${data.totalResults} resultados para "${data.query}"`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error en la búsqueda",
        description: error instanceof Error ? error.message : "No se pudo completar la búsqueda",
        variant: "destructive",
      });
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      searchMutation.mutate(searchQuery.trim());
    }
  };

  const handleVideoClick = (url: string) => {
    // Navegar a la página principal y cargar el video
    localStorage.setItem("pendingVideoUrl", url);
    setLocation("/");
  };

  const formatNumber = (num?: number) => {
    if (!num) return "0";
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950/20 to-cyan-950/20 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
            Buscar en TikTok
          </h1>
          <p className="text-gray-400">
            Encuentra videos de tus creadores favoritos
          </p>
          <p className="text-gray-500 text-sm">
            Busca por usuario usando @ (ej: @tiktok, @charlidamelio, @khaby.lame)
          </p>
        </div>

        <Card className="bg-black/40 border-purple-500/30 backdrop-blur-sm">
          <CardContent className="p-6">
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-purple-400" />
                <Input
                  type="text"
                  placeholder='Busca @tiktok o @charlidamelio...'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-black/50 border-purple-500/30 text-white pl-11 h-12"
                  data-testid="input-search-query"
                />
              </div>
              <Button
                type="submit"
                disabled={searchMutation.isPending || !searchQuery.trim()}
                className="bg-purple-600 hover:bg-purple-700 text-white h-12 px-8"
                data-testid="button-search"
              >
                <Search className="h-5 w-5 mr-2" />
                Buscar
              </Button>
            </form>
          </CardContent>
        </Card>

        {searchMutation.isPending && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="bg-black/40 border-purple-500/30 backdrop-blur-sm">
                <CardContent className="p-4">
                  <Skeleton className="w-full aspect-[9/16] mb-3 rounded-lg bg-purple-500/10" />
                  <Skeleton className="h-4 w-3/4 mb-2 bg-purple-500/10" />
                  <Skeleton className="h-3 w-1/2 bg-purple-500/10" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!searchMutation.isPending && results.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map((result) => (
              <Card 
                key={result.id} 
                className="bg-black/40 border-purple-500/30 backdrop-blur-sm group hover:border-purple-500/50 transition-all cursor-pointer"
                onClick={() => handleVideoClick(result.url)}
                data-testid={`card-result-${result.id}`}
              >
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center gap-3 mb-2">
                    {result.type === "video" ? (
                      <Video className="h-5 w-5 text-purple-400" />
                    ) : (
                      <User className="h-5 w-5 text-cyan-400" />
                    )}
                    <CardTitle className="text-sm text-cyan-300 truncate flex-1">
                      {result.type === "video" ? "Video de TikTok" : "Perfil"}
                    </CardTitle>
                    {result.verified && (
                      <Sparkles className="h-4 w-4 text-blue-400" />
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="p-4 pt-0">
                  <div className="relative w-full aspect-[9/16] mb-3 rounded-lg overflow-hidden">
                    {result.thumbnail ? (
                      <img
                        src={result.thumbnail}
                        alt={result.title || result.nickname || "Video de TikTok"}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-900/20 to-cyan-900/20 flex items-center justify-center">
                        <Video className="h-16 w-16 text-cyan-400/30" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="absolute bottom-2 left-2 right-2">
                        <p className="text-white text-sm font-semibold">Click para ver detalles y descargar</p>
                      </div>
                    </div>
                    {result.duration && (
                      <div className="absolute top-2 right-2 bg-black/70 px-2 py-1 rounded text-white text-xs flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {result.duration}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      {result.avatar && (
                        <img
                          src={result.avatar}
                          alt={result.username}
                          className="w-8 h-8 rounded-full border-2 border-cyan-500/30"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-cyan-300 font-semibold text-sm truncate" data-testid={`text-nickname-${result.id}`}>
                          {result.nickname || result.username}
                        </p>
                        <p className="text-cyan-400/60 text-xs truncate">
                          @{result.username}
                        </p>
                      </div>
                    </div>

                    {result.title && (
                      <p className="text-gray-300 text-sm line-clamp-2" data-testid={`text-title-${result.id}`}>
                        {result.title}
                      </p>
                    )}

                    {result.type === "video" && (
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {result.views !== undefined && (
                          <div className="flex items-center gap-1 text-cyan-400/80">
                            <Eye className="h-3 w-3" />
                            <span>{formatNumber(result.views)}</span>
                          </div>
                        )}
                        {result.likes !== undefined && (
                          <div className="flex items-center gap-1 text-pink-400/80">
                            <Heart className="h-3 w-3" />
                            <span>{formatNumber(result.likes)}</span>
                          </div>
                        )}
                        {result.comments !== undefined && (
                          <div className="flex items-center gap-1 text-purple-400/80">
                            <MessageCircle className="h-3 w-3" />
                            <span>{formatNumber(result.comments)}</span>
                          </div>
                        )}
                        {result.shares !== undefined && (
                          <div className="flex items-center gap-1 text-cyan-400/80">
                            <Share2 className="h-3 w-3" />
                            <span>{formatNumber(result.shares)}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {result.uploadDate && (
                      <div className="flex items-center gap-1 text-xs text-cyan-400/60">
                        <Calendar className="h-3 w-3" />
                        <span>{result.uploadDate}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!searchMutation.isPending && results.length === 0 && searchQuery && (
          <Card className="cyber-card max-w-2xl mx-auto">
            <CardContent className="p-8 text-center">
              <Search className="h-12 w-12 text-cyan-400/40 mx-auto mb-4" />
              <p className="text-cyan-400/60">
                No se encontraron resultados. Intenta con otra búsqueda.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
