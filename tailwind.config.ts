import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        
        /* Surface tokens */
        surface: {
          DEFAULT: "hsl(var(--surface))",
          muted: "hsl(var(--surface-muted))",
          elevated: "hsl(var(--surface-elevated))",
        },
        
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        
        /* Semantic colors with explicit "on-*" tokens */
        primary: {
          DEFAULT: "hsl(var(--primary) / <alpha-value>)",
          foreground: "hsl(var(--primary-foreground))", // Legacy compatibility
          light: "hsl(var(--primary-light) / <alpha-value>)",
          dark: "hsl(var(--primary-dark) / <alpha-value>)",
        },
        "on-primary": "hsl(var(--on-primary))",
        
        secondary: {
          DEFAULT: "hsl(var(--secondary) / <alpha-value>)",
          foreground: "hsl(var(--secondary-foreground))", // Legacy compatibility
        },
        "on-secondary": "hsl(var(--on-secondary))",
        
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))", // Legacy compatibility
        },
        
        accent: {
          DEFAULT: "hsl(var(--accent) / <alpha-value>)",
          foreground: "hsl(var(--accent-foreground))", // Legacy compatibility
          light: "hsl(var(--accent-light) / <alpha-value>)",
        },
        "on-accent": "hsl(var(--on-accent))",
        
        /* Status colors with "on-*" tokens */
        success: "hsl(var(--success) / <alpha-value>)",
        "on-success": "hsl(var(--on-success))",
        
        warning: "hsl(var(--warning) / <alpha-value>)",
        "on-warning": "hsl(var(--on-warning))",
        
        error: "hsl(var(--error) / <alpha-value>)",
        "on-error": "hsl(var(--on-error))",
        
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground))", // Legacy compatibility
        },
        "on-destructive": "hsl(var(--on-destructive))",
        
        /* Surface text tokens */
        "on-surface": "hsl(var(--on-surface))",
        "on-surface-muted": "hsl(var(--on-surface-muted))",
        
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "var(--chart-1)",
          "2": "var(--chart-2)",
          "3": "var(--chart-3)",
          "4": "var(--chart-4)",
          "5": "var(--chart-5)",
        },
        sidebar: {
          DEFAULT: "var(--sidebar-background)",
          foreground: "var(--sidebar-foreground)",
          primary: "var(--sidebar-primary)",
          "primary-foreground": "var(--sidebar-primary-foreground)",
          accent: "var(--sidebar-accent)",
          "accent-foreground": "var(--sidebar-accent-foreground)",
          border: "var(--sidebar-border)",
          ring: "var(--sidebar-ring)",
        },
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
