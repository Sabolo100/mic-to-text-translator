import { useEffect, useRef } from "react";

interface TranslationDisplayProps {
  text: string;
  isLoading: boolean;
}

export const TranslationDisplay = ({ text, isLoading }: TranslationDisplayProps) => {
  const displayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (displayRef.current) {
      displayRef.current.scrollTop = displayRef.current.scrollHeight;
    }
  }, [text]);

  return (
    <div className="relative w-full max-w-4xl mx-auto">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/10 rounded-2xl blur-3xl opacity-50" />
      <div 
        ref={displayRef}
        className="relative bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-8 min-h-[400px] max-h-[600px] overflow-y-auto shadow-2xl"
      >
        {text ? (
          <p className="text-2xl md:text-3xl leading-relaxed text-foreground animate-in fade-in duration-300">
            {text}
          </p>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-xl text-muted-foreground">
              {isLoading ? "Fordítás folyamatban..." : "A fordítás itt fog megjelenni..."}
            </p>
          </div>
        )}
        {isLoading && (
          <div className="mt-4 flex items-center gap-2">
            <div className="h-2 w-2 bg-primary rounded-full animate-pulse" />
            <div className="h-2 w-2 bg-primary rounded-full animate-pulse delay-75" />
            <div className="h-2 w-2 bg-primary rounded-full animate-pulse delay-150" />
          </div>
        )}
      </div>
    </div>
  );
};
