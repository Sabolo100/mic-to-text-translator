import { Button } from "@/components/ui/button";
import { Mic, MicOff } from "lucide-react";

interface RecordButtonProps {
  isRecording: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export const RecordButton = ({ isRecording, onClick, disabled }: RecordButtonProps) => {
  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      size="lg"
      className={`
        relative overflow-hidden rounded-full w-20 h-20 shadow-lg transition-all duration-300
        ${isRecording 
          ? 'bg-destructive hover:bg-destructive/90 animate-pulse' 
          : 'bg-primary hover:bg-primary/90'
        }
      `}
    >
      {isRecording && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
      )}
      {isRecording ? (
        <MicOff className="w-8 h-8" />
      ) : (
        <Mic className="w-8 h-8" />
      )}
    </Button>
  );
};
