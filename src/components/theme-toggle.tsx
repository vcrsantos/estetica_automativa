"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    // next-themes só sabe o tema real depois de ler o localStorage no
    // navegador; até lá, o servidor e o cliente precisam renderizar o
    // mesmo placeholder ou a hidratação quebra (mismatch).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) {
    return <Button variant="outline" size="icon" aria-hidden className="opacity-0" />;
  }

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant="outline"
      size="icon"
      aria-label={isDark ? "Mudar para tema claro" : "Mudar para tema escuro"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}
