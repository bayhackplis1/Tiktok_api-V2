import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { TikTokData } from "@/pages/home";
import { apiRequest } from "@/lib/queryClient";
import { validateTikTokUrl } from "@/lib/validators";
import { validateTikTokUrl as validateUrl, type ValidationResult } from "@/lib/url-validator";
import { getRecentUrls, addRecentUrl } from "@/lib/recent-urls";
import { Loader2, CheckCircle2, XCircle, AlertCircle, Clock, X } from "lucide-react";
import { useState, useEffect } from "react";

const formSchema = z.object({
  url: validateTikTokUrl,
});

type FormSchema = z.infer<typeof formSchema>;

interface DownloadFormProps {
  onPreview: (data: TikTokData) => void;
}

export function DownloadForm({ onPreview }: DownloadFormProps) {
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [showRecent, setShowRecent] = useState(false);
  const [recentUrls, setRecentUrls] = useState(getRecentUrls());

  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      url: "",
    },
  });

  const currentUrl = form.watch("url");

  useEffect(() => {
    if (currentUrl && currentUrl.length > 10) {
      const result = validateUrl(currentUrl);
      setValidation(result);
    } else {
      setValidation(null);
    }
  }, [currentUrl]);

  // Auto-cargar video desde búsqueda
  useEffect(() => {
    const pendingUrl = localStorage.getItem("pendingVideoUrl");
    if (pendingUrl) {
      localStorage.removeItem("pendingVideoUrl");
      form.setValue("url", pendingUrl);
      // Auto-submit después de un pequeño delay
      setTimeout(() => {
        fetchMutation.mutate(pendingUrl);
      }, 100);
    }
  }, []);

  const fetchMutation = useMutation({
    mutationFn: async (url: string) => {
      const res = await apiRequest("POST", "/api/tiktok/info", { url });
      return res.json();
    },
    onSuccess: (data: TikTokData) => {
      onPreview(data);
      addRecentUrl(currentUrl, data.title);
      setRecentUrls(getRecentUrls());
      toast({
        title: "Video found!",
        description: "You can now download the video or audio.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  async function onSubmit(data: FormSchema) {
    fetchMutation.mutate(data.url);
    setShowRecent(false);
  }

  const handleRecentClick = (url: string) => {
    form.setValue("url", url);
    setShowRecent(false);
  };

  const getValidationIcon = () => {
    if (!validation) return null;
    if (validation.type === 'success') return <CheckCircle2 className="h-4 w-4 text-green-400" />;
    if (validation.type === 'error') return <XCircle className="h-4 w-4 text-red-400" />;
    return <AlertCircle className="h-4 w-4 text-yellow-400" />;
  };

  const getValidationColor = () => {
    if (!validation) return '';
    if (validation.type === 'success') return 'border-green-500/40';
    if (validation.type === 'error') return 'border-red-500/40';
    return 'border-yellow-500/40';
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="url"
          render={({ field }) => (
            <FormItem className="relative">
              <FormControl>
                <div className="relative">
                  <Input
                    placeholder="Paste TikTok URL here..."
                    {...field}
                    className={`h-12 cyber-input text-lg pr-20 ${getValidationColor()}`}
                    onFocus={() => setShowRecent(true)}
                    data-testid="input-url"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {field.value && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-cyan-400/60 hover:text-cyan-400"
                        onClick={() => {
                          form.setValue("url", "");
                          setValidation(null);
                        }}
                        data-testid="button-clear-url"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                    {getValidationIcon()}
                  </div>
                  {validation && (
                    <div className={`text-xs mt-1 ${
                      validation.type === 'success' ? 'text-green-400' : 
                      validation.type === 'error' ? 'text-red-400' : 
                      'text-yellow-400'
                    }`}>
                      {validation.message}
                    </div>
                  )}
                </div>
              </FormControl>
              {showRecent && recentUrls.length > 0 && (
                <div 
                  className="absolute top-full left-0 right-0 mt-2 bg-black/95 border border-cyan-500/30 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto"
                  data-testid="dropdown-recent-urls"
                >
                  <div className="p-2 border-b border-cyan-500/20">
                    <div className="flex items-center gap-2 text-xs text-cyan-400/60">
                      <Clock className="h-3 w-3" />
                      Recent URLs
                    </div>
                  </div>
                  {recentUrls.map((recent, index) => (
                    <button
                      key={index}
                      type="button"
                      className="w-full px-3 py-2 text-left hover:bg-cyan-500/10 transition-colors border-b border-cyan-500/10 last:border-0"
                      onClick={() => handleRecentClick(recent.url)}
                      data-testid={`button-recent-${index}`}
                    >
                      <div className="text-sm text-cyan-300 truncate">
                        {recent.title || recent.url}
                      </div>
                      <div className="text-xs text-cyan-500/60 truncate mt-0.5">
                        {recent.url}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </FormItem>
          )}
        />
        <Button
          type="submit"
          className="w-full cyber-button h-12"
          disabled={fetchMutation.isPending || (validation !== null && validation.type === 'error')}
          data-testid="button-submit"
        >
          {fetchMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            "Get Download Links"
          )}
        </Button>
      </form>
      {showRecent && recentUrls.length > 0 && (
        <div 
          className="fixed inset-0 z-40"
          onClick={() => setShowRecent(false)}
        />
      )}
    </Form>
  );
}
