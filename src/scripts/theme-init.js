(function() {
  var STORAGE_KEY = 'nvirya_theme_pref';
  var pref = 'system';
  try {
    var saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      pref = saved;
    }
  } catch (e) {}
  var prefersDark = false;
  try {
    prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch (e) {}
  var resolved = pref === 'system' ? (prefersDark ? 'dark' : 'light') : pref;
  document.documentElement.setAttribute('data-theme', resolved);
  document.documentElement.setAttribute('data-theme-pref', pref);
})();