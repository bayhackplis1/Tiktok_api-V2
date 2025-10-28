import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Download, Clock, Film, Music, Image as ImageIcon, Search, FileDown, Filter, ArrowUpDown, Grid3X3, List } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/use-debounce";
import { exportToCSV } from "@/lib/csv-export";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DownloadHistoryItem {
  id: string;
  url: string;
  title: string;
  thumbnail: string;
  type: "video" | "audio" | "image" | "slideshow";
  timestamp: number;
  views?: number;
  likes?: number;
  creator?: string;
}

type SortOption = "recent" | "oldest" | "views" | "likes";
type ViewMode = "list" | "grid";

export function DownloadHistory() {
  const [history, setHistory] = useState<DownloadHistoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  
  const debouncedSearch = useDebounce(searchQuery, 300);

  const loadHistory = () => {
    const stored = localStorage.getItem("tiktok_download_history");
    if (stored) {
      setHistory(JSON.parse(stored));
    } else {
      setHistory([]);
    }
  };

  useEffect(() => {
    loadHistory();

    const handleHistoryUpdate = () => {
      loadHistory();
    };

    window.addEventListener('download-history-update', handleHistoryUpdate);
    
    return () => {
      window.removeEventListener('download-history-update', handleHistoryUpdate);
    };
  }, []);

  const clearHistory = () => {
    localStorage.removeItem("tiktok_download_history");
    setHistory([]);
    window.dispatchEvent(new CustomEvent("download-history-update"));
  };

  const removeItem = (id: string) => {
    const newHistory = history.filter(item => item.id !== id);
    localStorage.setItem("tiktok_download_history", JSON.stringify(newHistory));
    setHistory(newHistory);
    window.dispatchEvent(new CustomEvent("download-history-update"));
  };

  const formatTime = (timestamp: number | undefined) => {
    if (!timestamp || isNaN(timestamp)) return "Unknown";
    
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "video": return <Film className="h-4 w-4" />;
      case "audio": return <Music className="h-4 w-4" />;
      case "slideshow": return <ImageIcon className="h-4 w-4" />;
      default: return <Download className="h-4 w-4" />;
    }
  };

  const exportHistory = (format: 'json' | 'csv' = 'json') => {
    if (history.length === 0) {
      toast({
        title: "No history",
        description: "Download history is empty",
        variant: "destructive",
      });
      return;
    }

    if (format === 'csv') {
      const csvData = history.map(item => ({
        Title: item.title,
        Type: item.type,
        Creator: item.creator || 'N/A',
        Views: item.views || 0,
        Likes: item.likes || 0,
        Date: new Date(item.timestamp).toLocaleString(),
        URL: item.url
      }));
      exportToCSV(csvData, `tiktok-history-${new Date().toISOString().split('T')[0]}.csv`);
      toast({
        title: "Exported!",
        description: `Downloaded ${history.length} items as CSV`,
      });
    } else {
      const dataStr = JSON.stringify(history, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `tiktok-download-history-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Exported!",
        description: `Downloaded ${history.length} items as JSON`,
      });
    }
  };

  const filteredHistory = history.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(debouncedSearch.toLowerCase());
    const matchesFilter = filterType === "all" || item.type === filterType;
    return matchesSearch && matchesFilter;
  });

  const sortedHistory = [...filteredHistory].sort((a, b) => {
    switch (sortBy) {
      case "recent":
        return (b.timestamp || 0) - (a.timestamp || 0);
      case "oldest":
        return (a.timestamp || 0) - (b.timestamp || 0);
      case "views":
        return (b.views || 0) - (a.views || 0);
      case "likes":
        return (b.likes || 0) - (a.likes || 0);
      default:
        return 0;
    }
  });

  if (history.length === 0) {
    return null;
  }

  return (
    <Card className="cyber-card fade-in-up" data-testid="card-history">
      <CardHeader className="px-3 sm:px-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <CardTitle className="text-xl sm:text-2xl font-bold text-cyan-300 flex items-center gap-2">
            <Clock className="h-5 w-5 sm:h-6 sm:w-6" />
            Download History
          </CardTitle>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              onClick={() => exportHistory('json')}
              variant="outline"
              size="sm"
              className="cyber-button h-9 text-xs flex-1 sm:flex-none"
              data-testid="button-export-json"
            >
              <FileDown className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">JSON</span>
            </Button>
            <Button
              onClick={() => exportHistory('csv')}
              variant="outline"
              size="sm"
              className="cyber-button h-9 text-xs flex-1 sm:flex-none"
              data-testid="button-export-csv"
            >
              <FileDown className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">CSV</span>
            </Button>
            <Button
              onClick={clearHistory}
              variant="outline"
              size="sm"
              className="cyber-button h-9 text-xs flex-1 sm:flex-none"
              data-testid="button-clear-history"
            >
              <Trash2 className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Clear</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-3 sm:px-6">
        <div className="space-y-4 mb-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cyan-400" />
              <Input
                placeholder="Search downloads..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="cyber-input pl-10 h-10"
                data-testid="input-search-history"
              />
            </div>
            <div className="flex gap-2">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="cyber-input w-full sm:w-[140px] h-10" data-testid="select-filter-type">
                  <Filter className="h-4 w-4 mr-2 text-cyan-400" />
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="video">Videos</SelectItem>
                  <SelectItem value="audio">Audio</SelectItem>
                  <SelectItem value="slideshow">Slideshows</SelectItem>
                  <SelectItem value="image">Images</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                <SelectTrigger className="cyber-input w-full sm:w-[130px] h-10" data-testid="select-sort">
                  <ArrowUpDown className="h-4 w-4 mr-2 text-purple-400" />
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Most Recent</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="views">Most Views</SelectItem>
                  <SelectItem value="likes">Most Likes</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-1 border border-cyan-500/20 rounded-lg p-1">
                <Button
                  size="sm"
                  variant={viewMode === "list" ? "default" : "ghost"}
                  className={`h-8 w-8 p-0 ${viewMode === "list" ? "bg-cyan-500/20 text-cyan-400" : "text-cyan-400/60"}`}
                  onClick={() => setViewMode("list")}
                  data-testid="button-view-list"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  className={`h-8 w-8 p-0 ${viewMode === "grid" ? "bg-cyan-500/20 text-cyan-400" : "text-cyan-400/60"}`}
                  onClick={() => setViewMode("grid")}
                  data-testid="button-view-grid"
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          
          {filteredHistory.length === 0 && history.length > 0 && (
            <div className="text-center py-8">
              <p className="text-cyan-400/60">No downloads match your search</p>
            </div>
          )}
        </div>

        <div className={viewMode === "grid" 
          ? "grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto" 
          : "space-y-3 max-h-96 overflow-y-auto"}>
          {sortedHistory.map((item) => (
            <div
              key={item.id}
              className={viewMode === "grid" 
                ? "p-3 rounded-lg bg-black/40 border border-cyan-500/20 hover:border-cyan-500/40 transition-all"
                : "flex items-center gap-3 p-3 rounded-lg bg-black/40 border border-cyan-500/20 hover:border-cyan-500/40 transition-all"}
              data-testid={`history-item-${item.id}`}
            >
              {viewMode === "grid" ? (
                <>
                  <img
                    src={item.thumbnail}
                    alt={item.title}
                    className="w-full h-32 object-cover rounded border border-cyan-500/30 mb-2"
                    loading="lazy"
                  />
                  <h4 className="text-sm font-semibold text-cyan-300 line-clamp-2 mb-2">
                    {item.title}
                  </h4>
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-xs w-fit">
                        {getIcon(item.type)}
                        {item.type}
                      </span>
                      <span className="text-xs text-cyan-500/70">
                        {formatTime(item.timestamp)}
                      </span>
                    </div>
                    <Button
                      onClick={() => removeItem(item.id)}
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-cyan-400 hover:text-red-400 hover:bg-red-500/10"
                      data-testid={`button-remove-${item.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <img
                    src={item.thumbnail}
                    alt={item.title}
                    className="w-16 h-16 object-cover rounded border border-cyan-500/30"
                    loading="lazy"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-cyan-300 truncate">
                      {item.title}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-xs">
                        {getIcon(item.type)}
                        {item.type}
                      </span>
                      <span className="text-xs text-cyan-500/70">
                        {formatTime(item.timestamp)}
                      </span>
                    </div>
                  </div>
                  <Button
                    onClick={() => removeItem(item.id)}
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-cyan-400 hover:text-red-400 hover:bg-red-500/10"
                    data-testid={`button-remove-${item.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function addToDownloadHistory(item: Omit<DownloadHistoryItem, "id" | "timestamp">) {
  const stored = localStorage.getItem("tiktok_download_history");
  const history: DownloadHistoryItem[] = stored ? JSON.parse(stored) : [];
  
  const now = Date.now();
  const newItem: DownloadHistoryItem = {
    id: now.toString() + Math.random().toString(36).substr(2, 9),
    timestamp: now,
    url: item.url,
    title: item.title,
    thumbnail: item.thumbnail,
    type: item.type,
    views: item.views || 0,
    likes: item.likes || 0,
    creator: item.creator || 'Unknown',
  };

  const filteredHistory = history.filter(h => h.url !== item.url);
  const newHistory = [newItem, ...filteredHistory].slice(0, 20);
  
  localStorage.setItem("tiktok_download_history", JSON.stringify(newHistory));
  window.dispatchEvent(new CustomEvent("download-history-update"));
}
