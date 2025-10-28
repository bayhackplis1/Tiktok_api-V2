import { Card, CardContent } from "@/components/ui/card";
import { DownloadForm } from "@/components/download-form";
import { VideoPreview } from "@/components/video-preview";
import { DownloadHistory } from "@/components/download-history";
import { StatisticsDashboard } from "@/components/statistics-dashboard";
import { KeyboardShortcuts } from "@/components/keyboard-shortcuts";
import { AdvancedAnalytics } from "@/components/advanced-analytics";
import { FavoritesPanel } from "@/components/favorites-panel";
import { useState } from "react";

export interface TikTokMetadata {
  duration: string;
  videoSize: string;
  audioSize: string;
  resolution: string;
  format: string;
  codec: string;
  fps: number;
  bitrate: string;
  width: number;
  height: number;
  audioCodec: string;
  audioChannels: number;
  audioSampleRate: string;
}

export interface TikTokStats {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  favorites: number;
}

export interface TikTokCreator {
  username: string;
  nickname: string;
  avatar?: string;
  verified?: boolean;
}

export interface TikTokAudio {
  title: string;
  author: string;
}

export interface TikTokImage {
  url: string;
  width: number;
  height: number;
}

export interface TikTokData {
  contentType: "video" | "slideshow" | "audio";
  videoUrl: string;
  audioUrl: string;
  thumbnail: string;
  title: string;
  description: string;
  metadata: TikTokMetadata;
  creator: TikTokCreator;
  stats: TikTokStats;
  audio: TikTokAudio;
  hashtags: string[];
  uploadDate: string;
  videoId: string;
  images?: TikTokImage[];
}

export default function Home() {
  const [previewData, setPreviewData] = useState<TikTokData | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950/20 to-cyan-950/20 p-4 md:p-8">
      <KeyboardShortcuts />
      
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent" data-testid="text-title">
            Descargador de TikTok
          </h1>
          <p className="text-gray-400" data-testid="text-subtitle">
            Descarga videos, imágenes y música de TikTok fácilmente
          </p>
        </div>

        <Card className="bg-black/40 border-purple-500/30 backdrop-blur-sm" data-testid="card-download-form">
          <CardContent className="pt-6">
            <DownloadForm onPreview={setPreviewData} />
          </CardContent>
        </Card>

        {previewData && (
          <Card className="bg-black/40 border-purple-500/30 backdrop-blur-sm" data-testid="card-preview">
            <CardContent className="pt-6">
              <VideoPreview data={previewData} />
            </CardContent>
          </Card>
        )}

        <StatisticsDashboard />
        
        <AdvancedAnalytics />
        
        <FavoritesPanel />
        
        <DownloadHistory />
      </div>
    </div>
  );
}
