import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Settings, Check } from "lucide-react";

export type Palette = {
  id: string;
  name: string;
  bg: string;
  primary: string;
  fg: string;
  vars: Record<string, string>;
};

export const PALETTES: Palette[] = [
  {
    id: "arctic",
    name: "Arctic",
    bg: "#ffffff",
    primary: "#2B7FE0",
    fg: "#0f172a",
    vars: {
      "--background": "oklch(1 0 0)",
      "--foreground": "oklch(0.21 0.04 257)",
      "--card": "oklch(1 0 0)",
      "--card-foreground": "oklch(0.21 0.04 257)",
      "--primary": "oklch(0.62 0.16 254)",
      "--primary-foreground": "oklch(0.99 0 0)",
    },
  },
  {
    id: "midnight",
    name: "Midnight",
    bg: "#0f172a",
    primary: "#60a5fa",
    fg: "#f1f5f9",
    vars: {
      "--background": "oklch(0.2 0.03 257)",
      "--foreground": "oklch(0.97 0.005 250)",
      "--card": "oklch(0.24 0.035 257)",
      "--card-foreground": "oklch(0.97 0.005 250)",
      "--primary": "oklch(0.75 0.13 254)",
      "--primary-foreground": "oklch(0.18 0.03 257)",
    },
  },
  {
    id: "forest",
    name: "Forest",
    bg: "#f6faf6",
    primary: "#16a34a",
    fg: "#14352a",
    vars: {
      "--background": "oklch(0.98 0.01 150)",
      "--foreground": "oklch(0.25 0.05 155)",
      "--card": "oklch(1 0 0)",
      "--card-foreground": "oklch(0.25 0.05 155)",
      "--primary": "oklch(0.6 0.16 150)",
      "--primary-foreground": "oklch(0.99 0 0)",
    },
  },
  {
    id: "sunset",
    name: "Sunset",
    bg: "#fff7ed",
    primary: "#ea580c",
    fg: "#3b1a06",
    vars: {
      "--background": "oklch(0.98 0.02 70)",
      "--foreground": "oklch(0.25 0.05 40)",
      "--card": "oklch(1 0 0)",
      "--card-foreground": "oklch(0.25 0.05 40)",
      "--primary": "oklch(0.65 0.18 45)",
      "--primary-foreground": "oklch(0.99 0 0)",
    },
  },
  {
    id: "rose",
    name: "Rose",
    bg: "#fff5f7",
    primary: "#db2777",
    fg: "#3b0d20",
    vars: {
      "--background": "oklch(0.98 0.015 350)",
      "--foreground": "oklch(0.25 0.06 350)",
      "--card": "oklch(1 0 0)",
      "--card-foreground": "oklch(0.25 0.06 350)",
      "--primary": "oklch(0.6 0.2 350)",
      "--primary-foreground": "oklch(0.99 0 0)",
    },
  },
  {
    id: "graphite",
    name: "Graphite",
    bg: "#111827",
    primary: "#e5e7eb",
    fg: "#f9fafb",
    vars: {
      "--background": "oklch(0.22 0.01 260)",
      "--foreground": "oklch(0.97 0 0)",
      "--card": "oklch(0.27 0.012 260)",
      "--card-foreground": "oklch(0.97 0 0)",
      "--primary": "oklch(0.85 0 0)",
      "--primary-foreground": "oklch(0.2 0 0)",
    },
  },
];

const STORAGE_KEY = "sciras.palette";

type Ctx = { paletteId: string; setPalette: (id: string) => void };
const ThemeCtx = createContext<Ctx>({ paletteId: "arctic", setPalette: () => {} });

function applyPalette(id: string) {
  const p = PALETTES.find((x) => x.id === id) ?? PALETTES[0];
  const root = document.documentElement;
  for (const [k, v] of Object.entries(p.vars)) root.style.setProperty(k, v);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [paletteId, setPaletteId] = useState<string>("arctic");

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    const id = saved && PALETTES.some((p) => p.id === saved) ? saved : "arctic";
    setPaletteId(id);
    applyPalette(id);
  }, []);

  function setPalette(id: string) {
    setPaletteId(id);
    localStorage.setItem(STORAGE_KEY, id);
    applyPalette(id);
  }

  return <ThemeCtx.Provider value={{ paletteId, setPalette }}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
  return useContext(ThemeCtx);
}

export function SettingsButton({ className }: { className?: string }) {
  const { paletteId, setPalette } = useTheme();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className={className} aria-label="Configurações de aparência">
          <Settings className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <div className="mb-2">
          <p className="text-sm font-semibold">Aparência</p>
          <p className="text-xs text-muted-foreground">Escolha uma paleta de cores.</p>
        </div>
        <div className="grid grid-cols-1 gap-2">
          {PALETTES.map((p) => {
            const active = p.id === paletteId;
            return (
              <button
                key={p.id}
                onClick={() => setPalette(p.id)}
                className={`flex items-center justify-between rounded-lg border p-2 text-left transition hover:bg-accent ${
                  active ? "ring-2 ring-primary" : ""
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-1">
                    <span className="h-6 w-6 rounded-full border" style={{ background: p.bg }} />
                    <span className="h-6 w-6 rounded-full border" style={{ background: p.primary }} />
                    <span className="h-6 w-6 rounded-full border" style={{ background: p.fg }} />
                  </div>
                  <span className="text-sm">{p.name}</span>
                </div>
                {active && <Check className="h-4 w-4 text-primary" />}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
