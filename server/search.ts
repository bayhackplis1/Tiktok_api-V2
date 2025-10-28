import { z } from "zod";
import { spawn } from "child_process";

export const searchQuerySchema = z.object({
  query: z.string().min(1).max(200),
  limit: z.number().min(1).max(20).optional().default(15),
});

export type SearchQuery = z.infer<typeof searchQuerySchema>;

export interface TikTokSearchResult {
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

export interface SearchResponse {
  results: TikTokSearchResult[];
  query: string;
  totalResults: number;
}

// Función para hacer búsquedas reales en TikTok usando yt-dlp
export async function searchTikTok(query: string, limit: number = 15): Promise<SearchResponse> {
  console.log(`Searching TikTok for: "${query}" (limit: ${limit})`);

  try {
    const results: TikTokSearchResult[] = [];
    
    // Determinar el tipo de búsqueda basado en la consulta
    let searchTerm = query.trim();
    let isUserSearch = false;
    
    if (searchTerm.startsWith("@")) {
      isUserSearch = true;
      searchTerm = searchTerm.substring(1);
    }

    console.log(`Search method: ${isUserSearch ? "user" : "general"}, term: "${searchTerm}"`);

    if (isUserSearch) {
      // Validar que el searchTerm solo contenga caracteres permitidos
      // Solo alfanuméricos, guiones, guiones bajos y puntos
      if (!/^[a-zA-Z0-9._-]+$/.test(searchTerm)) {
        throw new Error("Nombre de usuario inválido. Solo se permiten letras, números, guiones, guiones bajos y puntos.");
      }
      
      const userUrl = `https://www.tiktok.com/@${searchTerm}`;
      console.log(`Fetching videos from: ${userUrl}`);
      
      try {
        // Usar spawn en lugar de exec para evitar inyección de comandos
        // Sin --flat-playlist para obtener thumbnails y metadata completa
        const ytdlp = spawn('yt-dlp', [
          '--playlist-items', `1:${limit}`,
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
        
        // Parsear cada línea del output JSON
        const lines = stdout.trim().split('\n').filter(line => line.trim());
        console.log(`Got ${lines.length} lines from yt-dlp`);
        
        for (const line of lines) {
          try {
            const video = JSON.parse(line);
            
            results.push({
              id: video.id || String(Math.random()),
              type: "video",
              url: video.webpage_url || video.url || `https://www.tiktok.com/@${searchTerm}/video/${video.id}`,
              thumbnail: video.thumbnail || "",
              title: video.title || video.description || "Video de TikTok",
              description: video.description || video.title || "",
              username: searchTerm,
              nickname: video.uploader || searchTerm,
              avatar: "",
              verified: false,
              views: video.view_count || 0,
              likes: video.like_count || 0,
              comments: video.comment_count || 0,
              shares: 0,
              duration: formatDuration(video.duration || 0),
              uploadDate: video.upload_date ? formatUploadDate(video.upload_date) : "Desconocido",
            });
          } catch (parseError) {
            console.error("Error parsing video JSON:", parseError);
          }
        }
        
        console.log(`Successfully parsed ${results.length} videos`);
        
      } catch (execError: any) {
        console.error("yt-dlp execution error:", execError);
        throw new Error(`No se pudieron obtener videos del usuario @${searchTerm}. Verifica que el usuario existe.`);
      }
    } else {
      // Para búsquedas generales sin @
      throw new Error(
        `Para buscar videos, usa el formato @usuario (ej: @tiktok o @charlidamelio). TikTok no proporciona búsqueda por palabra clave de forma gratuita.`
      );
    }

    console.log(`Processed ${results.length} video results`);

    return {
      results,
      query,
      totalResults: results.length,
    };
  } catch (error: any) {
    console.error("TikTok search error:", error);
    
    // Propagar el error con un mensaje útil
    throw new Error(error.message || "Error al buscar en TikTok");
  }
}

// Función auxiliar para formatear fecha de subida
function formatUploadDate(uploadDate: string): string {
  if (!uploadDate || !/^\d{8}$/.test(uploadDate)) return "Desconocido";
  
  const year = uploadDate.substring(0, 4);
  const month = uploadDate.substring(4, 6);
  const day = uploadDate.substring(6, 8);
  
  const date = new Date(`${year}-${month}-${day}`);
  return date.toLocaleDateString("es-ES", { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
}

// Función auxiliar para formatear duración
function formatDuration(seconds: number): string {
  if (!seconds) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Función auxiliar para formatear timestamp
function formatTimestamp(timestamp: number | null | undefined): string {
  if (!timestamp) return "Unknown";
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString("es-ES", { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
}
