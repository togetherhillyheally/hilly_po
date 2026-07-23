import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "*.{js,ts,jsx,tsx,mdx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          100: "#FEE3ED",
          200: "#FBB8D2",
          300: "#F98CB7",
          400: "#F5564E",
          500: "#ED316C",
          600: "#FC8821",
          DEFAULT: "#ED316C",
          foreground: "#fff",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          100: "#FEEFE6",
          200: "#FCD7B6",
          300: "#FCB97E",
          400: "#FC8821",
          DEFAULT: "#FC8821",
          foreground: "#fff",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Custom brand colors
        brand: {
          50: "#fef2f4",
          100: "#fde6ea",
          200: "#fbd0da",
          300: "#f7aabe",
          400: "#f27a9b",
          500: "#ed3269",
          600: "#d91f5a",
          700: "#b71548",
          800: "#981242",
          900: "#80113e",
        },
        accentPalette: {
          50: "#fef6f2",
          100: "#fdeae5",
          200: "#fbd4ca",
          300: "#f7b5a4",
          400: "#f2896e",
          500: "#f05f3e",
          600: "#de4424",
          700: "#b8341a",
          800: "#962c1a",
          900: "#7a281c",
        },
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: "65ch",
            color: "#111827",
            a: { color: "#ED316C" },
            h1: { color: "#111827" },
            h2: { color: "#111827" },
            h3: { color: "#111827" },
            strong: { color: "#111827" },
            table: { width: "100%" },
          },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;

export default config;
