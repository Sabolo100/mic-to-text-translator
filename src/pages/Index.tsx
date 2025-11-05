import { useState, useRef } from "react";
import { LanguageSelector } from "@/components/LanguageSelector";
import { TranslationDisplay } from "@/components/TranslationDisplay";
import { RecordButton } from "@/components/RecordButton";
import { AudioRecorder } from "@/utils/audioRecorder";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

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
  const [translatedText, setTranslatedText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const audioRecorderRef = useRef<AudioRecorder | null>(null);
  const { toast } = useToast();

  const handleAudioChunk = async (audioBlob: Blob) => {
    if (isProcessing) return;
    
    try {
      setIsProcessing(true);
      console.log('Processing audio chunk, size:', audioBlob.size);

      // Convert blob to base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1];
        
        // Call edge function for transcription and translation
        const { data, error } = await supabase.functions.invoke('translate-speech', {
          body: {
            audio: base64Audio,
            inputLang,
            outputLang,
          }
        });

        if (error) {
          console.error('Translation error:', error);
          throw error;
        }

        if (data?.translation) {
          setTranslatedText(prev => {
            const newText = prev ? `${prev} ${data.translation}` : data.translation;
            return newText;
          });
        }
      };
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
      // Stop recording
      audioRecorderRef.current?.stop();
      setIsRecording(false);
      toast({
        title: "Rögzítés leállítva",
        description: "A hangfelvétel befejeződött.",
      });
    } else {
      // Start recording
      try {
        setTranslatedText(""); // Clear previous translations
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
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-4 md:gap-8 justify-center items-center">
          <LanguageSelector
            label="Bemeneti nyelv"
            value={inputLang}
            onChange={setInputLang}
            languages={LANGUAGES}
          />
          <div className="hidden md:block text-4xl text-muted-foreground">→</div>
          <LanguageSelector
            label="Kimeneti nyelv"
            value={outputLang}
            onChange={setOutputLang}
            languages={LANGUAGES}
          />
        </div>
      </div>

      {/* Translation Display */}
      <div className="flex-1 container mx-auto px-4 py-8">
        <TranslationDisplay text={translatedText} isLoading={isProcessing} />
      </div>

      {/* Record Button */}
      <div className="container mx-auto px-4 py-12 flex justify-center">
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

      {/* Footer */}
      <footer className="border-t border-border py-6">
        <p className="text-center text-sm text-muted-foreground">
          {isRecording 
            ? "🎤 Felvétel folyamatban... Kattintson a gombra a leállításhoz." 
            : "Kattintson a mikrofon gombra a kezdéshez"}
        </p>
      </footer>
    </div>
  );
};

export default Index;
