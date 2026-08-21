(function () {
  try {
    var theme = localStorage.getItem('krepton_theme');
    if (theme !== 'light' && theme !== 'dark') {
      theme =
        window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches
          ? 'light'
          : 'dark';
    }
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.colorScheme = theme;
  } catch (e) {}
})();
