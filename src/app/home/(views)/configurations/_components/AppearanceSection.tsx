import * as React from "react";
import { Button } from "@/components/ui/button";
import { ThemePreviewCard } from "./ThemePreviewCard";
import { useTheme } from "next-themes";
import { useUIStyle } from "@/app/context/UIStyleContext";
import { Sun, Moon, ChevronDown } from "lucide-react";
import { useState } from 'react'; // Forzar recarga

interface AppearanceSectionProps {
  selectedTheme: string;
  onThemeChange: (theme: string) => void;
}

export function AppearanceSection({ selectedTheme, onThemeChange }: AppearanceSectionProps) {
  const { theme, setTheme } = useTheme();
  const [showThemePreviews, setShowThemePreviews] = useState(true);
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
{/* Theme Previews Toggle */}
        <div className="flex justify-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowThemePreviews(!showThemePreviews)}
            aria-expanded={showThemePreviews}
            aria-label="Toggle theme previews"
          >
            <ChevronDown className={`h-5 w-5 transition-transform ${showThemePreviews ? 'rotate-180' : ''}`} />
          </Button>
        </div>
        </div>
        
        {/* Theme Previews */}
        <div className={`grid grid-cols-3 gap-4 overflow-hidden transition-all duration-300 ease-in-out ${showThemePreviews ? 'max-h-screen opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
          <div className="flex flex-col items-center">
            <ThemePreviewCard
              themeName="theme-claude"
              selected={selectedTheme === 'theme-claude'}
              onClick={() => onThemeChange('theme-claude')}
            />
            <span className="mt-2 text-sm font-medium">Claude</span>
          </div>
          <div className="flex flex-col items-center">
            <ThemePreviewCard
              themeName="theme-vercel"
              selected={selectedTheme === 'theme-vercel'}
              onClick={() => onThemeChange('theme-vercel')}
            />
            <span className="mt-2 text-sm font-medium">Vercel</span>
          </div>
          <div className="flex flex-col items-center">
            <ThemePreviewCard
              themeName="system"
              selected={selectedTheme === 'system'}
              onClick={() => onThemeChange('system')}
            />
            <span className="mt-2 text-sm font-medium">Sistema</span>
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
              variant={!theme?.endsWith('-dark') && selectedTheme !== 'system' ? 'default' : 'outline'}
              size="sm"
              onClick={() => selectedTheme === 'system' ? setTheme('system') : setTheme(selectedTheme)}
              disabled={selectedTheme === 'system'}
            >
              <Sun className="h-4 w-4 mr-2" />
              Claro
            </Button>
            <Button
              variant={theme?.endsWith('-dark') && selectedTheme !== 'system' ? 'default' : 'outline'}
              size="sm"
              onClick={() => selectedTheme === 'system' ? setTheme('system') : setTheme(`${selectedTheme}-dark`)}
              disabled={selectedTheme === 'system'}
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