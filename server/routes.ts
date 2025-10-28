import type { Express } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { validateTikTokUrl } from "../client/src/lib/validators";
import { spawn } from "child_process";
import { createReadStream, createWriteStream } from "fs";
import path from "path";
import { mkdir, unlink } from "fs/promises";
import { searchTikTok, searchQuerySchema } from "./search";
import archiver from "archiver";
import got from "got";
import TiktokDL from "@tobyg74/tiktok-api-dl";
import { WebSocketServer, WebSocket } from "ws";
import { db } from "../db";
import { chatMessages, insertChatMessageSchema } from "../db/schema";
import { desc, sql } from "drizzle-orm";
const tiktokInfoSchema = z.object({
  url: validateTikTokUrl,
});

// Helper seguro para ejecutar yt-dlp y obtener JSON
async function getVideoMetadataWithYtdlp(url: string): Promise<any> {
  const ytdlp = spawn('yt-dlp', [
    '--dump-json',
    '--skip-download',
    url
  ]);

  let stdout = '';
  let stderr = '';

  ytdlp.stdout.on('data', (data) => {
    stdout += data.toString();
  });

  ytdlp.stderr.on('data', (data) => {
    stderr += data.toString();
  });

  await new Promise((resolve, reject) => {
    ytdlp.on('close', (code) => {
      if (code === 0) resolve(code);
      else reject(new Error(`yt-dlp failed (exit code ${code}): ${stderr}`));
    });
  });

  return JSON.parse(stdout.trim());
}

// Funciones de utilidad para formateo (evitar duplicación)
const formatDuration = (seconds: number): string => {
  if (!seconds) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const formatFileSize = (bytes: number | null | undefined): string => {
  if (!bytes) return "N/A";
  const mb = bytes / 1024 / 1024;
  return `${mb.toFixed(2)} MB`;
};

const formatNumber = (num: number | null | undefined): string => {
  if (!num) return "0";
  return num.toLocaleString();
};

const extractHashtags = (text: string): string[] => {
  if (!text) return [];
  const hashtagRegex = /#[\w\u00C0-\u017F]+/g;
  const matches = text.match(hashtagRegex);
  return matches ? matches.map(tag => tag.slice(1)) : [];
};

const formatDate = (uploadDate: string | null, timestamp: number | null): string => {
  let date: Date | null = null;
  
  // Intentar parsear upload_date en formato YYYYMMDD
  if (uploadDate && /^\d{8}$/.test(uploadDate)) {
    const year = uploadDate.substring(0, 4);
    const month = uploadDate.substring(4, 6);
    const day = uploadDate.substring(6, 8);
    date = new Date(`${year}-${month}-${day}`);
  }
  
  // Si no funciona, intentar con timestamp Unix (en segundos)
  if (!date && timestamp) {
    date = new Date(timestamp * 1000);
  }
  
  // Si aún no hay fecha válida, retornar Unknown
  if (!date || isNaN(date.getTime())) {
    return "Unknown";
  }
  
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
};

// Helper para expandir URLs cortas de TikTok (vm.tiktok.com)
async function expandShortUrl(url: string): Promise<string> {
  try {
    // Si es una URL corta de TikTok, expandirla siguiendo la redirección
    if (url.includes('vm.tiktok.com') || url.includes('vt.tiktok.com')) {
      // Usar spawn para evitar inyección de comandos
      const curlProcess = spawn('curl', [
        '-Ls',
        '-o', '/dev/null',
        '-w', '%{url_effective}',
        url
      ]);

      let expandedUrl = '';
      
      curlProcess.stdout.on('data', (data) => {
        expandedUrl += data.toString();
      });

      await new Promise((resolve, reject) => {
        curlProcess.on('close', (code) => {
          if (code === 0) resolve(code);
          else reject(new Error(`curl exited with code ${code}`));
        });
      });

      const trimmedUrl = expandedUrl.trim();
      console.log(`Expanded short URL: ${url} -> ${trimmedUrl}`);
      return trimmedUrl;
    }
    return url;
  } catch (error) {
    console.error('Error expanding short URL:', error);
    return url;
  }
}

// Helper para convertir URLs /photo/ a /video/ para compatibilidad con yt-dlp
function normalizeTikTokUrl(url: string): string {
  // Limpiar parámetros de query que pueden causar problemas
  const cleanUrl = url.split('?')[0].split('#')[0];
  return cleanUrl.replace('/photo/', '/video/');
}

// Helper para extraer imágenes de slideshow usando @tobyg74/tiktok-api-dl
async function extractSlideshowImages(url: string): Promise<Array<{url: string, width: number, height: number}>> {
  try {
    const normalizedUrl = normalizeTikTokUrl(url);
    console.log('Fetching slideshow images from TikTok API:', normalizedUrl);
    
    // Intentar primero con la librería @tobyg74/tiktok-api-dl
    try {
      const result: any = await TiktokDL.Downloader(normalizedUrl, {
        version: "v3" // v3 es la versión más estable (MusicalDown)
      });

      console.log('TikTok API result:', result.status, result.result?.type);

      // v3 devuelve imágenes en result.images para slideshows
      if (result.status === "success" && result.result) {
        if (result.result.type === "image" && result.result.images && Array.isArray(result.result.images)) {
          const images = result.result.images.map((imgUrl: string) => ({
            url: imgUrl,
            width: 1440,
            height: 1440
          }));
          console.log(`Found ${images.length} images via TikTok API (v3)`);
          return images;
        }
        
        // Intentar estructura alternativa
        if (result.result.image && Array.isArray(result.result.image)) {
          const images = result.result.image.map((imgUrl: string) => ({
            url: imgUrl,
            width: 1440,
            height: 1440
          }));
          console.log(`Found ${images.length} images via TikTok API (alternative structure)`);
          return images;
        }
      }
    } catch (apiError) {
      console.log('TikTok API library failed:', apiError);
      console.log('Trying web scraping fallback...');
    }

    // Fallback: web scraping tradicional
    const response = await got(normalizedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.tiktok.com/',
      },
      timeout: {
        request: 10000
      }
    }).text();
    
    // Buscar múltiples patrones JSON en la página
    const patterns = [
      /<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application\/json">(.*?)<\/script>/,
      /<script id="SIGI_STATE" type="application\/json">(.*?)<\/script>/,
      /<script type="application\/json" id="__NEXT_DATA__">(.*?)<\/script>/
    ];
    
    for (const pattern of patterns) {
      const match = response.match(pattern);
      if (match && match[1]) {
        try {
          const data = JSON.parse(match[1]);
          
          // Intentar diferentes estructuras de datos
          const videoDetail = data?.__DEFAULT_SCOPE__?.["webapp.video-detail"]?.itemInfo?.itemStruct
            || data?.ItemModule?.[Object.keys(data.ItemModule || {})[0]]
            || data?.props?.pageProps?.itemInfo?.itemStruct;
          
          if (videoDetail?.imagePost?.images && Array.isArray(videoDetail.imagePost.images)) {
            console.log(`Found ${videoDetail.imagePost.images.length} images via web scraping`);
            return videoDetail.imagePost.images.map((img: any) => ({
              url: img.imageURL?.urlList?.[0] || img.imageURL?.url || img.url,
              width: img.imageWidth || 1080,
              height: img.imageHeight || 1920
            })).filter((img: any) => img.url);
          }
        } catch (parseError) {
          console.log('Failed to parse JSON pattern, trying next...');
          continue;
        }
      }
    }
    
    console.log('No slideshow images found');
    return [];
  } catch (error) {
    console.error('Error extracting slideshow images:', error);
    return [];
  }
}

