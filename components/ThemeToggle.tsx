"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="w-9 h-9 rounded-full hover:bg-white/10"
      aria-label="Toggle theme"
    >
      {/* Render both icons; CSS dark: classes control which is visible.
          This avoids any JS-based conditional that causes SSR/client hydration mismatch. */}
      <Sun className="h-4 w-4 text-yellow-400 hidden dark:block" />
      <Moon className="h-4 w-4 text-slate-600 block dark:hidden" />
    </Button>
  );
}
