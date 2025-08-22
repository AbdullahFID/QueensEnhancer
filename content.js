// Content entrypoint — keep featherweight for perf.
(() => {
  if (window.__qeBooted) return; window.__qeBooted = true;
  // kick the router once the scripts loaded (manifest ensures load order)
  if (window.QE?.start) QE.start();
  else document.addEventListener('readystatechange', () => window.QE?.start?.());
})();
