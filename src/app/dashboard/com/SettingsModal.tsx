'use client';

import { useState, useEffect } from 'react';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@rutas/components/ui/dialog";
import { Button } from "@rutas/components/ui/button";
import { Label } from "@rutas/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@rutas/components/ui/select";
import { useTheme } from "next-themes";

interface SettingsModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsModal({ isOpen, onOpenChange }: SettingsModalProps) {
  const { theme, setTheme } = useTheme();
  const [selectedTheme, setSelectedTheme] = useState(theme || 'light');

  useEffect(() => {
    setSelectedTheme(theme || 'light');
  }, [theme]);

  const handleThemeChange = (value: string) => {
    setSelectedTheme(value);
  };

  const handleSaveClick = () => {
    setTheme(selectedTheme);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Configuraciones</DialogTitle>
          <DialogDescription>
            Ajusta las configuraciones de tu cuenta y apariencia.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="theme" className="text-right">
              Tema
            </Label>
            <Select value={selectedTheme} onValueChange={handleThemeChange}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Seleccionar tema" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="theme-claude">Claude Claro</SelectItem>
                <SelectItem value="theme-claude-dark">Claude Oscuro</SelectItem>
                <SelectItem value="theme-vercel">Vercel Claro</SelectItem>
                <SelectItem value="theme-vercel-dark">Vercel Oscuro</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSaveClick}>Guardar</Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 