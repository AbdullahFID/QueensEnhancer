// residence/index.js (optional - can be deleted entirely)
(() => {
  if (window.__qhxIndexLoaded) return;
  window.__qhxIndexLoaded = true;
  
  // Just a coordinator if needed for shared state
  window.Residence = window.Residence || {
    loaded: {
      home: false,
      editProfile: false,
      poa: false
    }
  };
})();