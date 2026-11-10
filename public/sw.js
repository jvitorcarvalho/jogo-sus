// Service worker mínimo: o jogo funciona offline depois da primeira visita.
// Só atende GET da própria origem. Página: rede primeiro. Arquivos com hash: cache primeiro.
const CACHE = 'jogo-sus-v1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((chaves) => Promise.all(chaves.filter((c) => c !== CACHE).map((c) => caches.delete(c))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (evento) => {
  const pedido = evento.request;
  if (pedido.method !== 'GET' || new URL(pedido.url).origin !== self.location.origin) return;

  const guardar = (resposta) => {
    if (resposta.ok) {
      const copia = resposta.clone();
      caches.open(CACHE).then((c) => c.put(pedido, copia));
    }
    return resposta;
  };

  if (pedido.mode === 'navigate') {
    evento.respondWith(fetch(pedido).then(guardar).catch(() => caches.match(pedido).then((r) => r ?? caches.match('./'))));
    return;
  }
  evento.respondWith(caches.match(pedido).then((r) => r ?? fetch(pedido).then(guardar)));
});
