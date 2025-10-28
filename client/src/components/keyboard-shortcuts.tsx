import { useEffect } from "react";
import { toast } from "@/hooks/use-toast";

export function KeyboardShortcuts() {
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key.toLowerCase()) {
          case 'k':
            event.preventDefault();
            const input = document.querySelector('input[placeholder*="TikTok"]') as HTMLInputElement;
            if (input) {
              input.focus();
              toast({
                title: "Search focused",
                description: "Press Enter to analyze the URL",
                duration: 1500,
              });
            }
            break;
          case 'h':
            event.preventDefault();
            toast({
              title: "Keyboard Shortcuts",
              description: `
Ctrl/Cmd + K: Focus search input
Ctrl/Cmd + H: Show this help
Ctrl/Cmd + E: Export history
Ctrl/Cmd + D: Clear download history
              `.trim(),
              duration: 5000,
            });
            break;
          case 'e':
            event.preventDefault();
            const exportBtn = document.querySelector('[data-testid="button-export-history"]') as HTMLButtonElement;
            if (exportBtn) {
              exportBtn.click();
            }
            break;
          case 'd':
            event.preventDefault();
            const clearBtn = document.querySelector('[data-testid="button-clear-history"]') as HTMLButtonElement;
            if (clearBtn) {
              if (confirm('Are you sure you want to clear all download history?')) {
                clearBtn.click();
                toast({
                  title: "History cleared",
                  description: "All download history has been removed",
                  duration: 2000,
                });
              }
            }
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, []);

  return null;
}
