import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        base: "#0A0A0A", // Very dark background
        brutalBlack: "#171717", // Slightly lighter for contrast
        brutalWhite: "#FAFAFA",
        accentMain: "#00CC44", // Cyber tech green
        accentHover: "#00FF66", // Bright neon green
      },
      borderWidth: {
        'brutal': '4px',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'sans-serif'],
        mono: ['var(--font-space-mono)', 'monospace'],
      }
    },
  },
  plugins: [],
};
export default config;
