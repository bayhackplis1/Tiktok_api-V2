import { toast } from "@/hooks/use-toast";

export async function copyToClipboard(text: string, label: string = "Text") {
  try {
    await navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
      duration: 2000,
    });
    return true;
  } catch (error) {
    toast({
      title: "Failed to copy",
      description: "Please try again",
      variant: "destructive",
      duration: 2000,
    });
    return false;
  }
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

export function getStorageStats() {
  const stored = localStorage.getItem("tiktok_download_history");
  if (!stored) {
    return {
      totalDownloads: 0,
      totalSize: 0,
      byType: {
        video: 0,
        audio: 0,
        slideshow: 0,
        image: 0
      },
      recentDays: 0
    };
  }

  const history = JSON.parse(stored);
  const stats = {
    totalDownloads: history.length,
    totalSize: 0,
    byType: {
      video: 0,
      audio: 0,
      slideshow: 0,
      image: 0
    },
    recentDays: 0
  };

  if (history.length > 0) {
    const oldestTimestamp = history[history.length - 1].timestamp;
    const daysDiff = Math.ceil((Date.now() - oldestTimestamp) / (1000 * 60 * 60 * 24));
    stats.recentDays = daysDiff;
  }

  history.forEach((item: any) => {
    if (item.type in stats.byType) {
      stats.byType[item.type as keyof typeof stats.byType]++;
    }
  });

  return stats;
}
