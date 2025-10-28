import { getDownloadHistory } from './download-history';
import { getFavorites } from './favorites';

export interface AnalyticsData {
  totalDownloads: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  averageEngagement: number;
  topCreators: Array<{ name: string; count: number; totalViews: number }>;
  downloadsByDay: Array<{ date: string; count: number }>;
  downloadsByType: { [key: string]: number };
  mostPopularVideo: any;
  averageViews: number;
  averageLikes: number;
  totalFavorites: number;
  peakDownloadHour: number;
  downloadTrend: 'increasing' | 'decreasing' | 'stable';
}

export function calculateAnalytics(): AnalyticsData {
  const history = getDownloadHistory();
  const favorites = getFavorites();

  if (history.length === 0) {
    return {
      totalDownloads: 0,
      totalViews: 0,
      totalLikes: 0,
      totalComments: 0,
      totalShares: 0,
      averageEngagement: 0,
      topCreators: [],
      downloadsByDay: [],
      downloadsByType: {},
      mostPopularVideo: null,
      averageViews: 0,
      averageLikes: 0,
      totalFavorites: favorites.length,
      peakDownloadHour: 0,
      downloadTrend: 'stable'
    };
  }

  let totalViews = 0;
  let totalLikes = 0;
  let totalComments = 0;
  let totalShares = 0;
  let totalEngagement = 0;
  let engagementCount = 0;

  const creatorStats: { [key: string]: { count: number; totalViews: number } } = {};
  const dayStats: { [key: string]: number } = {};
  const typeStats: { [key: string]: number } = {};
  const hourStats: { [key: number]: number } = {};

  let mostPopularVideo = history[0];
  let maxViews = 0;

  history.forEach((item: any) => {
    if (!item || !item.timestamp) return;
    
    const views = item.views || 0;
    const likes = item.likes || 0;
    const comments = item.comments || 0;
    const shares = item.shares || 0;

    totalViews += views;
    totalLikes += likes;
    totalComments += comments;
    totalShares += shares;

    if (views > 0) {
      const engagement = ((likes + comments + shares) / views) * 100;
      totalEngagement += engagement;
      engagementCount++;
    }

    if (views > maxViews) {
      maxViews = views;
      mostPopularVideo = item;
    }

    const creator = item.creator || 'Unknown';
    if (!creatorStats[creator]) {
      creatorStats[creator] = { count: 0, totalViews: 0 };
    }
    creatorStats[creator].count++;
    creatorStats[creator].totalViews += views;

    if (item.timestamp && !isNaN(item.timestamp)) {
      const date = new Date(item.timestamp).toLocaleDateString();
      dayStats[date] = (dayStats[date] || 0) + 1;

      const hour = new Date(item.timestamp).getHours();
      hourStats[hour] = (hourStats[hour] || 0) + 1;
    }

    const type = item.type || 'video';
    typeStats[type] = (typeStats[type] || 0) + 1;
  });

  const topCreators = Object.entries(creatorStats)
    .map(([name, stats]) => ({ name, count: stats.count, totalViews: stats.totalViews }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const downloadsByDay = Object.entries(dayStats)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const peakDownloadHour = Object.entries(hourStats)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 0;

  let downloadTrend: 'increasing' | 'decreasing' | 'stable' = 'stable';
  if (downloadsByDay.length >= 3) {
    const recent = downloadsByDay.slice(-3);
    if (recent[2].count > recent[1].count && recent[1].count > recent[0].count) {
      downloadTrend = 'increasing';
    } else if (recent[2].count < recent[1].count && recent[1].count < recent[0].count) {
      downloadTrend = 'decreasing';
    }
  }

  return {
    totalDownloads: history.length,
    totalViews,
    totalLikes,
    totalComments,
    totalShares,
    averageEngagement: engagementCount > 0 ? totalEngagement / engagementCount : 0,
    topCreators,
    downloadsByDay,
    downloadsByType: typeStats,
    mostPopularVideo,
    averageViews: history.length > 0 ? totalViews / history.length : 0,
    averageLikes: history.length > 0 ? totalLikes / history.length : 0,
    totalFavorites: favorites.length,
    peakDownloadHour: Number(peakDownloadHour),
    downloadTrend
  };
}
