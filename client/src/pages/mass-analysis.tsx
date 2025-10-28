import { useState } from 'react';
import { Search, Download, TrendingUp, Users, Eye, Heart, MessageCircle, Share2, X, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface VideoMetadata {
  success: boolean;
  url: string;
  data?: {
    id: string;
    title: string;
    description: string;
    creator: string;
    views: number;
    likes: number;
    comments: number;
    shares: number;
    duration: number;
    uploadDate: string;
    thumbnail: string;
    music: {
      title: string;
      author: string;
    };
  };
  error?: string;
}

interface AnalysisResult {
  total: number;
  successful: number;
  failed: number;
  results: VideoMetadata[];
}

export default function MassAnalysis() {
  const [urls, setUrls] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<AnalysisResult | null>(null);
  const { toast } = useToast();

  const handleAnalyze = async () => {
    const urlList = urls
      .split('\n')
      .map(url => url.trim())
      .filter(url => url.length > 0);

    if (urlList.length === 0) {
      toast({
        title: "URLs faltantes",
        description: "Agrega al menos una URL de TikTok",
        variant: "destructive"
      });
      return;
    }

    if (urlList.length > 50) {
      toast({
        title: "Demasiadas URLs",
        description: "Máximo 50 URLs por análisis",
        variant: "destructive"
      });
      return;
    }

    setIsAnalyzing(true);

    try {
      const response = await fetch('/api/tiktok/metadata/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ urls: urlList })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error en el análisis');
      }

      const data: AnalysisResult = await response.json();
      setResults(data);

      toast({
        title: "✅ Análisis completado",
        description: `${data.successful} videos analizados correctamente`,
      });
    } catch (error) {
      toast({
        title: "Error en el análisis",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const exportToCSV = () => {
    if (!results) return;

    const successfulResults = results.results.filter(r => r.success && r.data);
    const csvHeader = 'Creator,Title,Views,Likes,Comments,Shares,Duration,Upload Date,URL\n';
    const csvRows = successfulResults.map(r => {
      const d = r.data!;
      return `"${d.creator}","${d.title}",${d.views},${d.likes},${d.comments},${d.shares},${d.duration},"${d.uploadDate}","${r.url}"`;
    }).join('\n');

    const csv = csvHeader + csvRows;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tiktok-analysis-${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "CSV exportado",
      description: `${successfulResults.length} videos exportados`,
    });
  };

  const exportToJSON = () => {
    if (!results) return;

    const json = JSON.stringify(results, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tiktok-analysis-${Date.now()}.json`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "JSON exportado",
      description: "Datos completos exportados",
    });
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const getTotalStats = () => {
    if (!results) return { views: 0, likes: 0, comments: 0, shares: 0 };

    const successfulResults = results.results.filter(r => r.success && r.data);
    return successfulResults.reduce((acc, r) => ({
      views: acc.views + (r.data?.views || 0),
      likes: acc.likes + (r.data?.likes || 0),
      comments: acc.comments + (r.data?.comments || 0),
      shares: acc.shares + (r.data?.shares || 0)
    }), { views: 0, likes: 0, comments: 0, shares: 0 });
  };

  const totalStats = getTotalStats();
  const urlCount = urls.split('\n').filter(u => u.trim().length > 0).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950/20 to-cyan-950/20 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
            Análisis Masivo
          </h1>
          <p className="text-gray-400">
            Extrae metadata de hasta 50 videos de TikTok sin descargarlos
          </p>
        </div>

        {/* Input Card */}
        <Card className="bg-black/40 border-purple-500/30 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-cyan-400">URLs para Analizar</CardTitle>
            <CardDescription>Pega una URL por línea (máximo 50)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <textarea
                value={urls}
                onChange={(e) => setUrls(e.target.value)}
                placeholder="https://www.tiktok.com/@username/video/123&#10;https://www.tiktok.com/@username/video/456&#10;https://www.tiktok.com/@username/video/789"
                className="w-full h-64 bg-black/50 border border-gray-700 rounded-lg p-4 text-gray-200 font-mono text-sm focus:border-cyan-500 focus:outline-none resize-none"
                data-testid="textarea-urls"
              />
              <Badge 
                variant="outline" 
                className={`absolute top-2 right-2 ${
                  urlCount > 50 ? 'border-red-500 text-red-400' : 'border-cyan-500 text-cyan-400'
                }`}
              >
                {urlCount}/50
              </Badge>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleAnalyze}
                disabled={isAnalyzing || urlCount === 0}
                className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white font-bold"
                data-testid="button-analyze"
              >
                <Search className="w-5 h-5 mr-2" />
                {isAnalyzing ? 'Analizando...' : `Analizar ${urlCount} video${urlCount !== 1 ? 's' : ''}`}
              </Button>
              <Button
                onClick={() => setUrls('')}
                variant="outline"
                className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                data-testid="button-clear"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {results && (
          <>
            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-black/40 border-cyan-500/30">
                <CardContent className="p-6 text-center">
                  <Eye className="w-8 h-8 mx-auto mb-2 text-cyan-400" />
                  <div className="text-2xl font-bold text-cyan-400">{formatNumber(totalStats.views)}</div>
                  <div className="text-sm text-gray-400">Vistas Totales</div>
                </CardContent>
              </Card>

              <Card className="bg-black/40 border-purple-500/30">
                <CardContent className="p-6 text-center">
                  <Heart className="w-8 h-8 mx-auto mb-2 text-purple-400" />
                  <div className="text-2xl font-bold text-purple-400">{formatNumber(totalStats.likes)}</div>
                  <div className="text-sm text-gray-400">Likes Totales</div>
                </CardContent>
              </Card>

              <Card className="bg-black/40 border-green-500/30">
                <CardContent className="p-6 text-center">
                  <MessageCircle className="w-8 h-8 mx-auto mb-2 text-green-400" />
                  <div className="text-2xl font-bold text-green-400">{formatNumber(totalStats.comments)}</div>
                  <div className="text-sm text-gray-400">Comentarios</div>
                </CardContent>
              </Card>

              <Card className="bg-black/40 border-orange-500/30">
                <CardContent className="p-6 text-center">
                  <Share2 className="w-8 h-8 mx-auto mb-2 text-orange-400" />
                  <div className="text-2xl font-bold text-orange-400">{formatNumber(totalStats.shares)}</div>
                  <div className="text-sm text-gray-400">Compartidos</div>
                </CardContent>
              </Card>
            </div>

            {/* Results Table */}
            <Card className="bg-black/40 border-purple-500/30 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-cyan-400">Resultados del Análisis</CardTitle>
                    <CardDescription>
                      {results.successful} exitosos · {results.failed} fallidos
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={exportToCSV}
                      variant="outline"
                      size="sm"
                      className="border-green-500/50 text-green-400 hover:bg-green-500/10"
                      data-testid="button-export-csv"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      CSV
                    </Button>
                    <Button
                      onClick={exportToJSON}
                      variant="outline"
                      size="sm"
                      className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
                      data-testid="button-export-json"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      JSON
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border border-gray-800 overflow-hidden">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-gray-800">
                          <TableHead className="text-gray-400">#</TableHead>
                          <TableHead className="text-gray-400">Estado</TableHead>
                          <TableHead className="text-gray-400">Creador</TableHead>
                          <TableHead className="text-gray-400">Título</TableHead>
                          <TableHead className="text-gray-400 text-right">Vistas</TableHead>
                          <TableHead className="text-gray-400 text-right">Likes</TableHead>
                          <TableHead className="text-gray-400 text-right">Comentarios</TableHead>
                          <TableHead className="text-gray-400 text-right">Shares</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {results.results.map((result, index) => (
                          <TableRow key={index} className="border-gray-800">
                            <TableCell className="text-gray-500">{index + 1}</TableCell>
                            <TableCell>
                              {result.success ? (
                                <CheckCircle className="w-5 h-5 text-green-400" />
                              ) : (
                                <AlertCircle className="w-5 h-5 text-red-400" />
                              )}
                            </TableCell>
                            {result.success && result.data ? (
                              <>
                                <TableCell className="text-cyan-400 font-medium">
                                  @{result.data.creator}
                                </TableCell>
                                <TableCell className="text-gray-300 max-w-xs truncate">
                                  {result.data.title}
                                </TableCell>
                                <TableCell className="text-right text-gray-300">
                                  {formatNumber(result.data.views)}
                                </TableCell>
                                <TableCell className="text-right text-purple-400">
                                  {formatNumber(result.data.likes)}
                                </TableCell>
                                <TableCell className="text-right text-green-400">
                                  {formatNumber(result.data.comments)}
                                </TableCell>
                                <TableCell className="text-right text-orange-400">
                                  {formatNumber(result.data.shares)}
                                </TableCell>
                              </>
                            ) : (
                              <TableCell colSpan={6} className="text-red-400 text-sm">
                                {result.error || 'Error desconocido'}
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Tips */}
        {!results && (
          <Card className="bg-purple-900/20 border-purple-500/30">
            <CardContent className="p-6">
              <p className="text-sm font-semibold text-purple-300 mb-3">💡 Casos de uso:</p>
              <ul className="text-sm text-gray-400 space-y-2 list-disc list-inside">
                <li><strong>Investigación de tendencias:</strong> Analiza múltiples videos para identificar patrones</li>
                <li><strong>Análisis de competencia:</strong> Estudia el rendimiento de creadores similares</li>
                <li><strong>Base de datos:</strong> Extrae metadata para construir tu propia base de datos</li>
                <li><strong>Filtrado inteligente:</strong> Identifica videos populares antes de descargar</li>
                <li><strong>Exportación:</strong> Descarga los resultados en CSV o JSON para análisis posterior</li>
              </ul>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
}
