if (!import.meta.env.DEV && 'serviceWorker' in navigator) {
  const base = import.meta.env.BASE_URL;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${base}sw.js`, { scope: base, updateViaCache: 'none' })
      .catch(error => console.warn('Offline support could not be enabled.', error));
  }, { once: true });
}
