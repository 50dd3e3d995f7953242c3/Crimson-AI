self.addEventListener("install", (e) => {
  self.skipWaiting();
});
self.addEventListener("fetch", (e) => {
  // Deixa as requisições passarem direto
});
