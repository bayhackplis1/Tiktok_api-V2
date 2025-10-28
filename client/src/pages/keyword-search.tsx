import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Video, User, Eye, Heart, MessageCircle, Share2, Music, PlayCircle, Download } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type SearchType = 'video' | 'user';

interface VideoResult {
  id: string;
  desc: string;
  createTime: number;
  type: 'video';
  author: {
    id: string;
    uniqueId: string;
    nickname: string;
    avatarThumb: string;
    verified: boolean;
  };
  stats: {
    likeCount: number;
    shareCount: number;
    commentCount: number;
    playCount: number;
  };
  video: {
    cover: string;
    playAddr: string;
    downloadAddr: string;
    duration: number;
  };
  music: {
    title: string;
    authorName: string;
  };
}

interface UserResult {
  type: 'user';
  uid: string;
  username: string;
  nickname: string;
  avatarThumb: any;
  signature: string;
  isVerified: boolean;
  followerCount: number;
  followingCount?: number;
  videoCount?: number;
  likeCount?: number;
}

type SearchResult = VideoResult | UserResult;

export default function KeywordSearch() {
  const [keyword, setKeyword] = useState("");
  const [searchType, setSearchType] = useState<SearchType>('video');
  const [searchQuery, setSearchQuery] = useState<{ keyword: string; type: SearchType } | null>(null);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const handleVideoClick = (videoId: string, username: string) => {
    // Construir la URL del video de TikTok
    const tiktokUrl = `https://www.tiktok.com/@${username}/video/${videoId}`;
    // Guardar en localStorage y navegar a la página de inicio
    localStorage.setItem("pendingVideoUrl", tiktokUrl);
    setLocation("/");
  };

  const handleUserClick = (username: string) => {
    // Guardar el usuario en localStorage y navegar a la página de búsqueda por @
    console.log("Clicking user:", username);
    localStorage.setItem("pendingUserSearch", `@${username}`);
    setLocation("/search");
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/tiktok/search/keyword', searchQuery],
    enabled: !!searchQuery,
    queryFn: async () => {
      if (!searchQuery) return null;
      
      const response = await fetch('/api/tiktok/search/keyword', {
        method: 'POST',
        body: JSON.stringify(searchQuery),
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al buscar');
      }

      return response.json();
    }
  });

  const handleSearch = () => {
    if (!keyword.trim()) {
      toast({
        title: "Error",
        description: "Ingresa una palabra clave para buscar",
        variant: "destructive"
      });
      return;
    }

    setSearchQuery({ keyword: keyword.trim(), type: searchType });
  };

  const formatNumber = (num: number | undefined | null) => {
    if (!num && num !== 0) return "0";
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getResultId = (result: SearchResult): string => {
    if (result.type === 'user') return result.uid;
    return result.id;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950/20 to-cyan-950/20 p-4 md:p-8">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8 animate-fade-in-up">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
              Búsqueda por Palabras Clave
            </h1>
            <p className="text-purple-200/80 text-lg">
              Busca videos y usuarios en TikTok
            </p>
          </div>

          <Card className="bg-black/40 border-purple-500/30 backdrop-blur-sm mb-8 animate-fade-in-up">
            <CardHeader>
              <CardTitle className="text-purple-300 flex items-center gap-2">
                <Search className="h-5 w-5" />
                Buscar Contenido
              </CardTitle>
              <CardDescription className="text-purple-200/60">
                Ingresa una palabra clave y selecciona el tipo de contenido que deseas buscar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs value={searchType} onValueChange={(v) => setSearchType(v as SearchType)}>
                <TabsList className="grid w-full grid-cols-2 bg-purple-900/20">
                  <TabsTrigger value="video" className="data-[state=active]:bg-purple-500/30" data-testid="tab-video">
                    <Video className="h-4 w-4 mr-2" />
                    Videos
                  </TabsTrigger>
                  <TabsTrigger value="user" className="data-[state=active]:bg-cyan-500/30" data-testid="tab-user">
                    <User className="h-4 w-4 mr-2" />
                    Usuarios
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="flex gap-2">
                <Input
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder={
                    searchType === 'video' ? "Ej: baile, comedia, tutorial..." :
                    "Ej: nombre de usuario..."
                  }
                  className="bg-black/30 border-purple-500/30 text-purple-100 placeholder:text-purple-300/50"
                  data-testid="input-keyword"
                />
                <Button 
                  onClick={handleSearch}
                  disabled={isLoading}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  data-testid="button-search"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Buscar
                </Button>
              </div>
            </CardContent>
          </Card>

          {isLoading && (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-black/40 border border-purple-500/30 rounded-lg p-6 animate-pulse">
                  <div className="h-48 bg-purple-500/20 rounded-lg mb-4"></div>
                  <div className="h-4 bg-purple-500/20 rounded mb-2"></div>
                  <div className="h-4 bg-purple-500/20 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          )}

          {error && (
            <Card className="bg-red-950/40 border-red-500/30 backdrop-blur-sm">
              <CardContent className="pt-6">
                <p className="text-red-300 text-center">
                  {error instanceof Error ? error.message : 'Error al realizar la búsqueda'}
                </p>
              </CardContent>
            </Card>
          )}

          {data && data.results && data.results.length > 0 && (
            <div className="space-y-4 animate-fade-in-up">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-purple-300">
                  {data.totalResults} resultados para "{data.keyword}"
                </h2>
                <Badge className="bg-purple-500/30 text-purple-200">
                  Tipo: {data.type === 'video' ? 'Videos' : 'Usuarios'}
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.results.map((result: SearchResult) => (
                  <Card 
                    key={getResultId(result)} 
                    className="bg-black/40 border-purple-500/30 backdrop-blur-sm hover:border-purple-400/50 transition-all hover:shadow-lg hover:shadow-purple-500/20"
                    data-testid={`result-${result.type}-${getResultId(result)}`}
                  >
                    <CardContent className="p-4">
                      {result.type === 'video' && (
                        <div className="space-y-3">
                          <div 
                            className="relative group cursor-pointer"
                            onClick={() => handleVideoClick(result.id, result.author.uniqueId)}
                            data-testid={`video-card-${result.id}`}
                          >
                            <img 
                              src={result.video.cover} 
                              alt={result.desc}
                              className="w-full h-48 object-cover rounded-lg"
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex flex-col items-center justify-center gap-2">
                              <Download className="h-12 w-12 text-cyan-400" />
                              <span className="text-white font-semibold text-sm">Click para descargar</span>
                            </div>
                            <Badge className="absolute top-2 right-2 bg-black/70">
                              {formatDuration(result.video.duration)}
                            </Badge>
                          </div>
                          
                          <div className="space-y-2">
                            <p className="text-purple-100 text-sm line-clamp-2">
                              {result.desc || 'Sin descripción'}
                            </p>
                            
                            <div className="flex items-center gap-2">
                              <img 
                                src={result.author.avatarThumb} 
                                alt={result.author.nickname}
                                className="w-6 h-6 rounded-full"
                              />
                              <span className="text-purple-300 text-sm">
                                @{result.author.uniqueId}
                              </span>
                              {result.author.verified && (
                                <Badge variant="secondary" className="text-xs">✓</Badge>
                              )}
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs text-purple-200/70">
                              <div className="flex items-center gap-1">
                                <Eye className="h-3 w-3" />
                                {formatNumber(result.stats.playCount)}
                              </div>
                              <div className="flex items-center gap-1">
                                <Heart className="h-3 w-3" />
                                {formatNumber(result.stats.likeCount)}
                              </div>
                              <div className="flex items-center gap-1">
                                <MessageCircle className="h-3 w-3" />
                                {formatNumber(result.stats.commentCount)}
                              </div>
                              <div className="flex items-center gap-1">
                                <Share2 className="h-3 w-3" />
                                {formatNumber(result.stats.shareCount)}
                              </div>
                            </div>

                            {result.music && (
                              <div className="flex items-center gap-1 text-xs text-purple-300/60">
                                <Music className="h-3 w-3" />
                                <span className="line-clamp-1">{result.music.title}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {result.type === 'user' && (
                        <div 
                          className="space-y-3 cursor-pointer"
                          onClick={() => handleUserClick(result.username)}
                          data-testid={`user-card-${result.username}`}
                        >
                          <div className="flex items-center gap-3">
                            <img 
                              src={result.avatarThumb?.url_list?.[0] || result.avatarThumb} 
                              alt={result.nickname}
                              className="w-16 h-16 rounded-full"
                            />
                            <div className="flex-1">
                              <h3 className="text-purple-100 font-semibold flex items-center gap-1">
                                {result.nickname}
                                {result.isVerified && <Badge variant="secondary" className="text-xs">✓</Badge>}
                              </h3>
                              <p className="text-purple-300 text-sm">@{result.username}</p>
                            </div>
                          </div>

                          {result.signature && (
                            <p className="text-purple-200/70 text-sm line-clamp-2">
                              {result.signature}
                            </p>
                          )}

                          <div className="grid grid-cols-2 gap-2 text-sm text-purple-200/80">
                            <div>
                              <span className="block font-semibold">{formatNumber(result.followerCount)}</span>
                              <span className="text-xs text-purple-300/60">Seguidores</span>
                            </div>
                            <div>
                              <span className="block font-semibold">{formatNumber(result.videoCount)}</span>
                              <span className="text-xs text-purple-300/60">Videos</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-center gap-2 text-cyan-400 text-sm pt-2 border-t border-purple-500/30">
                            <User className="h-4 w-4" />
                            <span>Click para ver videos</span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {data && data.results && data.results.length === 0 && (
            <Card className="bg-black/40 border-purple-500/30 backdrop-blur-sm">
              <CardContent className="pt-6">
                <p className="text-purple-300 text-center">
                  No se encontraron resultados para "{data.keyword}"
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
