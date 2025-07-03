// src/lib/constants.ts
// MODIFIED BY GEMINI (v1): Added '0' to ITEM_LEVEL_COLORS_CSS_VARS,
//                           mapping it to 'var(--level-1-color)' for visual consistency.

export const NATO_ALPHABET = [
  "Alpha", "Bravo", "Charlie", "Delta", "Echo", "Foxtrot", "Golf", "Hotel", 
  "India", "Juliett", "Kilo", "Lima", "Mike", "November", "Oscar", "Papa", 
  "Quebec", "Romeo", "Sierra", "Tango", "Uniform", "Victor", "Whiskey", 
  "X-ray", "Yankee", "Zulu"
];

// This is the raw HSL string values (e.g., "H S% L%"), no commas, no var().
export const ITEM_LEVEL_COLORS_CSS_VARS_RAW_HSL = {
  0: '220 10% 40%', // Level 0 uses Level 1 color for display
  1: '220 10% 40%',  // Grey (Cool Grey/Blueish)
  2: '120 60% 45%',  // Green
  3: '55 100% 50%',  // Yellow
  4: '30 100% 50%',  // Orange
  5: '0 100% 50%',   // Red
  6: '180 100% 50%', // blue
  7: '300 100% 50%', // Magenta  
  8: '270 60% 55%',  // Purple
};


export const ITEM_LEVEL_COLORS_CSS_VARS = {
  0: "var(--level-1-color)",
  1: "var(--level-1-color)",
  2: "var(--level-2-color)",
  3: "var(--level-3-color)",
  4: "var(--level-4-color)",
  5: "var(--level-5-color)",
  6: "var(--level-6-color)",
  7: "var(--level-7-color)",
  8: "var(--level-8-color)",
};

export const ITEM_LEVEL_AESTHETIC_SCHEMES = {
  // From globals.css, matching theme names to levels if applicable
  "level-1-grey": { name: "Level 1 (Grey)", themeClass: "theme-level-1-grey" },
  "level-2-green": { name: "Level 2 (Green)", themeClass: "theme-level-2-green" },
  "level-3-yellow": { name: "Level 3 (Yellow)", themeClass: "theme-level-3-yellow" },
  "level-4-orange": { name: "Level 4 (Orange)", themeClass: "theme-level-4-orange" },
  "level-5-red": { name: "Level 6 (Red)", themeClass: "theme-level-6-red" },
  "level-6-cyan": { name: "Level 7 (Cyan)", themeClass: "theme-level-7-cyan" },
  "level-7-magenta": { name: "Level 8 (Magenta)", themeClass: "theme-level-8-magenta" },  
  "level-8-purple": { name: "Level 5 (Purple)", themeClass: "theme-level-5-purple" },
};

export const XP_THRESHOLDS = [0, 100, 200, 400, 800, 1600, 3200, 6400, 12800]; // XP needed for next level (index is level, value is XP for that level)


export const FACTION_THEMES = {
  Cyphers: "cyphers", // Corresponds to default :root or .theme-cyphers
  Shadows: "shadows", // Corresponds to .theme-shadows
  Observer: "cyphers", // Observer uses default theme
};

// Offensive word filter - Placeholder. In a real app, use a proper library or the provided JSON.
const OFFENSIVE_WORDS_SAMPLE = ["badword1", "offensive2", "example3"];

export function filterOffensiveWords(text: string): boolean {
  if (!text) return true; // Allow empty
  const lowerText = text.toLowerCase();
  return !OFFENSIVE_WORDS_SAMPLE.some(word => lowerText.includes(word));
}
