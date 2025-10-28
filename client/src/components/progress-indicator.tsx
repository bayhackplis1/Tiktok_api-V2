import { Progress } from "@/components/ui/progress";

interface ProgressIndicatorProps {
  progress: number;
}

export function ProgressIndicator({ progress }: ProgressIndicatorProps) {
  return (
    <div className="space-y-2">
      <div className="cyber-progress h-3 rounded-full">
        <div 
          className="cyber-progress-bar h-full rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      <p className="text-sm text-cyan-400 text-center font-semibold tracking-wider">
        {Math.round(progress)}% DOWNLOADED
      </p>
    </div>
  );
}
