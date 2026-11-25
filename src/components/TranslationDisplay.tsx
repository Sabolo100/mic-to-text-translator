import { useEffect, useRef } from "react";

interface TranslationDisplayProps {
  title: string;
  text: string;
  isLoading: boolean;
  placeholder?: string;
}

export const TranslationDisplay = ({ title, text, isLoading, placeholder = "A szöveg itt jelenik meg..." }: TranslationDisplayProps) => {
  const displayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (displayRef.current) {
      displayRef.current.scrollTop = displayRef.current.scrollHeight;
    }
  }, [text]);

  return (
    <div className="relative w-full">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/10 rounded-2xl blur-3xl opacity-50" />
      
      <div className="relative mb-2">
        <h3 className="text-lg font-semibold text-foreground/80">
          {title}
        </h3>
      </div>
      
      <div 
        ref={displayRef}
        className="relative bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-6 min-h-[250px] max-h-[500px] overflow-y-auto shadow-2xl"
      >
        {text ? (
          <p className="text-2xl md:text-3xl leading-relaxed break-words whitespace-pre-wrap text-foreground animate-in fade-in duration-300">
            {text}
          </p>
        ) : (
          <div className="flex items-center justify-center min-h-[200px]">
            <p className="text-xl text-muted-foreground">
              {isLoading ? "Feldolgozás..." : placeholder}
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
