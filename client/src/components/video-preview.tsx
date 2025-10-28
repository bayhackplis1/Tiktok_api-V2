import { Button } from "@/components/ui/button";
import { TikTokData } from "@/pages/home";
import { Download, Music, Info, Eye, Heart, MessageCircle, Share2, Calendar, Hash, Headphones, Film, Image as ImageIcon, Play, Video, Copy, ExternalLink, User, Star } from "lucide-react";
import { ProgressIndicator } from "./progress-indicator";
import { addToDownloadHistory } from "./download-history";
import { copyToClipboard } from "@/lib/clipboard";
import { MetadataSummary } from "./metadata-summary";
import { EngagementStats } from "./engagement-stats";
import { toggleFavorite, isFavorite } from "@/lib/favorites";
import { toast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

interface VideoPreviewProps {
  data: TikTokData;
}

export function VideoPreview({ data }: VideoPreviewProps) {
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [selectedImage, setSelectedImage] = useState<number>(0);
  const [showVideoPreview, setShowVideoPreview] = useState(false);
  const [isFav, setIsFav] = useState(false);

  useEffect(() => {
    setIsFav(isFavorite(data.videoId));
    
    const handleUpdate = () => {
      setIsFav(isFavorite(data.videoId));
    };

    window.addEventListener('favorites-update', handleUpdate);
    return () => window.removeEventListener('favorites-update', handleUpdate);
  }, [data.videoId]);

  async function downloadFile(url: string, type: "video" | "audio" | "image") {
    try {
      setDownloadProgress(0);

      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      addToDownloadHistory({
        url: url,
        title: data.title,
        thumbnail: data.thumbnail,
        type: data.contentType === "slideshow" ? "slideshow" : type,
        creator: data.creator.username,
        views: data.stats.views,
        likes: data.stats.likes,
      });

      setDownloadProgress(100);
      setTimeout(() => setDownloadProgress(null), 1000);
    } catch (error) {
      console.error("Download failed:", error);
      setDownloadProgress(null);
    }
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  const handleToggleFavorite = () => {
    const newState = toggleFavorite({
      id: data.videoId,
      url: `https://www.tiktok.com/@${data.creator.username}/video/${data.videoId}`,
      title: data.title,
      thumbnail: data.thumbnail,
      creator: data.creator.username,
      views: data.stats.views,
      likes: data.stats.likes,
    });

    toast({
      title: newState ? "Added to favorites" : "Removed from favorites",
      description: newState ? "Video saved to your favorites" : "Video removed from favorites",
      duration: 2000,
    });
  };

  const isSlideshow = data.contentType === "slideshow" && data.images && data.images.length > 0;

  return (
    <div className="space-y-6">
      {/* Content Type Badge and Favorite Button */}
      <div className="flex justify-between items-center">
        <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/20 border border-cyan-500/50 text-cyan-300 text-sm font-bold uppercase tracking-wider">
          {data.contentType === "slideshow" && <ImageIcon className="h-4 w-4" />}
          {data.contentType === "video" && <Film className="h-4 w-4" />}
          {data.contentType === "audio" && <Music className="h-4 w-4" />}
          {data.contentType === "slideshow" ? "Image Slideshow" : data.contentType}
        </span>
        <Button
          onClick={handleToggleFavorite}
          variant="outline"
          size="sm"
          className={`cyber-button ${isFav ? 'bg-yellow-500/20 border-yellow-500/50' : ''}`}
          data-testid="button-toggle-favorite"
        >
          <Star className={`h-4 w-4 mr-2 ${isFav ? 'fill-yellow-400 text-yellow-400' : ''}`} />
          {isFav ? 'Favorited' : 'Add to Favorites'}
        </Button>
      </div>

      {/* Video/Image Thumbnail or Gallery */}
      {isSlideshow ? (
        <div className="space-y-4">
          {/* Main Image Display */}
          <div className="aspect-square relative rounded-lg overflow-hidden bg-black border-2 border-cyan-500/30">
            <img
              src={data.images![selectedImage].url}
              alt={`${data.title} - Image ${selectedImage + 1}`}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
            
            {/* Image Counter */}
            <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-black/60 backdrop-blur-sm border border-cyan-500/30">
              <span className="text-cyan-300 font-bold text-sm">
                {selectedImage + 1} / {data.images!.length}
              </span>
            </div>

            {/* Navigation Arrows */}
            {data.images!.length > 1 && (
              <>
                <button
                  onClick={() => setSelectedImage(prev => prev > 0 ? prev - 1 : data.images!.length - 1)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm border border-cyan-500/30 flex items-center justify-center text-cyan-300 hover:bg-cyan-500/20 transition-colors"
                >
                  ←
                </button>
                <button
                  onClick={() => setSelectedImage(prev => prev < data.images!.length - 1 ? prev + 1 : 0)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm border border-cyan-500/30 flex items-center justify-center text-cyan-300 hover:bg-cyan-500/20 transition-colors"
                >
                  →
                </button>
              </>
            )}

            {/* Creator Info Overlay */}
            {data.creator && (
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <div className="flex items-center gap-3">
                  {data.creator.avatar && (
                    <img 
                      src={data.creator.avatar} 
                      alt={data.creator.nickname}
                      className="w-12 h-12 rounded-full border-2 border-cyan-400"
                    />
                  )}
                  <div>
                    <h3 className="font-bold text-cyan-300 text-lg flex items-center gap-2">
                      @{data.creator.username}
                      {data.creator.verified && (
                        <span className="text-cyan-400">✓</span>
                      )}
                    </h3>
                    <p className="text-cyan-400/80 text-sm">{data.creator.nickname}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Image Thumbnails */}
          <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
            {data.images!.map((image, index) => (
              <button
                key={index}
                onClick={() => setSelectedImage(index)}
                className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                  selectedImage === index 
                    ? 'border-cyan-400 scale-95' 
                    : 'border-cyan-500/30 hover:border-cyan-400/60'
                }`}
              >
                <img
                  src={image.url}
                  alt={`Thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="aspect-video relative rounded-lg overflow-hidden bg-black border-2 border-cyan-500/30">
          <img
            src={data.thumbnail}
            alt={data.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
          
          {/* Creator Info Overlay */}
          {data.creator && (
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <div className="flex items-center gap-3">
                {data.creator.avatar && (
                  <img 
                    src={data.creator.avatar} 
                    alt={data.creator.nickname}
                    className="w-12 h-12 rounded-full border-2 border-cyan-400"
                  />
                )}
                <div>
                  <h3 className="font-bold text-cyan-300 text-lg flex items-center gap-2">
                    @{data.creator.username}
                    {data.creator.verified && (
                      <span className="text-cyan-400">✓</span>
                    )}
                  </h3>
                  <p className="text-cyan-400/80 text-sm">{data.creator.nickname}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Creator Profile Link */}
      {data.creator && data.creator.avatar && (
        <div className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 backdrop-blur-sm p-4 rounded-lg border border-cyan-500/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-cyan-400" />
              <div>
                <p className="text-cyan-300 font-semibold">@{data.creator.username}</p>
                <p className="text-cyan-500/70 text-xs">{data.creator.nickname}</p>
              </div>
            </div>
            <Button
              onClick={() => window.open(data.creator.avatar, '_blank')}
              variant="outline"
              size="sm"
              className="cyber-button h-9 text-xs"
              data-testid="button-view-profile"
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Profile
            </Button>
          </div>
        </div>
      )}

      {/* Title and Description */}
      <div className="bg-black/40 backdrop-blur-sm p-6 rounded-lg border border-cyan-500/30 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h2 className="font-bold text-cyan-300 text-xl flex-1">{data.title}</h2>
          <Button
            onClick={() => copyToClipboard(data.title, "Title")}
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
            data-testid="button-copy-title"
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-start justify-between gap-2">
          <p className="text-cyan-400/80 text-sm leading-relaxed flex-1">{data.description}</p>
          <Button
            onClick={() => copyToClipboard(data.description, "Description")}
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
            data-testid="button-copy-description"
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Hashtags */}
        {data.hashtags && data.hashtags.length > 0 && (
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <p className="text-cyan-400 text-xs uppercase tracking-wider font-semibold">Hashtags</p>
              <Button
                onClick={() => copyToClipboard(data.hashtags.map(t => `#${t}`).join(' '), "Hashtags")}
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-cyan-400 hover:text-cyan-300 text-xs"
                data-testid="button-copy-all-hashtags"
              >
                <Copy className="h-3 w-3 mr-1" />
                Copy All
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {data.hashtags.map((tag, index) => (
                <button
                  key={index}
                  onClick={() => copyToClipboard(`#${tag}`, `Hashtag #${tag}`)}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold hover:bg-cyan-500/20 hover:border-cyan-400/50 transition-all cursor-pointer"
                  data-testid={`button-copy-hashtag-${index}`}
                >
                  <Hash className="h-3 w-3" />
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Engagement Analytics */}
      {data.stats && <EngagementStats stats={data.stats} />}

      {/* Statistics */}
      {data.stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-black/40 backdrop-blur-sm p-4 rounded-lg border border-cyan-500/30 text-center stat-card hover:border-cyan-400 transition-all" data-testid="stat-views">
            <Eye className="h-5 w-5 mx-auto mb-2 text-cyan-400 floating" />
            <p className="text-2xl font-bold text-cyan-300">{formatNumber(data.stats.views)}</p>
            <p className="text-cyan-500/70 text-xs uppercase tracking-wider">Views</p>
          </div>
          <div className="bg-black/40 backdrop-blur-sm p-4 rounded-lg border border-cyan-500/30 text-center stat-card hover:border-pink-400 transition-all" data-testid="stat-likes">
            <Heart className="h-5 w-5 mx-auto mb-2 text-pink-400 floating" style={{ animationDelay: '0.2s' }} />
            <p className="text-2xl font-bold text-cyan-300">{formatNumber(data.stats.likes)}</p>
            <p className="text-cyan-500/70 text-xs uppercase tracking-wider">Likes</p>
          </div>
          <div className="bg-black/40 backdrop-blur-sm p-4 rounded-lg border border-cyan-500/30 text-center stat-card hover:border-cyan-400 transition-all" data-testid="stat-comments">
            <MessageCircle className="h-5 w-5 mx-auto mb-2 text-cyan-400 floating" style={{ animationDelay: '0.4s' }} />
            <p className="text-2xl font-bold text-cyan-300">{formatNumber(data.stats.comments)}</p>
            <p className="text-cyan-500/70 text-xs uppercase tracking-wider">Comments</p>
          </div>
          <div className="bg-black/40 backdrop-blur-sm p-4 rounded-lg border border-cyan-500/30 text-center stat-card hover:border-purple-400 transition-all" data-testid="stat-shares">
            <Share2 className="h-5 w-5 mx-auto mb-2 text-purple-400 floating" style={{ animationDelay: '0.6s' }} />
            <p className="text-2xl font-bold text-cyan-300">{formatNumber(data.stats.shares)}</p>
            <p className="text-cyan-500/70 text-xs uppercase tracking-wider">Shares</p>
          </div>
          <div className="bg-black/40 backdrop-blur-sm p-4 rounded-lg border border-cyan-500/30 text-center stat-card hover:border-cyan-400 transition-all" data-testid="stat-upload-date">
            <Calendar className="h-5 w-5 mx-auto mb-2 text-cyan-400 floating" style={{ animationDelay: '0.8s' }} />
            <p className="text-sm font-bold text-cyan-300">{data.uploadDate}</p>
            <p className="text-cyan-500/70 text-xs uppercase tracking-wider">Upload Date</p>
          </div>
        </div>
      )}

      {/* Audio Information */}
      {data.audio && (
        <div className="bg-black/40 backdrop-blur-sm p-6 rounded-lg border border-cyan-500/30 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold flex items-center gap-2 text-cyan-400 text-lg">
              <Headphones className="h-5 w-5" />
              Audio Information
            </h3>
            <Button
              onClick={() => copyToClipboard(`${data.audio.title} - ${data.audio.author}`, "Audio info")}
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-cyan-400 hover:text-cyan-300 text-xs"
              data-testid="button-copy-audio-info"
            >
              <Copy className="h-3 w-3 mr-1" />
              Copy
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-cyan-500/70 text-xs uppercase tracking-wider">Track</p>
              <p className="font-semibold text-cyan-300">{data.audio.title}</p>
            </div>
            <div className="space-y-1">
              <p className="text-cyan-500/70 text-xs uppercase tracking-wider">Artist</p>
              <p className="font-semibold text-cyan-300">{data.audio.author}</p>
            </div>
          </div>
        </div>
      )}

      {/* Video ID and URL */}
      <div className="bg-black/40 backdrop-blur-sm p-4 rounded-lg border border-cyan-500/30">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex items-center justify-between gap-2 p-2 rounded bg-black/20">
            <div className="flex-1 min-w-0">
              <p className="text-cyan-500/70 text-xs uppercase tracking-wider mb-1">Video ID</p>
              <p className="font-mono text-cyan-300 text-xs truncate">{data.videoId}</p>
            </div>
            <Button
              onClick={() => copyToClipboard(data.videoId, "Video ID")}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-cyan-400 hover:text-cyan-300 flex-shrink-0"
              data-testid="button-copy-video-id"
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
          <div className="flex items-center justify-between gap-2 p-2 rounded bg-black/20">
            <div className="flex-1 min-w-0">
              <p className="text-cyan-500/70 text-xs uppercase tracking-wider mb-1">TikTok URL</p>
              <p className="font-mono text-cyan-300 text-xs truncate">tiktok.com/.../{data.videoId}</p>
            </div>
            <Button
              onClick={() => copyToClipboard(`https://www.tiktok.com/@${data.creator.username}/video/${data.videoId}`, "TikTok URL")}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-cyan-400 hover:text-cyan-300 flex-shrink-0"
              data-testid="button-copy-url"
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* Technical Information */}
      <div className="bg-black/40 backdrop-blur-sm p-6 rounded-lg border border-cyan-500/30 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold flex items-center gap-2 text-cyan-400 text-lg">
            <Film className="h-5 w-5" />
            Technical Details
          </h3>
          <Button
            onClick={() => {
              const techInfo = `Resolution: ${data.metadata.resolution}\nFormat: ${data.metadata.format}\nCodec: ${data.metadata.codec}\nBitrate: ${data.metadata.bitrate}\nFPS: ${data.metadata.fps}\nDuration: ${data.metadata.duration}\nFile Size: ${data.metadata.videoSize}`;
              copyToClipboard(techInfo, "Technical details");
            }}
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-cyan-400 hover:text-cyan-300 text-xs"
            data-testid="button-copy-tech-details"
          >
            <Copy className="h-3 w-3 mr-1" />
            Copy All
          </Button>
        </div>
        
        {/* Video Technical Info */}
        <div>
          <h4 className="text-cyan-400 text-sm font-semibold mb-3 uppercase tracking-wider">
            {isSlideshow ? "Slideshow" : "Video"}
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="space-y-1">
              <p className="text-cyan-500/70 text-xs uppercase tracking-wider">Duration</p>
              <p className="font-semibold text-cyan-300">{data.metadata.duration}</p>
            </div>
            <div className="space-y-1">
              <p className="text-cyan-500/70 text-xs uppercase tracking-wider">Resolution</p>
              <p className="font-semibold text-cyan-300">{data.metadata.resolution}</p>
            </div>
            {!isSlideshow && (
              <>
                <div className="space-y-1">
                  <p className="text-cyan-500/70 text-xs uppercase tracking-wider">FPS</p>
                  <p className="font-semibold text-cyan-300">{data.metadata.fps}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-cyan-500/70 text-xs uppercase tracking-wider">Format</p>
                  <p className="font-semibold text-cyan-300">{data.metadata.format}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-cyan-500/70 text-xs uppercase tracking-wider">Codec</p>
                  <p className="font-semibold text-cyan-300">{data.metadata.codec}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-cyan-500/70 text-xs uppercase tracking-wider">Bitrate</p>
                  <p className="font-semibold text-cyan-300">{data.metadata.bitrate}</p>
                </div>
              </>
            )}
            <div className="space-y-1">
              <p className="text-cyan-500/70 text-xs uppercase tracking-wider">File Size</p>
              <p className="font-semibold text-cyan-300">{data.metadata.videoSize}</p>
            </div>
            {isSlideshow && (
              <div className="space-y-1">
                <p className="text-cyan-500/70 text-xs uppercase tracking-wider">Images</p>
                <p className="font-semibold text-cyan-300">{data.images!.length}</p>
              </div>
            )}
          </div>
        </div>

        {/* Audio Technical Info */}
        <div className="pt-2 border-t border-cyan-500/20">
          <h4 className="text-cyan-400 text-sm font-semibold mb-3 uppercase tracking-wider">Audio</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="space-y-1">
              <p className="text-cyan-500/70 text-xs uppercase tracking-wider">Codec</p>
              <p className="font-semibold text-cyan-300">{data.metadata.audioCodec}</p>
            </div>
            <div className="space-y-1">
              <p className="text-cyan-500/70 text-xs uppercase tracking-wider">Channels</p>
              <p className="font-semibold text-cyan-300">{data.metadata.audioChannels}</p>
            </div>
            <div className="space-y-1">
              <p className="text-cyan-500/70 text-xs uppercase tracking-wider">Sample Rate</p>
              <p className="font-semibold text-cyan-300">{data.metadata.audioSampleRate}</p>
            </div>
            <div className="space-y-1">
              <p className="text-cyan-500/70 text-xs uppercase tracking-wider">File Size</p>
              <p className="font-semibold text-cyan-300">{data.metadata.audioSize}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Video Preview Player */}
      {!isSlideshow && data.contentType !== "audio" && showVideoPreview && (
        <div className="bg-black/40 backdrop-blur-sm p-6 rounded-lg border border-cyan-500/30 holographic fade-in-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-cyan-300 text-lg flex items-center gap-2">
              <Video className="h-5 w-5" />
              Video Preview
            </h3>
            <Button
              onClick={() => setShowVideoPreview(false)}
              variant="ghost"
              size="sm"
              className="text-cyan-400 hover:text-cyan-300"
              data-testid="button-close-preview"
            >
              Close
            </Button>
          </div>
          <div className="aspect-video rounded-lg overflow-hidden border-2 border-cyan-500/50">
            <iframe
              src={`https://www.tiktok.com/embed/${data.videoId}`}
              className="w-full h-full"
              allow="encrypted-media; fullscreen"
              title="TikTok Video Preview"
            />
          </div>
        </div>
      )}

      {/* Download Buttons */}
      <div className="space-y-4">
        {!isSlideshow && data.contentType !== "audio" && !showVideoPreview && (
          <Button
            onClick={() => setShowVideoPreview(true)}
            className="w-full cyber-button h-14 text-base"
            data-testid="button-preview-video"
          >
            <Play className="mr-2 h-5 w-5" />
            Preview Video
          </Button>
        )}

        {isSlideshow && (
          <div className="grid grid-cols-1 gap-4">
            <Button
              onClick={() => downloadFile(data.videoUrl, "video")}
              disabled={downloadProgress !== null}
              className="w-full cyber-button h-14 text-base"
              data-testid="button-download-slideshow-video"
            >
              <Film className="mr-2 h-5 w-5" />
              Download Video with Music ({data.metadata.videoSize})
            </Button>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {data.images!.map((_, index) => (
                <Button
                  key={index}
                  onClick={() => {
                    // Extract the URL parameter without double encoding
                    const urlParam = data.videoUrl.split('?url=')[1];
                    // Decode first in case it's already encoded, then encode once
                    const decodedUrl = decodeURIComponent(urlParam);
                    downloadFile(`/api/tiktok/download/image?url=${encodeURIComponent(decodedUrl)}&imageIndex=${index}`, "image");
                  }}
                  disabled={downloadProgress !== null}
                  className="w-full cyber-button h-12 text-sm"
                  data-testid={`button-download-image-${index}`}
                >
                  <ImageIcon className="mr-2 h-4 w-4" />
                  Image {index + 1}
                </Button>
              ))}
            </div>
          </div>
        )}

        {!isSlideshow && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              onClick={() => downloadFile(data.videoUrl, "video")}
              disabled={downloadProgress !== null}
              className="w-full cyber-button h-14 text-base"
              data-testid="button-download-video"
            >
              <Download className="mr-2 h-5 w-5" />
              Download Video ({data.metadata.videoSize})
            </Button>

            <Button
              onClick={() => downloadFile(data.audioUrl, "audio")}
              disabled={downloadProgress !== null}
              className="w-full cyber-button h-14 text-base"
              data-testid="button-download-audio"
            >
              <Music className="mr-2 h-5 w-5" />
              Download Audio ({data.metadata.audioSize})
            </Button>
          </div>
        )}

        {/* Always show audio download option */}
        {isSlideshow && (
          <Button
            onClick={() => downloadFile(data.audioUrl, "audio")}
            disabled={downloadProgress !== null}
            className="w-full cyber-button h-14 text-base"
            data-testid="button-download-slideshow-audio"
          >
            <Music className="mr-2 h-5 w-5" />
            Download Audio Only ({data.metadata.audioSize})
          </Button>
        )}
      </div>

      {downloadProgress !== null && (
        <ProgressIndicator progress={downloadProgress} />
      )}

      {/* Metadata Summary */}
      <MetadataSummary data={data} />
    </div>
  );
}
