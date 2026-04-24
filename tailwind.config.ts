import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			fontFamily: {
			'manrope': ['Manrope', 'sans-serif'],
			'sans': ['Manrope', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'Noto Sans', 'sans-serif'],
		        },
		colors: {
			border: 'hsl(var(--border))',
			input: 'hsl(var(--input))',
			ring: 'hsl(var(--ring))',
			background: 'hsl(var(--background))',
			foreground: 'hsl(var(--foreground))',
			primary: {
				DEFAULT: 'hsl(var(--primary))',
				foreground: 'hsl(var(--primary-foreground))',
				light: 'hsl(var(--primary-light))',
				dark: 'hsl(var(--primary-dark))'
			},
			secondary: {
				DEFAULT: 'hsl(var(--secondary))',
				foreground: 'hsl(var(--secondary-foreground))'
			},
			destructive: {
				DEFAULT: 'hsl(var(--destructive))',
				foreground: 'hsl(var(--destructive-foreground))'
			},
			muted: {
				DEFAULT: 'hsl(var(--muted))',
				foreground: 'hsl(var(--muted-foreground))'
			},
			accent: {
				DEFAULT: 'hsl(var(--accent))',
				foreground: 'hsl(var(--accent-foreground))'
			},
			popover: {
				DEFAULT: 'hsl(var(--popover))',
				foreground: 'hsl(var(--popover-foreground))'
			},
			card: {
				DEFAULT: 'hsl(var(--card))',
				foreground: 'hsl(var(--card-foreground))'
			},
			sidebar: {
				DEFAULT: 'hsl(var(--sidebar-background))',
				foreground: 'hsl(var(--sidebar-foreground))',
				primary: 'hsl(var(--sidebar-primary))',
				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
				accent: 'hsl(var(--sidebar-accent))',
				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
				border: 'hsl(var(--sidebar-border))',
				ring: 'hsl(var(--sidebar-ring))'
			},
			// ── Palette overrides ──────────────────────────────────────────
			// Remap `blue-*` → amber so all hardcoded `bg-blue-600` etc
			// across inner components auto-inherit the new primary.
			blue: {
				50:  '#fffbeb',
				100: '#fef3c7',
				200: '#fde68a',
				300: '#fcd34d',
				400: '#fbbf24',
				500: '#f59e0b',
				600: '#d97706',   // was blue-600 → now amber-600
				700: '#b45309',
				800: '#92400e',
				900: '#78350f',
				950: '#451a03',
			},
			// Remap `gray-*` → warm neutrals matching --background token
			gray: {
				50:  'hsl(36, 18%, 97%)',
				100: 'hsl(36, 14%, 93%)',
				200: 'hsl(36, 12%, 87%)',
				300: 'hsl(36, 10%, 78%)',
				400: 'hsl(36,  8%, 62%)',
				500: 'hsl(220, 10%, 48%)',
				600: 'hsl(220, 12%, 36%)',
				700: 'hsl(220, 13%, 26%)',
				800: 'hsl(220, 15%, 18%)',
				900: 'hsl(220, 15%, 13%)',
			},
			// Neumorphism and glassmorphism colors
			shadow: {
				light: 'hsl(var(--shadow-light))',
				dark: 'hsl(var(--shadow-dark))'
			},
			glass: {
				bg: 'hsl(var(--glass-bg))',
				border: 'hsl(var(--glass-border))'
			}
		},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				'float': {
					'0%, 100%': { transform: 'translateY(0px)' },
					'50%': { transform: 'translateY(-10px)' }
				},
				'glow': {
					'0%': { boxShadow: '0 0 5px hsl(var(--primary)), 0 0 10px hsl(var(--primary))' },
					'100%': { boxShadow: '0 0 10px hsl(var(--primary)), 0 0 20px hsl(var(--primary))' }
				},
				'shimmer': {
					'0%': { backgroundPosition: '-200px 0' },
					'100%': { backgroundPosition: 'calc(200px + 100%) 0' }
				},
				'bounce-subtle': {
					'0%, 100%': { transform: 'translateY(0) scale(1)' },
					'50%': { transform: 'translateY(-5px) scale(1.05)' }
				},
				'pulse-slow': {
					'0%, 100%': { opacity: '1' },
					'50%': { opacity: '0.5' }
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'float': 'float 3s ease-in-out infinite',
				'glow': 'glow 2s ease-in-out infinite alternate',
				'shimmer': 'shimmer 2s linear infinite',
				'bounce-subtle': 'bounce-subtle 2s ease-in-out infinite',
				'pulse-slow': 'pulse-slow 3s ease-in-out infinite'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
