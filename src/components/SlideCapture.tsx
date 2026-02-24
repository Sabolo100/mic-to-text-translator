import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Loader2 } from "lucide-react";
import { SlideTranslationCard } from "./SlideTranslationCard";

export interface SlideEntry {
  id: number;
  original: string;
  translated: string;
}

interface SlideCaptureProps {
  isProcessing: boolean;
  slideEntries: SlideEntry[];
  onCapture: (file: File) => void;
  onDelete: (id: number) => void;
}

export function SlideCapture({ isProcessing, slideEntries, onCapture, onDelete }: SlideCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onCapture(file);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={isProcessing}
          className="gap-2"
        >
          {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
          {isProcessing ? 'Feldolgozás...' : 'Dia fotózása'}
        </Button>
      </div>

      {slideEntries.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground">Dia fordítások</h3>
          {slideEntries.map((entry, idx) => (
            <SlideTranslationCard
              key={entry.id}
              index={idx}
              original={entry.original}
              translated={entry.translated}
              onDelete={() => onDelete(entry.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
