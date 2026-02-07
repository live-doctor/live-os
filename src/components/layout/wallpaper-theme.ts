const DEFAULT_BRAND_HSL = "328 87% 49%";
const LIGHTEN_AMOUNT = 8;

const WALLPAPER_BRAND_COLORS: Record<string, string> = {
  "1": "259 100% 59%",
  "2": "6 56% 54%",
  "3": "22 88% 40%",
  "4": "198 100% 31%",
  "5": "202 100% 33%",
  "6": "160 100% 27%",
  "7": "79 100% 25%",
  "8": "185 100% 29%",
  "9": "359 64% 62%",
  "10": "18 75% 52%",
  "11": "185 100% 29%",
  "12": "332 84% 47%",
  "13": "194 81% 39%",
  "14": "328 87% 49%",
  "15": "32 100% 36%",
  "16": "265 100% 42%",
  "17": "184 100% 25%",
  "18": "259 100% 59%",
  "19": "204 100% 41%",
  "20": "259 100% 59%",
  "21": "12 78% 50%",
};

function lightenHsl(hsl: string, amount: number) {
  const [hue = "0", saturationToken = "0%", lightnessToken = "50%"] =
    hsl.split(" ");
  const saturation = Number.parseFloat(saturationToken.replace("%", ""));
  const lightness = Number.parseFloat(lightnessToken.replace("%", ""));
  const safeLightness = Number.isFinite(lightness) ? lightness : 50;
  const nextLightness = Math.min(100, safeLightness + amount);
  const safeSaturation = Number.isFinite(saturation) ? saturation : 0;
  return `${hue} ${safeSaturation}% ${nextLightness}%`;
}

function extractWallpaperId(path: string) {
  const match = path.match(/\/wallpapers\/([^/.]+)\.[a-z]+$/i);
  return match?.[1];
}

export function getWallpaperBrandColorHsl(path: string) {
  const id = extractWallpaperId(path);
  return (id && WALLPAPER_BRAND_COLORS[id]) || DEFAULT_BRAND_HSL;
}

export function applyWallpaperBrandCssVars(path: string) {
  const color = getWallpaperBrandColorHsl(path);
  const root = document.documentElement;
  root.style.setProperty("--color-brand", color);
  root.style.setProperty("--color-brand-lighter", lightenHsl(color, LIGHTEN_AMOUNT));
  root.style.setProperty(
    "--color-brand-lightest",
    lightenHsl(color, LIGHTEN_AMOUNT * 2),
  );
}
