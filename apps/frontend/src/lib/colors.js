// Convert hex to RGB
export const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { r: 99, g: 102, b: 241 }; // fallback to indigo
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
};

// Get derived colors from a hex color (for backgrounds, text, etc.)
export const getColorsFromHex = (hex) => {
  const { r, g, b } = hexToRgb(hex);
  return {
    bg: `rgba(${r}, ${g}, ${b}, 0.15)`,
    bgHover: `rgba(${r}, ${g}, ${b}, 0.25)`,
    text: hex,
    solid: hex,
  };
};

// Preset color palette for color picker (18 colors = 3 rows of 6)
export const colorPalette = [
  "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16", "#22c55e",
  "#10b981", "#14b8a6", "#06b6d4", "#0ea5e9", "#3b82f6", "#6366f1",
  "#8b5cf6", "#a855f7", "#d946ef", "#ec4899", "#f43f5e", "#78716c",
];
