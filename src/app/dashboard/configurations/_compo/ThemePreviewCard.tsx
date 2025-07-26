import * as React from "react";
import { cn } from "@/lib/utils";

interface ThemePreviewCardProps extends React.HTMLAttributes<HTMLDivElement> {
  themeName: string;
  selected: boolean;
}

export function ThemePreviewCard({
  themeName,
  selected,
  className,
  ...props
}: ThemePreviewCardProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-md border-2 border-muted p-2 hover:border-accent",
        selected && "border-primary",
        className
      )}
      {...props}
    >
      <div className={cn("w-full h-full rounded-md p-1", themeName)}>
        <div className="flex items-center space-x-2">
          <div className="h-4 w-4 rounded-full bg-primary" />
          <div className="h-2 w-[80px] rounded-lg bg-primary" />
        </div>
        <div className="flex items-center space-x-2 mt-2">
          <div className="h-4 w-4 rounded-full bg-secondary" />
          <div className="h-2 w-[80px] rounded-lg bg-secondary" />
        </div>
        <div className="flex items-center space-x-2 mt-2">
          <div className="h-4 w-4 rounded-full bg-muted" />
          <div className="h-2 w-[80px] rounded-lg bg-muted" />
        </div>
      </div>
    </div>
  );
}