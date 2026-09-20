import './style.css';
import './game';

// Offline support: the dictionary is ~1.4MB, so caching matters on phones.
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
