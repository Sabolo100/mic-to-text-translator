import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface LanguageSelectorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  languages: { code: string; name: string }[];
}

export const LanguageSelector = ({ label, value, onChange, languages, disabled }: LanguageSelectorProps) => {
  return (
    <div className="flex flex-col gap-2">
      <Label className="text-sm font-medium text-muted-foreground">{label}</Label>
      <Select disabled={disabled} value={value} onValueChange={onChange}>
        <SelectTrigger aria-label={label} className="w-full md:w-[200px] bg-secondary border-border hover:bg-secondary/80 transition-colors">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {languages.map((lang) => (
            <SelectItem key={lang.code} value={lang.code}>
              {lang.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
