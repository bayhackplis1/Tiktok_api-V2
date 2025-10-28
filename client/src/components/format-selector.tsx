import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Info } from "lucide-react";

interface Format {
  id: string;
  label: string;
  quality: string;
  size: string;
  recommended?: boolean;
}

interface FormatSelectorProps {
  formats: Format[];
  selectedFormat: string;
  onSelectFormat: (formatId: string) => void;
}

export function FormatSelector({ formats, selectedFormat, onSelectFormat }: FormatSelectorProps) {
  return (
    <Card className="cyber-card" data-testid="card-format-selector">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-cyan-300 flex items-center gap-2">
          <Info className="h-5 w-5" />
          Available Formats
        </CardTitle>
        <p className="text-cyan-400/70 text-sm mt-2">
          Choose the quality and format that best fits your needs
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {formats.map((format) => (
            <button
              key={format.id}
              onClick={() => onSelectFormat(format.id)}
              className={`p-4 rounded-lg border-2 transition-all text-left relative overflow-hidden ${
                selectedFormat === format.id
                  ? 'border-cyan-400 bg-cyan-500/10'
                  : 'border-cyan-500/30 bg-black/40 hover:border-cyan-400/60 hover:bg-cyan-500/5'
              }`}
              data-testid={`button-format-${format.id}`}
            >
              {format.recommended && (
                <div className="absolute top-2 right-2">
                  <span className="px-2 py-0.5 rounded-full bg-purple-500/30 border border-purple-400/50 text-purple-300 text-xs font-bold uppercase">
                    Best
                  </span>
                </div>
              )}
              
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-bold text-cyan-300 text-lg">{format.label}</h4>
                {selectedFormat === format.id && (
                  <div className="w-6 h-6 rounded-full bg-cyan-400 flex items-center justify-center">
                    <Check className="h-4 w-4 text-black" />
                  </div>
                )}
              </div>
              
              <div className="space-y-1">
                <p className="text-cyan-400/80 text-sm">
                  <span className="text-cyan-500/70">Quality:</span> {format.quality}
                </p>
                <p className="text-cyan-400/80 text-sm">
                  <span className="text-cyan-500/70">Size:</span> {format.size}
                </p>
              </div>

              {selectedFormat === format.id && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 to-purple-500"></div>
              )}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
