import { useState, useRef, useEffect } from "react";
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
import { AudioQueue } from "@/utils/audioQueue";
import { readableText } from "../../supabase/functions/_shared/text";

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
  const [isStarting, setIsStarting] = useState(false);
  const [isPolishing, setIsPolishing] = useState(false);
  const [slideEntries, setSlideEntries] = useState<SlideEntry[]>([]);
  const [isProcessingSlide, setIsProcessingSlide] = useState(false);
  const audioRecorderRef = useRef<AudioRecorder | null>(null);
  const skipAudioRef = useRef(false);
  const { toast } = useToast();
  type AudioJob = { blob: Blob; inputLang: string; outputLang: string };
  const processRef = useRef<(job: AudioJob) => Promise<void>>(async () => undefined);
  const [audioQueue] = useState(() => new AudioQueue<AudioJob>(job => processRef.current(job), setIsProcessing));
  const recordingLanguages = useRef({ inputLang, outputLang });
  const startingRef = useRef(false);
  const mountedRef = useRef(true);
  const requestController = useRef(new AbortController());

  useEffect(() => () => {
    mountedRef.current = false;
    audioQueue.clear();
    void audioRecorderRef.current?.stop(false);
    requestController.current.abort();
  }, [audioQueue]);

  const stopOnError = (description: string) => {
    audioQueue.clear();
    void audioRecorderRef.current?.stop(false);
    setIsRecording(false);
    toast({ title: "A feldolgozás leállt", description, variant: "destructive" });
  };

  const functionError = async (error: unknown): Promise<string> => {
    if (error && typeof error === 'object' && 'context' in error && error.context instanceof Response) {
      try { return readableText((await error.context.clone().json()).error) || 'A szolgáltatás jelenleg nem elérhető.'; } catch { /* use fallback */ }
    }
    return 'A feldolgozás nem sikerült. Ellenőrizze az internetkapcsolatot, majd próbálja újra.';
  };

  processRef.current = async ({ blob, inputLang: source, outputLang: target }: AudioJob) => {
    if (!mountedRef.current) return;
    try {
      const audio = await blobToBase64(blob);
      const { data, error } = await supabase.functions.invoke('translate-speech', {
        body: { audio, inputLang: source, outputLang: target, mimeType: blob.type },
        signal: requestController.current.signal,
      });
      if (!mountedRef.current) return;
      if (error) throw error;
      const original = readableText(data?.transcription);
      const translated = readableText(data?.translation);
      if (original) setOriginalText(prev => prev ? `${prev} ${original}` : original);
      if (translated) setTranslatedText(prev => prev ? `${prev} ${translated}` : translated);
      if (data?.translationError || data?.error) stopOnError(readableText(data.translationError || data.error));
    } catch (error) {
      console.error('Error processing audio:', error);
      if (mountedRef.current) stopOnError(await functionError(error));
    }
  };

  const handleAudioChunk = (blob: Blob) => {
    if (!mountedRef.current) return;
    if (!audioQueue.enqueue({ blob, ...recordingLanguages.current })) {
      void audioRecorderRef.current?.stop(false);
      setIsRecording(false);
      toast({ title: "A felvétel szünetel", description: "A feldolgozás nem tart lépést a beszéddel. Várja meg a korábbi szöveg feldolgozását.", variant: "destructive" });
    }
  };

  const toggleRecording = async () => {
    if (startingRef.current || skipAudioRef.current) return;
    if (isRecording) {
      await audioRecorderRef.current?.stop();
      setIsRecording(false);
      toast({ title: "Rögzítés leállítva", description: "A hangfelvétel befejeződött." });
    } else {
      startingRef.current = true;
      setIsStarting(true);
      try {
        await audioQueue.idle();
        recordingLanguages.current = { inputLang, outputLang };
        if (!audioRecorderRef.current) {
          audioRecorderRef.current = new AudioRecorder(() => stopOnError('A hangrögzítés megszakadt. Indítsa újra a felvételt.'));
        }
        await audioRecorderRef.current.start(handleAudioChunk);
        if (!mountedRef.current) return;
        setOriginalText("");
        setTranslatedText("");
        setIsRecording(true);
        toast({ title: "Rögzítés elindult", description: "Kezdje el beszélni a mikrofonba." });
      } catch (error) {
        console.error('Error starting recording:', error);
        toast({ title: "Hiba", description: "Nem sikerült elindítani a mikrofont. Ellenőrizze az engedélyeket.", variant: "destructive" });
      } finally {
        startingRef.current = false;
        if (mountedRef.current) setIsStarting(false);
      }
    }
  };

  const swapLanguages = () => {
    setInputLang(outputLang);
    setOutputLang(inputLang);
  };

  const handleSlideCapture = async (file: File) => {
    if (skipAudioRef.current || isPolishing) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: "Hiba", description: "Kérjük, válasszon képfájlt.", variant: "destructive" });
      return;
    }
    console.log('handleSlideCapture called, file size:', file.size, 'type:', file.type);
    skipAudioRef.current = true;
    console.log('Audio processing paused for slide capture');
    setIsProcessingSlide(true);
    try {
      await audioRecorderRef.current?.pause();
      await audioQueue.idle();
      console.log('Starting image resize...');
      const base64Image = await resizeImage(file);
      console.log('Image resized, base64 length:', base64Image.length);
      
      console.log('Invoking translate-slide...');
      const { data, error } = await supabase.functions.invoke('translate-slide', {
        body: { image: base64Image, outputLang },
        signal: requestController.current.signal,
      });

      console.log('translate-slide response received');

      if (error) throw error;
      if (data?.error) throw new Error(readableText(data.error));
      if (!mountedRef.current) return;

      console.log('Processing slide response data...');
      const safeStr = readableText;

      if (data?.originalSlideText || data?.translatedSlideText) {
        setSlideEntries(prev => [...prev, {
          id: Date.now(),
          original: safeStr(data.originalSlideText) || '(nem sikerült kiolvasni)',
          translated: safeStr(data.translatedSlideText) || '(nem sikerült lefordítani)',
        }]);
        console.log('Slide entry added to state');
        toast({ title: "Dia feldolgozva", description: "A dia szövege sikeresen lefordítva." });
      } else {
        console.warn('No slide text in response:', data);
        toast({ title: "Figyelmeztetés", description: "Nem sikerült szöveget kiolvasni a diáról.", variant: "destructive" });
      }
    } catch (error) {
      console.error('Slide processing error:', error);
      const description = await functionError(error);
      if (error && typeof error === 'object' && 'context' in error && error.context instanceof Response && [402, 403, 429].includes(error.context.status)) {
        stopOnError(description);
      } else {
        toast({ title: "Hiba", description, variant: "destructive" });
      }
    } finally {
      if (mountedRef.current) {
        try { await audioRecorderRef.current?.resume(); }
        catch { stopOnError('A mikrofonkapcsolat megszakadt. Indítsa újra a felvételt.'); }
        setIsProcessingSlide(false);
      }
      skipAudioRef.current = false;
    }
  };

  const handleSlideDelete = (id: number) => {
    setSlideEntries(prev => prev.filter(e => e.id !== id));
  };

  const hasText = originalText.length > 0 || translatedText.length > 0 || slideEntries.length > 0;

  const downloadTranscript = async () => {
    if (isPolishing || isProcessing || isProcessingSlide || isRecording) return;
    setIsPolishing(true);
    const inputName = LANGUAGES.find(l => l.code === inputLang)?.name ?? inputLang;
    const outputName = LANGUAGES.find(l => l.code === outputLang)?.name ?? outputLang;
    const timestamp = new Date().toLocaleString('hu-HU');

    let finalOriginal = originalText;
    let finalTranslated = translatedText;

    try {
      if (originalText || translatedText) {
      const { data, error } = await supabase.functions.invoke('polish-text', {
        body: { originalText, translatedText, inputLang, outputLang },
        signal: requestController.current.signal,
      });
      if (error) throw error;
      if (data?.fallback) throw new Error(readableText(data.warning));
      if (data?.polishedOriginal) finalOriginal = readableText(data.polishedOriginal);
      if (data?.polishedTranslation) finalTranslated = readableText(data.polishedTranslation);
      }
    } catch (error) {
      console.error('Polish error, using raw text:', error);
      toast({ title: "Figyelmeztetés", description: "A szöveg szépítése nem sikerült, a nyers szöveget töltjük le." });
    }

    try {
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
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      console.error('Download failed:', error);
      toast({ title: "Hiba", description: "Nem sikerült letölteni a szöveget.", variant: "destructive" });
    } finally { setIsPolishing(false); }
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
          <LanguageSelector label="Bemeneti nyelv" value={inputLang} onChange={setInputLang} languages={LANGUAGES} disabled={isRecording || isStarting || isProcessing || isProcessingSlide || isPolishing} />
          <Button variant="ghost" size="icon" onClick={swapLanguages} disabled={isRecording || isStarting || isProcessing || isProcessingSlide || isPolishing} className="rounded-full text-muted-foreground hover:text-foreground" aria-label="Nyelvek cseréje">
            <ArrowLeftRight size={20} />
          </Button>
          <LanguageSelector label="Kimeneti nyelv" value={outputLang} onChange={setOutputLang} languages={LANGUAGES} disabled={isRecording || isStarting || isProcessing || isProcessingSlide || isPolishing} />
        </div>
      </div>

      {/* Record Button + Slide Capture */}
      <div className="container mx-auto px-4 py-4 flex flex-col items-center gap-4">
        <div className="relative">
          {isRecording && <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />}
          <RecordButton isRecording={isRecording} onClick={toggleRecording} disabled={isStarting || isProcessingSlide || isPolishing || (isProcessing && !isRecording)} />
        </div>
      </div>

      {/* Download + Slide capture buttons */}
      <div className="container mx-auto px-4 flex justify-between items-center">
        <SlideCapture
          isProcessing={isProcessingSlide || isPolishing || isStarting}
          slideEntries={[]}
          onCapture={handleSlideCapture}
          onDelete={handleSlideDelete}
        />
        <Button variant="outline" size="sm" onClick={downloadTranscript} disabled={!hasText || isPolishing || isRecording || isStarting || isProcessing || isProcessingSlide} className="gap-2">
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
              isProcessing={isProcessingSlide || isPolishing || isStarting}
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
