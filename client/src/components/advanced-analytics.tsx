import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { calculateAnalytics, type AnalyticsData } from "@/lib/analytics";
import { TrendingUp, TrendingDown, Minus, Star, Users, Clock, Award } from "lucide-react";

export function AdvancedAnalytics() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);

  const loadAnalytics = () => {
    const data = calculateAnalytics();
    if (data.totalDownloads > 0) {
      setAnalytics(data);
    } else {
      setAnalytics(null);
    }
  };

  useEffect(() => {
    loadAnalytics();

    const handleUpdate = () => {
      loadAnalytics();
    };

    window.addEventListener('download-history-update', handleUpdate);
    window.addEventListener('favorites-update', handleUpdate);
    
    return () => {
      window.removeEventListener('download-history-update', handleUpdate);
      window.removeEventListener('favorites-update', handleUpdate);
    };
  }, []);

  if (!analytics) {
    return null;
  }

  const getTrendIcon = () => {
    switch (analytics.downloadTrend) {
      case 'increasing':
        return <TrendingUp className="h-4 w-4 text-green-400" />;
      case 'decreasing':
        return <TrendingDown className="h-4 w-4 text-red-400" />;
      default:
        return <Minus className="h-4 w-4 text-yellow-400" />;
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <Card className="cyber-card fade-in-up" data-testid="card-analytics">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-cyan-400">
          <Award className="h-5 w-5" />
          Advanced Analytics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="stat-card p-3 rounded-lg border border-cyan-500/20 bg-black/30">
            <div className="text-xs text-cyan-300/60 mb-1">Total Views</div>
            <div className="text-lg font-bold text-cyan-400" data-testid="text-total-views">
              {formatNumber(analytics.totalViews)}
            </div>
          </div>

          <div className="stat-card p-3 rounded-lg border border-purple-500/20 bg-black/30">
            <div className="text-xs text-purple-300/60 mb-1">Total Likes</div>
            <div className="text-lg font-bold text-purple-400" data-testid="text-total-likes">
              {formatNumber(analytics.totalLikes)}
            </div>
          </div>

          <div className="stat-card p-3 rounded-lg border border-pink-500/20 bg-black/30">
            <div className="text-xs text-pink-300/60 mb-1">Avg Engagement</div>
            <div className="text-lg font-bold text-pink-400" data-testid="text-avg-engagement">
              {analytics.averageEngagement.toFixed(2)}%
            </div>
          </div>

          <div className="stat-card p-3 rounded-lg border border-green-500/20 bg-black/30">
            <div className="text-xs text-green-300/60 mb-1 flex items-center gap-1">
              <Star className="h-3 w-3" />
              Favorites
            </div>
            <div className="text-lg font-bold text-green-400" data-testid="text-favorites">
              {analytics.totalFavorites}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg border border-cyan-500/20 bg-black/20">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-cyan-300">Download Trend</h4>
              {getTrendIcon()}
            </div>
            <p className="text-xs text-cyan-200/60">
              {analytics.downloadTrend === 'increasing' && 'Your downloads are increasing! 📈'}
              {analytics.downloadTrend === 'decreasing' && 'Download activity is slowing down'}
              {analytics.downloadTrend === 'stable' && 'Download activity is stable'}
            </p>
          </div>

          <div className="p-4 rounded-lg border border-purple-500/20 bg-black/20">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-purple-300">Peak Hour</h4>
              <Clock className="h-4 w-4 text-purple-400" />
            </div>
            <p className="text-xs text-purple-200/60">
              Most active at {analytics.peakDownloadHour}:00 - {(analytics.peakDownloadHour + 1) % 24}:00
            </p>
          </div>
        </div>

        {analytics.topCreators.length > 0 && (
          <div className="p-4 rounded-lg border border-cyan-500/20 bg-black/20">
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-4 w-4 text-cyan-400" />
              <h4 className="text-sm font-semibold text-cyan-300">Top Creators</h4>
            </div>
            <div className="space-y-2">
              {analytics.topCreators.slice(0, 3).map((creator, index) => (
                <div 
                  key={creator.name} 
                  className="flex items-center justify-between text-xs"
                  data-testid={`creator-${index}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-cyan-400 font-bold">#{index + 1}</span>
                    <span className="text-cyan-200">{creator.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-purple-300">{creator.count} downloads</span>
                    <span className="text-pink-300">{formatNumber(creator.totalViews)} views</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {analytics.mostPopularVideo && (
          <div className="p-4 rounded-lg border border-pink-500/20 bg-black/20">
            <div className="flex items-center gap-2 mb-2">
              <Award className="h-4 w-4 text-pink-400" />
              <h4 className="text-sm font-semibold text-pink-300">Most Popular Download</h4>
            </div>
            <p className="text-xs text-pink-200 mb-1" data-testid="text-most-popular">
              {analytics.mostPopularVideo.title}
            </p>
            <p className="text-xs text-pink-200/60">
              {formatNumber(analytics.mostPopularVideo.views || 0)} views
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
