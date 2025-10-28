import { useState } from 'react';
import { Download, Plus, Trash2, X, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

export default function BatchDownload() {
  const [urls, setUrls] = useState<string[]>(['']);
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();

  const addUrlField = () => {
    if (urls.length < 20) {
      setUrls([...urls, '']);
    } else {
      toast({
        title: "Límite alcanzado",
        description: "Máximo 20 URLs por descarga",
        variant: "destructive"
      });
    }
  };

  const removeUrlField = (index: number) => {
    const newUrls = urls.filter((_, i) => i !== index);
    setUrls(newUrls.length > 0 ? newUrls : ['']);
  };

  const updateUrl = (index: number, value: string) => {
    const newUrls = [...urls];
    newUrls[index] = value;
    setUrls(newUrls);
  };

  const clearAll = () => {
    setUrls(['']);
  };

  const pasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const lines = text.split('\n').filter(line => line.trim().length > 0);
      
      if (lines.length > 20) {
        toast({
          title: "Demasiadas URLs",
          description: `Se detectaron ${lines.length} URLs. Solo se usarán las primeras 20.`,
          variant: "destructive"
        });
        setUrls(lines.slice(0, 20));
      } else {
        setUrls(lines.length > 0 ? lines : ['']);
        toast({
          title: "URLs pegadas",
          description: `Se agregaron ${lines.length} URLs`,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo acceder al portapapeles",
        variant: "destructive"
      });
    }
  };

  const validateUrls = () => {
    const validUrls = urls.filter(url => {
      const trimmed = url.trim();
      return trimmed.length > 0 && 
             (trimmed.includes('tiktok.com') || trimmed.includes('vm.tiktok.com'));
    });
    return validUrls;
  };

  const handleBatchDownload = async () => {
    const validUrls = validateUrls();
    
    if (validUrls.length === 0) {
      toast({
        title: "URLs inválidas",
        description: "Debes agregar al menos una URL válida de TikTok",
        variant: "destructive"
      });
      return;
    }

    setIsDownloading(true);

    try {
      const response = await fetch('/api/tiktok/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ urls: validUrls })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error en la descarga');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tiktok-batch-${validUrls.length}-videos.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "✅ Descarga completada",
        description: `${validUrls.length} videos descargados en ZIP`,
      });

      setUrls(['']);
    } catch (error) {
      toast({
        title: "Error en la descarga",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive"
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const validUrlCount = validateUrls().length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950/20 to-cyan-950/20 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
            Descarga Múltiple
          </h1>
          <p className="text-gray-400">
            Descarga hasta 20 videos de TikTok en un solo archivo ZIP
          </p>
        </div>

        {/* Stats Card */}
        <Card className="bg-black/40 border-cyan-500/30 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex flex-wrap gap-6 justify-center">
              <div className="text-center">
                <div className="text-3xl font-bold text-cyan-400">{validUrlCount}</div>
                <div className="text-sm text-gray-400">URLs válidas</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-400">{urls.length}</div>
                <div className="text-sm text-gray-400">Total campos</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-400">{20 - urls.length}</div>
                <div className="text-sm text-gray-400">Disponibles</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* URL Input Card */}
        <Card className="bg-black/40 border-purple-500/30 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-cyan-400">URLs de TikTok</CardTitle>
                <CardDescription>Agrega las URLs de los videos que quieres descargar</CardDescription>
              </div>
              <Badge variant="outline" className="border-cyan-500/50 text-cyan-400">
                {urls.length}/20
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            
            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={addUrlField}
                disabled={urls.length >= 20}
                variant="outline"
                size="sm"
                className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10"
                data-testid="button-add-url"
              >
                <Plus className="w-4 h-4 mr-1" />
                Agregar URL
              </Button>
              <Button
                onClick={pasteFromClipboard}
                variant="outline"
                size="sm"
                className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
                data-testid="button-paste-clipboard"
              >
                📋 Pegar desde portapapeles
              </Button>
              <Button
                onClick={clearAll}
                variant="outline"
                size="sm"
                className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                data-testid="button-clear-all"
              >
                <X className="w-4 h-4 mr-1" />
                Limpiar todo
              </Button>
            </div>

            {/* URL Inputs */}
            <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
              {urls.map((url, index) => (
                <div key={index} className="flex gap-2 items-center group">
                  <div className="flex-shrink-0 w-8 text-center text-sm text-gray-500">
                    {index + 1}
                  </div>
                  <Input
                    value={url}
                    onChange={(e) => updateUrl(index, e.target.value)}
                    placeholder="https://www.tiktok.com/@username/video/..."
                    className="flex-1 bg-black/50 border-gray-700 focus:border-cyan-500 text-gray-200"
                    data-testid={`input-url-${index}`}
                  />
                  <div className="flex-shrink-0">
                    {url.trim() && (url.includes('tiktok.com') || url.includes('vm.tiktok.com')) ? (
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    ) : url.trim() ? (
                      <AlertCircle className="w-5 h-5 text-red-400" />
                    ) : (
                      <div className="w-5 h-5" />
                    )}
                  </div>
                  <Button
                    onClick={() => removeUrlField(index)}
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300"
                    disabled={urls.length === 1}
                    data-testid={`button-remove-url-${index}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Download Button */}
            <Button
              onClick={handleBatchDownload}
              disabled={isDownloading || validUrlCount === 0}
              className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white font-bold py-6"
              data-testid="button-download-batch"
            >
              <Download className="w-5 h-5 mr-2" />
              {isDownloading 
                ? `Descargando ${validUrlCount} videos...` 
                : `Descargar ${validUrlCount} video${validUrlCount !== 1 ? 's' : ''} en ZIP`
              }
            </Button>

            {/* Tips */}
            <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4 space-y-2">
              <p className="text-sm font-semibold text-purple-300">💡 Consejos:</p>
              <ul className="text-xs text-gray-400 space-y-1 list-disc list-inside">
                <li>Copia varias URLs separadas por líneas y usa "Pegar desde portapapeles"</li>
                <li>Puedes descargar hasta 20 videos a la vez</li>
                <li>Los videos se empaquetarán en un archivo ZIP automáticamente</li>
                <li>URLs válidas se marcan con ✓ verde</li>
              </ul>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
