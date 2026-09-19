(() => {
    const storedTheme = localStorage.getItem("prosperitas-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme =
        storedTheme === "light" || storedTheme === "dark"
            ? storedTheme
            : prefersDark
              ? "dark"
              : "light";

    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
})();
