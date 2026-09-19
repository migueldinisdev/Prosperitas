/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
    theme: {
        extend: {
            fontFamily: {
                sans: ["Inter", "sans-serif"],
            },
            colors: {
                app: {
                    bg: "rgb(var(--color-app-bg) / <alpha-value>)",
                    card: "rgb(var(--color-app-card) / <alpha-value>)",
                    surface: "rgb(var(--color-app-surface) / <alpha-value>)",
                    border: "rgb(var(--color-app-border) / <alpha-value>)",
                    foreground: "rgb(var(--color-app-foreground) / <alpha-value>)",
                    muted: "rgb(var(--color-app-muted) / <alpha-value>)",
                    primary: "rgb(var(--color-app-primary) / <alpha-value>)",
                    accent: "rgb(var(--color-app-accent) / <alpha-value>)",
                    success: "rgb(var(--color-app-success) / <alpha-value>)",
                    danger: "rgb(var(--color-app-danger) / <alpha-value>)",
                    warning: "rgb(var(--color-app-warning) / <alpha-value>)",
                    info: "rgb(var(--color-app-info) / <alpha-value>)",
                    text: "rgb(var(--color-app-foreground) / <alpha-value>)",
                },
            },
        },
    },
    plugins: [],
};
