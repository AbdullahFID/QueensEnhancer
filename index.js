// residence/index.js
(() => {
  if (window.__qhxIndexLoaded) return;
  window.__qhxIndexLoaded = true;

  // home.js self-detects the homepage and bootstraps itself.
  // We still expose a bootstrap hook for the router (future expansion).
  window.Residence = {
    async bootstrap() {
      // no-op for now; home.js already ran (and has its own guards)
      // keep this so the global router doesn't throw.
    }
  };
})();
