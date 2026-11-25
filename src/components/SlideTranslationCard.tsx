import { readableText } from "../../supabase/functions/_shared/text";
import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";

interface SlideTranslationCardProps {
  index: number;
  original: string;
  translated: string;
  onDelete: () => void;
}

export function SlideTranslationCard({ index, original, translated, onDelete }: SlideTranslationCardProps) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <Card className="border-border/60">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="py-3 px-4">
          <div className="flex items-center justify-between">
            <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors">
              {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              Dia {index + 1}
            </CollapsibleTrigger>
            <Button variant="ghost" size="icon" aria-label={`Dia ${index + 1} törlése`} className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={onDelete}>
              <Trash2 size={14} />
            </Button>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="px-4 pb-4 pt-0 space-y-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Eredeti:</p>
              <p className="text-sm whitespace-pre-wrap break-words">{readableText(original)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Fordítás:</p>
              <p className="text-sm whitespace-pre-wrap break-words">{readableText(translated)}</p>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
