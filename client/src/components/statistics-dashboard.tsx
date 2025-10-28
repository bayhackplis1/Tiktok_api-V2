import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Download, Film, Music, Image as ImageIcon, TrendingUp, Calendar } from "lucide-react";
import { getStorageStats } from "@/lib/clipboard";
import { useEffect, useState } from "react";

export function StatisticsDashboard() {
  const [stats, setStats] = useState(getStorageStats());

  useEffect(() => {
    const updateStats = () => {
      setStats(getStorageStats());
    };

    updateStats();
    window.addEventListener('download-history-update', updateStats);
    
    return () => {
      window.removeEventListener('download-history-update', updateStats);
    };
  }, []);

  if (stats.totalDownloads === 0) {
    return null;
  }

  return (
    <Card className="cyber-card fade-in-up mb-8" data-testid="card-statistics">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-cyan-300 flex items-center gap-2">
          <BarChart3 className="h-6 w-6" />
          Download Statistics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-black/40 backdrop-blur-sm p-4 rounded-lg border border-cyan-500/30 text-center stat-card hover:border-cyan-400 transition-all group" data-testid="stat-total-downloads">
            <Download className="h-6 w-6 mx-auto mb-2 text-cyan-400 floating" />
            <p className="text-3xl font-bold text-cyan-300 mb-1">{stats.totalDownloads}</p>
            <p className="text-cyan-500/70 text-xs uppercase tracking-wider">Total Downloads</p>
          </div>

          <div className="bg-black/40 backdrop-blur-sm p-4 rounded-lg border border-purple-500/30 text-center stat-card hover:border-purple-400 transition-all group" data-testid="stat-videos">
            <Film className="h-6 w-6 mx-auto mb-2 text-purple-400 floating" style={{ animationDelay: '0.2s' }} />
            <p className="text-3xl font-bold text-cyan-300 mb-1">{stats.byType.video + stats.byType.slideshow}</p>
            <p className="text-cyan-500/70 text-xs uppercase tracking-wider">Videos</p>
          </div>

          <div className="bg-black/40 backdrop-blur-sm p-4 rounded-lg border border-pink-500/30 text-center stat-card hover:border-pink-400 transition-all group" data-testid="stat-audios">
            <Music className="h-6 w-6 mx-auto mb-2 text-pink-400 floating" style={{ animationDelay: '0.4s' }} />
            <p className="text-3xl font-bold text-cyan-300 mb-1">{stats.byType.audio}</p>
            <p className="text-cyan-500/70 text-xs uppercase tracking-wider">Audio Files</p>
          </div>

          <div className="bg-black/40 backdrop-blur-sm p-4 rounded-lg border border-cyan-500/30 text-center stat-card hover:border-cyan-400 transition-all group" data-testid="stat-images">
            <ImageIcon className="h-6 w-6 mx-auto mb-2 text-cyan-400 floating" style={{ animationDelay: '0.6s' }} />
            <p className="text-3xl font-bold text-cyan-300 mb-1">{stats.byType.image + stats.byType.slideshow}</p>
            <p className="text-cyan-500/70 text-xs uppercase tracking-wider">Images</p>
          </div>
        </div>

        {stats.recentDays > 0 && (
          <div className="mt-4 p-4 rounded-lg bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/30">
            <div className="flex items-center justify-center gap-2 text-cyan-300">
              <TrendingUp className="h-5 w-5" />
              <span className="font-semibold">
                Active for {stats.recentDays} {stats.recentDays === 1 ? 'day' : 'days'}
              </span>
              <Calendar className="h-4 w-4 ml-2 text-cyan-400" />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
