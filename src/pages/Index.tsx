import { useState, useRef } from "react";
import { LanguageSelector } from "@/components/LanguageSelector";
import { TranslationDisplay } from "@/components/TranslationDisplay";
import { RecordButton } from "@/components/RecordButton";
import { SlideCapture, SlideEntry } from "@/components/SlideCapture";
import { AudioRecorder } from "@/utils/audioRecorder";
import { blobToBase64 } from "@/utils/audioUtils";
import { resizeImage } from "@/utils/imageUtils";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Download, ArrowLeftRight } from "lucide-react";

const LANGUAGES = [
  { code: "hu", name: "Magyar" },
  { code: "en", name: "English" },
  { code: "de", name: "Deutsch" },
  { code: "fr", name: "Français" },
  { code: "es", name: "Español" },
  { code: "it", name: "Italiano" },
  { code: "ro", name: "Română" },
  { code: "sk", name: "Slovenčina" },
  { code: "cs", name: "Čeština" },
];

const Index = () => {
  const [inputLang, setInputLang] = useState("hu");
  const [outputLang, setOutputLang] = useState("en");
  const [originalText, setOriginalText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPolishing, setIsPolishing] = useState(false);
  const [slideEntries, setSlideEntries] = useState<SlideEntry[]>([]);
  const [isProcessingSlide, setIsProcessingSlide] = useState(false);
  const audioRecorderRef = useRef<AudioRecorder | null>(null);
  const { toast } = useToast();

  const handleAudioChunk = async (audioBlob: Blob) => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      const base64Audio = await blobToBase64(audioBlob);
      console.log('Processing audio chunk, size:', audioBlob.size);

      const { data, error } = await supabase.functions.invoke('translate-speech', {
        body: { audio: base64Audio, inputLang, outputLang },
      });

      if (error) {
        console.error('Translation error:', error);
        throw error;
      }

      if (data?.transcription) {
        setOriginalText(prev => prev ? `${prev} ${data.transcription}` : data.transcription);
      }
      if (data?.translation) {
        setTranslatedText(prev => prev ? `${prev} ${data.translation}` : data.translation);
      }
    } catch (error) {
      console.error('Error processing audio:', error);
      toast({ title: "Hiba", description: "Hiba történt a fordítás során. Kérjük, próbálja újra.", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      audioRecorderRef.current?.stop();
      setIsRecording(false);
      toast({ title: "Rögzítés leállítva", description: "A hangfelvétel befejeződött." });
    } else {
      try {
        setOriginalText("");
        setTranslatedText("");
        if (!audioRecorderRef.current) {
          audioRecorderRef.current = new AudioRecorder();
        }
        await audioRecorderRef.current.start(handleAudioChunk);
        setIsRecording(true);
        toast({ title: "Rögzítés elindult", description: "Kezdje el beszélni a mikrofonba." });
      } catch (error) {
        console.error('Error starting recording:', error);
        toast({ title: "Hiba", description: "Nem sikerült elindítani a mikrofonot. Ellenőrizze az engedélyeket.", variant: "destructive" });
      }
    }
  };

  const swapLanguages = () => {
    setInputLang(outputLang);
    setOutputLang(inputLang);
  };

  const handleSlideCapture = async (file: File) => {
    setIsProcessingSlide(true);
    try {
      const base64Image = await resizeImage(file);
      const { data, error } = await supabase.functions.invoke('translate-slide', {
        body: { image: base64Image, outputLang },
      });

      if (error) throw error;

      if (data?.originalSlideText && data?.translatedSlideText) {
        setSlideEntries(prev => [...prev, {
          id: Date.now(),
          original: data.originalSlideText,
          translated: data.translatedSlideText,
        }]);
        toast({ title: "Dia feldolgozva", description: "A dia szövege sikeresen lefordítva." });
      }
    } catch (error) {
      console.error('Slide processing error:', error);
      toast({ title: "Hiba", description: "Nem sikerült feldolgozni a diát. Próbálja újra.", variant: "destructive" });
    } finally {
      setIsProcessingSlide(false);
    }
  };

  const handleSlideDelete = (id: number) => {
    setSlideEntries(prev => prev.filter(e => e.id !== id));
  };

  const hasText = originalText.length > 0 || translatedText.length > 0 || slideEntries.length > 0;

  const downloadTranscript = async () => {
    setIsPolishing(true);
    const inputName = LANGUAGES.find(l => l.code === inputLang)?.name ?? inputLang;
    const outputName = LANGUAGES.find(l => l.code === outputLang)?.name ?? outputLang;
    const timestamp = new Date().toLocaleString('hu-HU');

    let finalOriginal = originalText;
    let finalTranslated = translatedText;

    try {
      const { data, error } = await supabase.functions.invoke('polish-text', {
        body: { originalText, translatedText, inputLang, outputLang },
      });
      if (error) throw error;
      if (data?.polishedOriginal) finalOriginal = data.polishedOriginal;
      if (data?.polishedTranslation) finalTranslated = data.polishedTranslation;
    } catch (error) {
      console.error('Polish error, using raw text:', error);
      toast({ title: "Figyelmeztetés", description: "A szöveg szépítése nem sikerült, a nyers szöveget töltjük le." });
    }

    const parts = [
      `Eredeti szöveg (${inputName}):`,
      finalOriginal || '(üres)',
      '',
      `Fordítás (${outputName}):`,
      finalTranslated || '(üres)',
    ];

    if (slideEntries.length > 0) {
      parts.push('', '--- Prezentációs diák ---', '');
      slideEntries.forEach((entry, idx) => {
        parts.push(`[Dia ${idx + 1}]`);
        parts.push(`Eredeti: ${entry.original}`);
        parts.push(`Fordítás: ${entry.translated}`);
        parts.push('');
      });
    }

    parts.push('---', `Generálta: Valós Idejű Fordító`, `Dátum: ${timestamp}`);

    const content = parts.join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `forditas_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setIsPolishing(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl md:text-4xl font-bold text-center bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Valós Idejű Fordító
          </h1>
          <p className="text-center text-muted-foreground mt-2">
            Beszéljen, és azonnal lássa a fordítást
          </p>
        </div>
      </header>

      {/* Language Selection */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row gap-4 md:gap-4 justify-center items-center">
          <LanguageSelector label="Bemeneti nyelv" value={inputLang} onChange={setInputLang} languages={LANGUAGES} />
          <Button variant="ghost" size="icon" onClick={swapLanguages} className="rounded-full text-muted-foreground hover:text-foreground" aria-label="Nyelvek cseréje">
            <ArrowLeftRight size={20} />
          </Button>
          <LanguageSelector label="Kimeneti nyelv" value={outputLang} onChange={setOutputLang} languages={LANGUAGES} />
        </div>
      </div>

      {/* Record Button + Slide Capture */}
      <div className="container mx-auto px-4 py-4 flex flex-col items-center gap-4">
        <div className="relative">
          {isRecording && <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />}
          <RecordButton isRecording={isRecording} onClick={toggleRecording} disabled={isProcessing && !isRecording} />
        </div>
      </div>

      {/* Download + Slide capture buttons */}
      <div className="container mx-auto px-4 flex justify-between items-center">
        <SlideCapture
          isProcessing={isProcessingSlide}
          slideEntries={[]}
          onCapture={handleSlideCapture}
          onDelete={handleSlideDelete}
        />
        <Button variant="outline" size="sm" onClick={downloadTranscript} disabled={!hasText || isPolishing} className="gap-2">
          <Download size={16} />
          {isPolishing ? 'Feldolgozás...' : 'Letöltés'}
        </Button>
      </div>

      {/* Translation Display - Two columns */}
      <div className="flex-1 container mx-auto px-4 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TranslationDisplay title="Eredeti szöveg" text={originalText} isLoading={isProcessing} placeholder="Beszéljen a mikrofonba..." />
          <TranslationDisplay title="Fordítás" text={translatedText} isLoading={isProcessing} placeholder="A fordítás itt jelenik meg..." />
        </div>

        {/* Slide translations */}
        {slideEntries.length > 0 && (
          <div className="mt-6">
            <SlideCapture
              isProcessing={isProcessingSlide}
              slideEntries={slideEntries}
              onCapture={handleSlideCapture}
              onDelete={handleSlideDelete}
            />
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-border py-4">
        <p className="text-center text-xs text-muted-foreground">
          {isRecording && "🎤 Felvétel folyamatban..."}
        </p>
      </footer>
    </div>
  );
};

export default Index;
