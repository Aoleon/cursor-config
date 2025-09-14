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
        background: "var(--background)",
        foreground: "var(--foreground)",
        
        /* Surface tokens */
        surface: {
          DEFAULT: "var(--surface)",
          muted: "var(--surface-muted)",
          elevated: "var(--surface-elevated)",
        },
        
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        
        /* Semantic colors with explicit "on-*" tokens */
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)", // Legacy compatibility
          light: "var(--primary-light)",
          dark: "var(--primary-dark)",
        },
        "on-primary": "var(--on-primary)",
        
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)", // Legacy compatibility
        },
        "on-secondary": "var(--on-secondary)",
        
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)", // Legacy compatibility
        },
        
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)", // Legacy compatibility
          light: "var(--accent-light)",
        },
        "on-accent": "var(--on-accent)",
        
        /* Status colors with "on-*" tokens */
        success: "var(--success)",
        "on-success": "var(--on-success)",
        
        warning: "var(--warning)",
        "on-warning": "var(--on-warning)",
        
        error: "var(--error)",
        "on-error": "var(--on-error)",
        
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)", // Legacy compatibility
        },
        "on-destructive": "var(--on-destructive)",
        
        /* Surface text tokens */
        "on-surface": "var(--on-surface)",
        "on-surface-muted": "var(--on-surface-muted)",
        
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
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