export function registerRoutes(app: Express): Server {
  app.post("/api/tiktok/info", async (req, res) => {
    try {
      const { url } = tiktokInfoSchema.parse(req.body);

      // Primero expandir URLs cortas de TikTok (vm.tiktok.com)
      const expandedUrl = await expandShortUrl(url);
      
      let videoInfo: any;
      let normalizedUrl: string;
      
      // CASO ESPECIAL: Si es una URL de audio/música (/music/)
      // Buscar un video que use este audio y procesarlo en su lugar
      if (expandedUrl.includes('/music/')) {
        console.log('[Audio URL detected] Buscando video que use este audio...');
        
        try {
          // Extraer el ID del audio de la URL
          // Formato esperado: /music/nombre-7562680220437039873 o share_music_id=7562680220437039873
          let musicId = '';
          
          // Intentar extraer de share_music_id (más confiable)
          const musicIdMatch1 = expandedUrl.match(/share_music_id=(\d+)/);
          if (musicIdMatch1) {
            musicId = musicIdMatch1[1];
          }
          
          // Si no, intentar extraer de /music/nombre-ID
          if (!musicId) {
            const musicIdMatch2 = expandedUrl.match(/\/music\/[^\/]*-(\d{15,})/);
            if (musicIdMatch2) {
              musicId = musicIdMatch2[1];
            }
          }
          
          // Buscar cualquier número largo después de /music/
          if (!musicId) {
            const musicIdMatch3 = expandedUrl.match(/\/music\/.*?(\d{15,})/);
            if (musicIdMatch3) {
              musicId = musicIdMatch3[1];
            }
          }
          
          console.log(`[Audio URL] ID de audio extraído: ${musicId}`);
          
          if (!musicId || musicId.length < 15) {
            return res.status(400).json({ 
              message: "No se pudo extraer el ID del audio. Verifica que la URL sea válida." 
            });
          }
          
          // Usar la librería TikTok API para buscar videos con este audio
          const musicVideos = await TiktokDL.GetVideosByMusicId(musicId, {
            count: 5  // Obtener los primeros 5 videos
          });
          
          if (!musicVideos || musicVideos.status !== "success" || !musicVideos.result?.videos || musicVideos.result.videos.length === 0) {
            return res.status(404).json({ 
              message: "No se encontraron videos que usen este audio. Intenta con una URL de video directamente." 
            });
          }
          
          // Tomar el primer video encontrado
          const firstVideo = musicVideos.result.videos[0];
          const videoUrl = `https://www.tiktok.com/@${firstVideo.author.uniqueId}/video/${firstVideo.id}`;
          
          console.log(`[Audio URL] Video encontrado: @${firstVideo.author.uniqueId}/video/${firstVideo.id}`);
          
          // Normalizar y procesar este video en su lugar
          normalizedUrl = normalizeTikTokUrl(videoUrl);
          videoInfo = await getVideoMetadataWithYtdlp(normalizedUrl);
          
          console.log(`[Audio URL] ✓ Procesado exitosamente - ahora puedes descargar el audio`);
        } catch (audioError: any) {
          console.error('[Audio URL] Error al buscar video:', audioError.message);
          return res.status(500).json({ 
            message: "Error al buscar videos con este audio. Por favor, intenta con una URL de video que use este audio." 
          });
        }
      } else {
        // Normalizar URL: /photo/ -> /video/, quitar query params
        // yt-dlp NO puede procesar /photo/ URLs, necesita /video/
        normalizedUrl = normalizeTikTokUrl(expandedUrl);

        // Obtener información completa del video usando yt-dlp (forma segura)
        videoInfo = await getVideoMetadataWithYtdlp(normalizedUrl);
      }

      console.log('Video info extracted:', {
        title: videoInfo.title,
        creator: videoInfo.uploader || videoInfo.creator,
        views: videoInfo.view_count,
        likes: videoInfo.like_count,
        hasImages: !!videoInfo.thumbnails?.some((t: any) => t.id?.includes('image')),
        format: videoInfo.format
      });

      // Detectar tipo de contenido
      let contentType: "video" | "slideshow" | "audio" = "video";
      let images: Array<{url: string, width: number, height: number}> = [];

      // Verificar si es un slideshow (yt-dlp solo devuelve formato "audio" para slideshows)
      const isSlideshow = url.includes('/photo/') || (videoInfo.formats?.length === 1 && videoInfo.formats[0].format_id === 'audio');
      
      if (isSlideshow) {
        contentType = "slideshow";
        // Extraer imágenes del slideshow desde la API web de TikTok
        images = await extractSlideshowImages(url);
        console.log(`Detected slideshow with ${images.length} images`);
      }

      // Verificar si es solo audio
      if (url.includes('/music/') || videoInfo._type === 'audio') {
        contentType = "audio";
      }

      const responseData = {
        contentType,
        videoUrl: "/api/tiktok/download/video?url=" + encodeURIComponent(normalizedUrl),
        audioUrl: "/api/tiktok/download/audio?url=" + encodeURIComponent(normalizedUrl),
        thumbnail: videoInfo.thumbnail || (images.length > 0 ? images[0].url : "https://picsum.photos/seed/tiktok/1280/720"),
        title: videoInfo.title || videoInfo.description || "TikTok Content",
        description: videoInfo.description || videoInfo.title || "No description available",
        
        // Imágenes (solo para slideshows)
        images: images.length > 0 ? images : undefined,

        // Metadatos técnicos del video
        metadata: {
          duration: formatDuration(videoInfo.duration),
          videoSize: formatFileSize(videoInfo.filesize || videoInfo.filesize_approx),
          audioSize: formatFileSize(videoInfo.audio_filesize || videoInfo.filesize_approx * 0.1),
          resolution: `${videoInfo.width || 1080}x${videoInfo.height || 1920}`,
          format: videoInfo.ext?.toUpperCase() || "MP4",
          codec: videoInfo.vcodec || "H.264",
          fps: videoInfo.fps || 30,
          bitrate: videoInfo.tbr ? `${Math.round(videoInfo.tbr)} kbps` : "N/A",
          width: videoInfo.width || 1080,
          height: videoInfo.height || 1920,
          audioCodec: videoInfo.acodec || "AAC",
          audioChannels: videoInfo.audio_channels || 2,
          audioSampleRate: videoInfo.asr ? `${(videoInfo.asr / 1000).toFixed(1)} kHz` : "44.1 kHz",
        },

        // Información del creador
        creator: {
          username: videoInfo.uploader_id || videoInfo.uploader || "Unknown",
          nickname: videoInfo.uploader || videoInfo.creator || "TikTok User",
          avatar: videoInfo.uploader_url || videoInfo.channel_url,
          verified: videoInfo.uploader_verified || false,
        },

        // Estadísticas del video
        stats: {
          views: videoInfo.view_count || 0,
          likes: videoInfo.like_count || 0,
          comments: videoInfo.comment_count || 0,
          shares: videoInfo.repost_count || 0,
          favorites: videoInfo.bookmark_count || 0,
        },

        // Información del audio
        audio: {
          title: videoInfo.track || videoInfo.alt_title || "Original Sound",
          author: videoInfo.artist || videoInfo.uploader || "Unknown Artist",
        },

        // Hashtags
        hashtags: extractHashtags(videoInfo.description || videoInfo.title || ""),

        // Fecha de subida
        uploadDate: formatDate(videoInfo.upload_date, videoInfo.timestamp),

        // ID del video
        videoId: videoInfo.id || videoInfo.display_id || "unknown",
      };

      res.json(responseData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: error.errors[0].message });
      } else {
        console.error('Error getting video info:', error);
        res.status(500).json({ message: "Failed to process TikTok URL" });
      }
    }
  });

  app.get("/api/tiktok/download/:type", async (req, res) => {
    try {
      const { type } = req.params;
      const url = req.query.url as string;
      const imageIndex = req.query.imageIndex as string | undefined;

      if (!url) {
        return res.status(400).json({ message: "URL is required" });
      }

      const tempPath = path.join(process.cwd(), "temp");
      await mkdir(tempPath, { recursive: true });

      const timestamp = Date.now();
      
      // Primero expandir URLs cortas de TikTok (vm.tiktok.com)
      const expandedUrl = await expandShortUrl(url);
      
      // Luego normalizar URL (/photo/ -> /video/, quitar query params)
      const normalizedUrl = normalizeTikTokUrl(expandedUrl);

      // Detectar si es un slideshow usando yt-dlp metadata
      let isSlideshow = false;
      try {
        const ytdlpCheck = spawn('yt-dlp', ['--dump-json', '--skip-download', normalizedUrl]);
        
        let jsonOutput = '';
        ytdlpCheck.stdout.on('data', (data) => {
          jsonOutput += data.toString();
        });

        await new Promise((resolve, reject) => {
          ytdlpCheck.on('close', (code) => {
            if (code === 0) resolve(code);
            else reject(new Error(`yt-dlp check exited with code ${code}`));
          });
        });

        const metadata = JSON.parse(jsonOutput);
        // Los slideshows solo tienen formato "audio" sin video
        isSlideshow = metadata.formats?.length === 1 && metadata.formats[0].format_id === 'audio';
        console.log(`Slideshow detection: ${isSlideshow} (formats: ${metadata.formats?.length})`);
      } catch (err) {
        console.error('Error detecting slideshow:', err);
        // Fallback: verificar si la URL original tenía /photo/
        isSlideshow = url.includes('/photo/');
      }

      // Si es una descarga de imagen (slideshow)
      if (type === 'image') {
        // Extraer TODAS las imágenes del slideshow
        console.log('Extracting all slideshow images...');
        const images = await extractSlideshowImages(expandedUrl);
        
        if (!images || images.length === 0) {
          return res.status(404).json({ 
            message: "No se encontraron imágenes en este slideshow. Intenta descargar el audio en su lugar." 
          });
        }
        
        console.log(`Found ${images.length} images in slideshow`);

        // Si se solicita una imagen específica (siempre será el preview/thumbnail en este caso)
        if (imageIndex !== undefined) {
          const idx = parseInt(imageIndex);
          if (idx >= 0 && idx < images.length) {
            const imageUrl = images[idx].url;
            
            // Descargar la imagen usando spawn (más seguro con caracteres especiales)
            const imageFile = path.join(tempPath, `tiktok-image-${timestamp}-${idx}.jpg`);
            
            try {
              const curlDownload = spawn('curl', [
                '-L',
                '-o', imageFile,
                imageUrl
              ]);

              let curlError = '';
              curlDownload.stderr.on('data', (data) => {
                curlError += data.toString();
              });

              await new Promise((resolve, reject) => {
                curlDownload.on('close', (code) => {
                  if (code === 0) resolve(code);
                  else reject(new Error(`curl download failed with code ${code}: ${curlError}`));
                });
              });

              console.log(`Image ${idx} downloaded successfully to ${imageFile}`);
              
              res.setHeader('Content-Type', 'image/jpeg');
              res.setHeader('Content-Disposition', `attachment; filename="tiktok-slideshow-image-${idx + 1}.jpg"`);
              
              const fileStream = createReadStream(imageFile);
              fileStream.pipe(res);
              
              // Limpiar archivo temporal después de enviarlo
              fileStream.on('close', () => {
                unlink(imageFile).catch(err => console.error('Error deleting temp file:', err));
              });
              
              return;
            } catch (downloadError) {
              console.error('Error downloading image:', downloadError);
              return res.status(500).json({ 
                message: "Error al descargar la imagen. Intenta de nuevo." 
              });
            }
          } else {
            return res.status(404).json({ message: "Imagen no encontrada" });
          }
        }

        // Descargar TODAS las imágenes como ZIP
        console.log(`Downloading all ${images.length} images as ZIP`);
        
        const zipFile = path.join(tempPath, `tiktok-slideshow-${timestamp}.zip`);
        const output = createWriteStream(zipFile);
        const archive = archiver('zip', { zlib: { level: 9 } });
        
        archive.pipe(output);
        
        // Descargar todas las imágenes y agregarlas al ZIP
        try {
          for (let i = 0; i < images.length; i++) {
            const imageUrl = images[i].url;
            const imageFile = path.join(tempPath, `image-${i + 1}.jpg`);
            
            // Descargar cada imagen con curl
            const curlDownload = spawn('curl', [
              '-L',
              '-o', imageFile,
              imageUrl
            ]);

            await new Promise((resolve, reject) => {
              curlDownload.on('close', (code) => {
                if (code === 0) resolve(code);
                else reject(new Error(`Failed to download image ${i + 1}`));
              });
            });

            // Agregar al ZIP
            archive.file(imageFile, { name: `image-${i + 1}.jpg` });
          }
          
          await archive.finalize();
          
          await new Promise((resolve, reject) => {
            output.on('close', resolve);
            output.on('error', reject);
          });
          
          console.log(`ZIP created with ${images.length} images: ${zipFile}`);
          
          res.setHeader('Content-Type', 'application/zip');
          res.setHeader('Content-Disposition', `attachment; filename="tiktok-slideshow-images.zip"`);
          
          const fileStream = createReadStream(zipFile);
          fileStream.pipe(res);
          
          // Limpiar archivos temporales
          fileStream.on('close', async () => {
            try {
              await unlink(zipFile);
              for (let i = 0; i < images.length; i++) {
                await unlink(path.join(tempPath, `image-${i + 1}.jpg`)).catch(() => {});
              }
            } catch (err) {
              console.error('Error cleaning up temp files:', err);
            }
          });
          
          return;
        } catch (error) {
          console.error('Error creating ZIP:', error);
          return res.status(500).json({ 
            message: "Error al crear el archivo ZIP con las imágenes." 
          });
        }
      }

      // Si es una descarga de video pero es un slideshow, crear video compilado con las imágenes
      if (type === 'video' && isSlideshow) {
        console.log('Slideshow detected - creating compiled video with images and audio');
        const outputFile = path.join(tempPath, `tiktok-slideshow-video-${timestamp}.mp4`);

        // TikTok usa formato especial para slideshows - yt-dlp puede crear el video directamente
        const ytdlp = spawn('yt-dlp', [
          '--format', 'best',
          '--force-overwrites',
          '--merge-output-format', 'mp4',
          '-o', outputFile,
          normalizedUrl
        ]);

        await new Promise((resolve, reject) => {
          ytdlp.on('close', (code) => {
            if (code === 0) resolve(code);
            else reject(new Error(`yt-dlp exited with code ${code}`));
          });

          ytdlp.stderr.on('data', (data) => {
            console.error(`yt-dlp error: ${data}`);
          });
        });

        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader('Content-Disposition', `attachment; filename="tiktok-slideshow-video-${timestamp}.mp4"`);

        const fileStream = createReadStream(outputFile);
        fileStream.pipe(res);
        
        // Limpiar archivo temporal después de enviarlo
        fileStream.on('close', () => {
          unlink(outputFile).catch(err => console.error('Error deleting temp file:', err));
        });
        
        return;
      }

      // Descarga normal de video o audio
      const outputFile = path.join(tempPath, `tiktok-${type}-${timestamp}.${type === 'video' ? 'mp4' : 'mp3'}`);

      const options = type === 'video' 
        ? ['--format', 'best[ext=mp4]', '--force-overwrites']
        : ['--extract-audio', '--audio-format', 'mp3', '--force-overwrites'];

      const ytdlp = spawn('yt-dlp', [
        ...options,
        '-o', outputFile,
        normalizedUrl
      ]);

      await new Promise((resolve, reject) => {
        ytdlp.on('close', (code) => {
          if (code === 0) resolve(code);
          else reject(new Error(`yt-dlp exited with code ${code}`));
        });

        ytdlp.stderr.on('data', (data) => {
          console.error(`yt-dlp error: ${data}`);
        });
      });

      const extension = type === 'video' ? 'mp4' : 'mp3';
      res.setHeader('Content-Type', type === 'video' ? 'video/mp4' : 'audio/mpeg');
      res.setHeader('Content-Disposition', `attachment; filename="tiktok-${type}-${timestamp}.${extension}"`);

      const fileStream = createReadStream(outputFile);
      fileStream.pipe(res);
      
      // Limpiar archivo temporal después de enviarlo
      fileStream.on('close', () => {
        unlink(outputFile).catch(err => console.error('Error deleting temp file:', err));
      });

    } catch (error) {
      console.error('Download error:', error);
      res.status(500).json({ message: "Failed to download content" });
    }
  });

  // Endpoint de búsqueda de TikTok (POST - para UI)
  app.post("/api/tiktok/search", async (req, res) => {
    try {
      const { query, limit } = searchQuerySchema.parse(req.body);
      
      console.log(`Searching TikTok for: "${query}" with limit ${limit}`);
      
      const searchResults = await searchTikTok(query, limit);
      
      res.json(searchResults);
    } catch (error) {
      console.error('Search API error:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid search parameters",
          errors: error.errors 
        });
      }
      
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Search failed" 
      });
    }
  });

  // Endpoint GET de búsqueda - Descarga los 5 videos más recientes del perfil
  // Uso: GET /api/tiktok/search/:username
  // Ejemplo: GET /api/tiktok/search/@tiktok
  // Descarga y envía los 5 videos más recientes del usuario en un ZIP
  app.get("/api/tiktok/search/:username", async (req, res) => {
    try {
      let username = req.params.username;
      
      // Remover el @ si está presente
      if (username.startsWith('@')) {
        username = username.substring(1);
      }
      
      // Validar username
      if (!/^[a-zA-Z0-9._-]+$/.test(username)) {
        return res.status(400).json({ 
          message: "Nombre de usuario inválido. Solo se permiten letras, números, guiones, guiones bajos y puntos."
        });
      }
      
      console.log(`[GET Search] Downloading 5 latest videos from @${username}`);
      
      const userUrl = `https://www.tiktok.com/@${username}`;
      const tempPath = path.join(process.cwd(), '.temp');
      await mkdir(tempPath, { recursive: true });
      
      const timestamp = Date.now();
      const outputPattern = path.join(tempPath, `${username}-${timestamp}-%(autonumber)s.mp4`);
      
      // Descargar los 5 videos más recientes
      // Formato flexible: intenta mp4, si no está disponible toma el mejor formato y convierte
      const ytdlp = spawn('yt-dlp', [
        '--playlist-items', '1-5',
        '--format', 'best[ext=mp4]/best',
        '--merge-output-format', 'mp4',
        '--force-overwrites',
        '-o', outputPattern,
        userUrl
      ]);

      let stderr = '';

      ytdlp.stderr.on('data', (data) => {
        stderr += data.toString();
        console.log(`yt-dlp: ${data}`);
      });

      await new Promise((resolve, reject) => {
        ytdlp.on('close', (code) => {
          if (code === 0) resolve(code);
          else reject(new Error(`yt-dlp exited with code ${code}: ${stderr}`));
        });
      });

      console.log(`[GET Search] Videos downloaded successfully for @${username}`);
      
      // Crear archivo ZIP con los videos
      const zipFilename = `tiktok-${username}-latest-5.zip`;
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);

      const archive = archiver('zip', {
        zlib: { level: 9 }
      });

      archive.on('error', (err) => {
        console.error('[GET Search] Archive error:', err);
        throw err;
      });

      // Enviar el ZIP al cliente
      archive.pipe(res);

      // Agregar todos los videos descargados al ZIP
      const fs = await import('fs/promises');
      const files = await fs.readdir(tempPath);
      const videoFiles = files.filter(f => 
        f.startsWith(`${username}-${timestamp}-`) && f.endsWith('.mp4')
      );

      console.log(`[GET Search] Adding ${videoFiles.length} videos to ZIP`);
      
      for (const file of videoFiles) {
        const filePath = path.join(tempPath, file);
        archive.file(filePath, { name: file.replace(`${username}-${timestamp}-`, `video-`) });
      }

      await archive.finalize();
      
    } catch (error) {
      console.error('[GET Search] Error:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Error al descargar videos del usuario"
      });
    }
  });

  // Endpoint de búsqueda por hashtag - LIMITACIÓN DE TIKTOK
  // Uso: GET /api/tiktok/hashtag/:tag
  // Ejemplo: GET /api/tiktok/hashtag/funny
  // NOTA: La búsqueda por hashtag NO está soportada por TikTok actualmente
  app.get("/api/tiktok/hashtag/:tag", async (req, res) => {
    const tag = req.params.tag.replace(/^#/, '');
    
    console.log(`[Hashtag Download] Request for #${tag} - Not supported`);
    
    return res.status(501).json({ 
      message: "La búsqueda y descarga por hashtag no está disponible actualmente",
      reason: "TikTok bloqueó esta funcionalidad en su plataforma y no puede ser extraída mediante herramientas automatizadas",
      alternatives: {
        byUser: "Puedes descargar videos de un usuario específico usando: GET /api/tiktok/search/:username",
        byUrls: "Puedes descargar videos específicos usando sus URLs con: POST /api/tiktok/batch con un array de URLs",
        singleVideo: "Para un solo video, usa la interfaz principal o: POST /api/tiktok/download/video"
      },
      documentation: "Ver API_DOCUMENTATION_EXTENDED.md para más información"
    });
  });

  // Endpoint de descarga múltiple - Descarga varias URLs en un ZIP
  // Uso: POST /api/tiktok/batch
  // Body: { urls: ["url1", "url2", "url3", ...] }
  app.post("/api/tiktok/batch", async (req, res) => {
    try {
      const { urls } = req.body;
      
      if (!Array.isArray(urls) || urls.length === 0) {
        return res.status(400).json({ 
          message: "Debes proporcionar un array de URLs"
        });
      }
      
      if (urls.length > 20) {
        return res.status(400).json({ 
          message: "Máximo 20 URLs por solicitud"
        });
      }
      
      console.log(`[Batch Download] Processing ${urls.length} URLs`);
      
      const tempPath = path.join(process.cwd(), '.temp');
      await mkdir(tempPath, { recursive: true });
      
      const timestamp = Date.now();
      const outputPattern = path.join(tempPath, `batch-${timestamp}-%(autonumber)s.mp4`);
      
      // Crear archivo temporal con las URLs
      const urlsFilePath = path.join(tempPath, `urls-${timestamp}.txt`);
      const fs = await import('fs/promises');
      await fs.writeFile(urlsFilePath, urls.join('\n'));
      
      // Descargar todas las URLs
      const ytdlp = spawn('yt-dlp', [
        '--batch-file', urlsFilePath,
        '--format', 'best[ext=mp4]/best',
        '--merge-output-format', 'mp4',
        '--force-overwrites',
        '-o', outputPattern
      ]);

      let stderr = '';

      ytdlp.stderr.on('data', (data) => {
        stderr += data.toString();
        console.log(`yt-dlp: ${data}`);
      });

      await new Promise((resolve, reject) => {
        ytdlp.on('close', (code) => {
          if (code === 0) resolve(code);
          else reject(new Error(`yt-dlp exited with code ${code}: ${stderr}`));
        });
      });

      console.log(`[Batch Download] All videos downloaded successfully`);
      
      // Crear archivo ZIP
      const zipFilename = `tiktok-batch-${urls.length}-videos.zip`;
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);

      const archive = archiver('zip', {
        zlib: { level: 9 }
      });

      archive.on('error', (err) => {
        console.error('[Batch Download] Archive error:', err);
        throw err;
      });

      archive.pipe(res);

      const files = await fs.readdir(tempPath);
      const videoFiles = files.filter(f => 
        f.startsWith(`batch-${timestamp}-`) && f.endsWith('.mp4')
      );

      console.log(`[Batch Download] Adding ${videoFiles.length} videos to ZIP`);
      
      for (const file of videoFiles) {
        const filePath = path.join(tempPath, file);
        archive.file(filePath, { name: file.replace(`batch-${timestamp}-`, `video-`) });
      }

      await archive.finalize();
      
      // Limpiar archivo temporal de URLs
      await fs.unlink(urlsFilePath).catch(() => {});
      
    } catch (error) {
      console.error('[Batch Download] Error:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Error al descargar videos"
      });
    }
  });

  // Endpoint de estadísticas de usuario - Info del perfil sin descargar
  // Uso: GET /api/tiktok/user/:username/stats
  // Ejemplo: GET /api/tiktok/user/@tiktok/stats
  app.get("/api/tiktok/user/:username/stats", async (req, res) => {
    try {
      let username = req.params.username;
      
      // Remover el @ si está presente
      if (username.startsWith('@')) {
        username = username.substring(1);
      }
      
      // Validar username
      if (!/^[a-zA-Z0-9._-]+$/.test(username)) {
        return res.status(400).json({ 
          message: "Nombre de usuario inválido"
        });
      }
      
      console.log(`[User Stats] Getting stats for @${username}`);
      
      const userUrl = `https://www.tiktok.com/@${username}`;
      
      // Obtener información del primer video para extraer datos del usuario
      const ytdlp = spawn('yt-dlp', [
        '--playlist-items', '1',
        '--dump-json',
        '--skip-download',
        userUrl
      ]);

      let stdout = '';
      let stderr = '';

      ytdlp.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      ytdlp.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      await new Promise((resolve, reject) => {
        ytdlp.on('close', (code) => {
          if (code === 0) resolve(code);
          else reject(new Error(`yt-dlp exited with code ${code}: ${stderr}`));
        });
      });
      
      const videoData = JSON.parse(stdout.trim());
      
      // Extraer estadísticas del usuario
      const stats = {
        username: username,
        nickname: videoData.uploader || videoData.creator || username,
        verified: videoData.uploader_verified || false,
        followerCount: videoData.channel_follower_count || 0,
        videoCount: videoData.playlist_count || 0,
        totalViews: videoData.view_count || 0,
        bio: videoData.description || "",
        avatar: videoData.thumbnail || "",
        latestVideo: {
          id: videoData.id,
          title: videoData.title || videoData.description,
          views: videoData.view_count || 0,
          likes: videoData.like_count || 0,
          comments: videoData.comment_count || 0,
          uploadDate: videoData.upload_date || ""
        }
      };
      
      res.json(stats);
      
    } catch (error) {
      console.error('[User Stats] Error:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Error al obtener estadísticas del usuario"
      });
    }
  });

  // Endpoint de metadata en lote - Extraer info de múltiples URLs
  // Uso: POST /api/tiktok/metadata/batch
  // Body: { urls: ["url1", "url2", ...] }
  app.post("/api/tiktok/metadata/batch", async (req, res) => {
    try {
      const { urls } = req.body;
      
      if (!Array.isArray(urls) || urls.length === 0) {
        return res.status(400).json({ 
          message: "Debes proporcionar un array de URLs"
        });
      }
      
      if (urls.length > 50) {
        return res.status(400).json({ 
          message: "Máximo 50 URLs por solicitud"
        });
      }
      
      console.log(`[Batch Metadata] Processing ${urls.length} URLs`);
      
      const results = [];
      
      for (const url of urls) {
        try {
          // Expandir URLs cortas y normalizar antes de procesar
          const expandedUrl = await expandShortUrl(url);
          const normalizedUrl = normalizeTikTokUrl(expandedUrl);
          
          // Usar spawn() en lugar de exec() para evitar inyección de comandos
          const ytdlp = spawn('yt-dlp', [
            '--dump-json',
            '--skip-download',
            normalizedUrl
          ]);

          let stdout = '';
          let stderr = '';

          ytdlp.stdout.on('data', (data) => {
            stdout += data.toString();
          });

          ytdlp.stderr.on('data', (data) => {
            stderr += data.toString();
          });

          await new Promise((resolve, reject) => {
            ytdlp.on('close', (code) => {
              if (code === 0) resolve(code);
              else reject(new Error(`yt-dlp exited with code ${code}: ${stderr}`));
            });
          });
          
          const videoInfo = JSON.parse(stdout.trim());
          
          results.push({
            success: true,
            url: url,
            data: {
              id: videoInfo.id,
              title: videoInfo.title || videoInfo.description,
              description: videoInfo.description,
              creator: videoInfo.uploader || videoInfo.creator,
              views: videoInfo.view_count || 0,
              likes: videoInfo.like_count || 0,
              comments: videoInfo.comment_count || 0,
              shares: videoInfo.repost_count || 0,
              duration: videoInfo.duration || 0,
              uploadDate: videoInfo.upload_date || "",
              thumbnail: videoInfo.thumbnail || "",
              music: {
                title: videoInfo.track || "",
                author: videoInfo.artist || ""
              }
            }
          });
        } catch (error) {
          results.push({
            success: false,
            url: url,
            error: error instanceof Error ? error.message : "Error al obtener metadata"
          });
        }
      }
      
      res.json({
        total: urls.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results: results
      });
      
    } catch (error) {
      console.error('[Batch Metadata] Error:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Error al procesar metadata"
      });
    }
  });

  // Endpoint para búsqueda por palabras clave (videos, usuarios, transmisiones)
  app.post("/api/tiktok/search/keyword", async (req, res) => {
    try {
      const { keyword, type = 'video', page = 1 } = req.body;
      
      if (!keyword || typeof keyword !== 'string') {
        return res.status(400).json({ 
          message: "Debes proporcionar una palabra clave para buscar"
        });
      }
      
      if (!['video', 'user', 'live'].includes(type)) {
        return res.status(400).json({ 
          message: "Tipo de búsqueda inválido. Usa: video, user o live"
        });
      }
      
      const cookie = process.env.TIKTOK_COOKIE;
      if (!cookie) {
        return res.status(500).json({ 
          message: "Cookie de TikTok no configurada. Ve a Secrets y agrega TIKTOK_COOKIE con el valor de tu cookie de sesión de TikTok."
        });
      }
      
      // Validar que la cookie tenga contenido mínimo
      if (cookie.length < 50) {
        return res.status(500).json({ 
          message: "La cookie de TikTok parece inválida (muy corta). Verifica que copiaste la cookie completa desde tu navegador."
        });
      }
      
      console.log(`[Keyword Search] Searching for "${keyword}" (type: ${type}, page: ${page})`);
      
      const result = await TiktokDL.Search(keyword, {
        type,
        cookie,
        page
      });
      
      if (result.status === 'error') {
        console.error('[Keyword Search] Error:', result.message);
        
        // Mensajes de error más descriptivos
        let errorMessage = result.message;
        if (result.message === 'Empty response') {
          errorMessage = 'La cookie de TikTok no es válida o ha expirado. Por favor:\n1. Abre TikTok en tu navegador e inicia sesión\n2. Presiona F12 → Application → Cookies → tiktok.com\n3. Copia TODA la cookie (todas las cookies juntas, no solo sessionid)\n4. Actualiza el secret TIKTOK_COOKIE con el nuevo valor';
        } else if (result.message === 'Invalid cookie!') {
          errorMessage = 'Cookie de TikTok inválida. Asegúrate de copiar la cookie correcta desde tu navegador (F12 → Application → Cookies)';
        }
        
        return res.status(400).json({ 
          message: errorMessage
        });
      }
      
      // Limitar a 15 resultados como solicitó el usuario
      const limitedResults = result.result?.slice(0, 15) || [];
      
      console.log(`[Keyword Search] Found ${limitedResults.length} results for "${keyword}"`);
      
      res.json({
        status: 'success',
        keyword,
        type,
        page,
        totalResults: limitedResults.length,
        results: limitedResults
      });
      
    } catch (error) {
      console.error('[Keyword Search] Error:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Error al realizar la búsqueda"
      });
    }
  });

  // Endpoint GET para buscar por palabra clave y descargar automáticamente el primer video
  app.get("/api/tiktok/searchkeyword/:keyword", async (req, res) => {
    const tempFiles: string[] = [];
    
    try {
      const keyword = req.params.keyword;
      
      if (!keyword) {
        return res.status(400).json({ 
          message: "Debes proporcionar una palabra clave"
        });
      }
      
      const cookie = process.env.TIKTOK_COOKIE;
      if (!cookie) {
        return res.status(500).json({ 
          message: "Cookie de TikTok no configurada. Ve a Secrets y agrega TIKTOK_COOKIE."
        });
      }
      
      if (cookie.length < 50) {
        return res.status(500).json({ 
          message: "La cookie de TikTok parece inválida (muy corta)."
        });
      }
      
      console.log(`[Search & Download] Searching for "${keyword}"`);
      
      // Buscar videos por palabra clave
      const result = await TiktokDL.Search(keyword, {
        type: 'video',
        cookie,
        page: 1
      });
      
      if (result.status === 'error') {
        console.error('[Search & Download] Error:', result.message);
        return res.status(400).json({ 
          message: result.message === 'Empty response' 
            ? 'Cookie de TikTok inválida o expirada' 
            : result.message
        });
      }
      
      const videos = result.result || [];
      if (videos.length === 0) {
        return res.status(404).json({ 
          message: `No se encontraron videos para "${keyword}"`
        });
      }
      
      // Seleccionar un video aleatorio de los resultados
      const randomIndex = Math.floor(Math.random() * videos.length);
      const selectedVideo = videos[randomIndex] as any;
      const videoUrl = `https://www.tiktok.com/@${selectedVideo.author.uniqueId}/video/${selectedVideo.id}`;
      
      console.log(`[Search & Download] Found ${videos.length} videos, selected random #${randomIndex + 1}`);
      console.log(`[Search & Download] Video: ${videoUrl}`);
      console.log(`[Search & Download] Downloading from @${selectedVideo.author.uniqueId}`);
      
      // Expandir URL si es necesaria
      let finalUrl = videoUrl;
      if (videoUrl.includes('vm.tiktok.com') || videoUrl.includes('vt.tiktok.com')) {
        const curl = spawn('curl', ['-sL', '-o', '/dev/null', '-w', '%{url_effective}', videoUrl]);
        let expandedUrl = '';
        curl.stdout.on('data', (data) => { expandedUrl += data.toString(); });
        await new Promise((resolve) => curl.on('close', resolve));
        finalUrl = expandedUrl.split('?')[0];
      }
      
      // Obtener metadata detallada del video con yt-dlp
      console.log(`[Search & Download] Fetching detailed metadata...`);
      const metadata = await getVideoMetadataWithYtdlp(finalUrl);
      
      // Descargar el video usando yt-dlp
      const tempDir = path.join(process.cwd(), 'tmp_downloads');
      await mkdir(tempDir, { recursive: true });
      
      const outputTemplate = path.join(tempDir, `${Date.now()}_%(id)s.%(ext)s`);
      
      const ytdlp = spawn('yt-dlp', [
        '-f', 'best',
        '-o', outputTemplate,
        finalUrl
      ]);
      
      let downloadedFile = '';
      ytdlp.stdout.on('data', (data) => {
        const output = data.toString();
        const match = output.match(/Destination: (.+)/);
        if (match) downloadedFile = match[1].trim();
      });
      
      await new Promise((resolve, reject) => {
        ytdlp.on('close', (code) => {
          if (code === 0) resolve(code);
          else reject(new Error(`yt-dlp falló con código ${code}`));
        });
      });
      
      // Encontrar el archivo descargado
      if (!downloadedFile) {
        const fs = require('fs');
        const files = fs.readdirSync(tempDir);
        downloadedFile = path.join(tempDir, files.find((f: string) => !f.startsWith('.')) || '');
      }
      
      if (!downloadedFile) {
        throw new Error('No se pudo encontrar el archivo descargado');
      }
      
      tempFiles.push(downloadedFile);
      
      const filename = `tiktok_${keyword.replace(/[^a-z0-9]/gi, '_')}_${selectedVideo.id}.mp4`;
      
      // Agregar metadata detallada en headers HTTP personalizados
      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      // Headers con metadata del video
      res.setHeader('X-TikTok-Video-ID', metadata.id || selectedVideo.id);
      res.setHeader('X-TikTok-Author', metadata.uploader || selectedVideo.author.nickname);
      res.setHeader('X-TikTok-Username', metadata.uploader_id || selectedVideo.author.uniqueId);
      res.setHeader('X-TikTok-Description', encodeURIComponent(metadata.description || selectedVideo.desc || ''));
      res.setHeader('X-TikTok-Likes', metadata.like_count?.toString() || '0');
      res.setHeader('X-TikTok-Views', metadata.view_count?.toString() || '0');
      res.setHeader('X-TikTok-Comments', metadata.comment_count?.toString() || '0');
      res.setHeader('X-TikTok-Shares', metadata.repost_count?.toString() || '0');
      res.setHeader('X-TikTok-Duration', metadata.duration?.toString() || '0');
      res.setHeader('X-TikTok-Upload-Date', metadata.upload_date || '');
      res.setHeader('X-TikTok-URL', videoUrl);
      
      // Información de la búsqueda
      res.setHeader('X-TikTok-Search-Keyword', keyword);
      res.setHeader('X-TikTok-Search-Total-Results', videos.length.toString());
      res.setHeader('X-TikTok-Search-Selected-Index', (randomIndex + 1).toString());
      
      console.log(`[Search & Download] Metadata: ${metadata.like_count} likes, ${metadata.view_count} views, ${metadata.comment_count} comments`);
      
      const stream = createReadStream(downloadedFile);
      stream.pipe(res);
      
      stream.on('end', async () => {
        for (const file of tempFiles) {
          try {
            await unlink(file);
          } catch (err) {
            console.error(`Error deleting temp file ${file}:`, err);
          }
        }
      });
      
    } catch (error) {
      console.error('[Search & Download] Error:', error);
      
      // Limpiar archivos temporales en caso de error
      for (const file of tempFiles) {
        try {
          await unlink(file);
        } catch (err) {
          // Ignorar errores de limpieza
        }
      }
      
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Error al buscar y descargar el video"
      });
    }
  });

  // Chat API routes
  app.get("/api/chat/messages", async (req, res) => {
    try {
      const messages = await db
        .select()
        .from(chatMessages)
        .orderBy(desc(chatMessages.timestamp))
        .limit(100);
      
      res.json(messages.reverse());
    } catch (error) {
      console.error('Error fetching chat messages:', error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post("/api/chat/messages", async (req, res) => {
    try {
      const messageData = insertChatMessageSchema.parse(req.body);
      
      const [newMessage] = await db
        .insert(chatMessages)
        .values(messageData)
        .returning();
      
      res.json(newMessage);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: error.errors[0].message });
      } else {
        console.error('Error creating message:', error);
        res.status(500).json({ message: "Failed to create message" });
      }
    }
  });

  const httpServer = createServer(app);
  
  // WebSocket server for real-time chat
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });
  
  const onlineUsers = new Map<WebSocket, { username: string; age: number }>();
  
  wss.on("connection", (ws) => {
    console.log("New WebSocket client connected");
    
    ws.on("message", async (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === "join") {
          onlineUsers.set(ws, { 
            username: message.username, 
            age: message.age 
          });
          
          broadcast({
            type: "user_count",
            count: onlineUsers.size
          });
          
          console.log(`User joined: ${message.username} (${onlineUsers.size} online)`);
        } else if (message.type === "message") {
          const messageData = {
            username: message.username,
            age: message.age,
            message: message.message
          };
          
          const [savedMessage] = await db
            .insert(chatMessages)
            .values(messageData)
            .returning();
          
          broadcast({
            type: "new_message",
            message: savedMessage
          });
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    });
    
    ws.on("close", () => {
      onlineUsers.delete(ws);
      broadcast({
        type: "user_count",
        count: onlineUsers.size
      });
      console.log(`User disconnected (${onlineUsers.size} online)`);
    });
    
    broadcast({
      type: "user_count",
      count: onlineUsers.size
    });
  });
  
  function broadcast(data: any) {
    const message = JSON.stringify(data);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }
  
  return httpServer;
}
