import * as React from "react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { useUIStyle } from "@/app/context/UIStyleContext";
import { Sun, Moon } from "lucide-react";

interface AppearanceSectionProps {
  selectedTheme: string;
  onThemeChange: (theme: string) => void;
}

export function AppearanceSection({ selectedTheme, onThemeChange }: AppearanceSectionProps) {
  const { theme, setTheme } = useTheme();
  const { uiStyle, setUiStyle } = useUIStyle();

  const handleUiStyleChange = (style: 'normal' | 'minimal') => {
    setUiStyle(style);
  };

  return (
    <div>
      <h3 className="text-lg font-medium mb-4">Apariencia</h3>
      <div className="grid gap-4">
        {/* Theme Selection */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-start">
          <div className="space-y-1">
            <div className="text-sm font-medium">Tema</div>
            <div className="text-sm text-muted-foreground">
              Selecciona el tema visual de la aplicación
            </div>
          </div>
          <div className="flex gap-2 justify-self-end">
            <Button
              variant={selectedTheme === 'theme-claude' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onThemeChange('theme-claude')}
            >
              Claude
            </Button>
            <Button
              variant={selectedTheme === 'theme-vercel' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onThemeChange('theme-vercel')}
            >
              Vercel
            </Button>
          </div>
        </div>
        
        {/* Mode Selection */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-start">
          <div className="space-y-1">
            <div className="text-sm font-medium">Modo</div>
            <div className="text-sm text-muted-foreground">
              Selecciona entre modo claro u oscuro
            </div>
          </div>
          <div className="flex gap-2 justify-self-end">
            <Button
              variant={!theme?.endsWith('-dark') ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTheme(selectedTheme)}
            >
              <Sun className="h-4 w-4 mr-2" />
              Claro
            </Button>
            <Button
              variant={theme?.endsWith('-dark') ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTheme(`${selectedTheme}-dark`)}
            >
              <Moon className="h-4 w-4 mr-2" />
              Oscuro
            </Button>
          </div>
        </div>
        
        {/* UI Style Selection */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-start">
          <div className="space-y-1">
            <div className="text-sm font-medium">Estilo de UI</div>
            <div className="text-sm text-muted-foreground">
              Selecciona el estilo de la interfaz de usuario
            </div>
          </div>
          <div className="flex gap-2 justify-self-end">
            <Button
              variant={uiStyle === 'normal' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleUiStyleChange('normal')}
            >
              Normal
            </Button>
            <Button
              variant={uiStyle === 'minimal' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleUiStyleChange('minimal')}
            >
              Minimal
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}