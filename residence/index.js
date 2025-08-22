// residence/index.js
(() => {
  if (window.__qhxIndexLoaded) return;
  window.__qhxIndexLoaded = true;

  window.Residence = window.Residence || {};
  window.Residence.bootstrap = async () => {
    if (location.hostname !== 'studentweb.housing.queensu.ca') return;

    // If home.js already ran (it sets this flag), don't import again.
    if (window.__qhxInitialized) return;

    try {
      await import(chrome.runtime.getURL('residence/home.js'));
    } catch (_) {
      // Ignore — likely not web_accessible if home.js is manifest-injected.
    }
  };
})();
