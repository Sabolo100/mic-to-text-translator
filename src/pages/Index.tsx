import { useState, useRef } from "react";
import { LanguageSelector } from "@/components/LanguageSelector";
import { TranslationDisplay } from "@/components/TranslationDisplay";
import { RecordButton } from "@/components/RecordButton";
import { AudioRecorder } from "@/utils/audioRecorder";
import { blobToBase64 } from "@/utils/audioUtils";
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
  const audioRecorderRef = useRef<AudioRecorder | null>(null);
  const { toast } = useToast();

  const handleAudioChunk = async (audioBlob: Blob) => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      const base64Audio = await blobToBase64(audioBlob);
      console.log('Processing audio chunk, size:', audioBlob.size);

      const { data, error } = await supabase.functions.invoke('translate-speech', {
        body: {
          audio: base64Audio,
          inputLang,
          outputLang,
        },
      });

      if (error) {
        console.error('Translation error:', error);
        throw error;
      }

      if (data?.transcription) {
        setOriginalText(prev =>
          prev ? `${prev} ${data.transcription}` : data.transcription
        );
      }

      if (data?.translation) {
        setTranslatedText(prev =>
          prev ? `${prev} ${data.translation}` : data.translation
        );
      }
    } catch (error) {
      console.error('Error processing audio:', error);
      toast({
        title: "Hiba",
        description: "Hiba történt a fordítás során. Kérjük, próbálja újra.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      audioRecorderRef.current?.stop();
      setIsRecording(false);
      toast({
        title: "Rögzítés leállítva",
        description: "A hangfelvétel befejeződött.",
      });
    } else {
      try {
        setOriginalText("");
        setTranslatedText("");
        if (!audioRecorderRef.current) {
          audioRecorderRef.current = new AudioRecorder();
        }
        await audioRecorderRef.current.start(handleAudioChunk);
        setIsRecording(true);
        toast({
          title: "Rögzítés elindult",
          description: "Kezdje el beszélni a mikrofonba.",
        });
      } catch (error) {
        console.error('Error starting recording:', error);
        toast({
          title: "Hiba",
          description: "Nem sikerült elindítani a mikrofonot. Ellenőrizze az engedélyeket.",
          variant: "destructive",
        });
      }
    }
  };

  const swapLanguages = () => {
    setInputLang(outputLang);
    setOutputLang(inputLang);
  };

  const hasText = originalText.length > 0 || translatedText.length > 0;

  const downloadTranscript = () => {
    const inputName = LANGUAGES.find(l => l.code === inputLang)?.name ?? inputLang;
    const outputName = LANGUAGES.find(l => l.code === outputLang)?.name ?? outputLang;
    const timestamp = new Date().toLocaleString('hu-HU');

    const content = [
      `Eredeti szöveg (${inputName}):`,
      originalText || '(üres)',
      '',
      `Fordítás (${outputName}):`,
      translatedText || '(üres)',
      '',
      '---',
      `Generálta: Valós Idejű Fordító`,
      `Dátum: ${timestamp}`,
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `forditas_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
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
          <LanguageSelector
            label="Bemeneti nyelv"
            value={inputLang}
            onChange={setInputLang}
            languages={LANGUAGES}
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={swapLanguages}
            className="rounded-full text-muted-foreground hover:text-foreground"
            aria-label="Nyelvek cseréje"
          >
            <ArrowLeftRight size={20} />
          </Button>
          <LanguageSelector
            label="Kimeneti nyelv"
            value={outputLang}
            onChange={setOutputLang}
            languages={LANGUAGES}
          />
        </div>
      </div>

      {/* Record Button */}
      <div className="container mx-auto px-4 py-4 flex justify-center">
        <div className="relative">
          {isRecording && (
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
          )}
          <RecordButton
            isRecording={isRecording}
            onClick={toggleRecording}
            disabled={isProcessing && !isRecording}
          />
        </div>
      </div>

      {/* Download button */}
      <div className="container mx-auto px-4 flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={downloadTranscript}
          disabled={!hasText}
          className="gap-2"
        >
          <Download size={16} />
          Letöltés
        </Button>
      </div>

      {/* Translation Display - Two columns */}
      <div className="flex-1 container mx-auto px-4 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TranslationDisplay
            title="Eredeti szöveg"
            text={originalText}
            isLoading={isProcessing}
            placeholder="Beszéljen a mikrofonba..."
          />
          <TranslationDisplay
            title="Fordítás"
            text={translatedText}
            isLoading={isProcessing}
            placeholder="A fordítás itt jelenik meg..."
          />
        </div>
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
