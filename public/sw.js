// Service worker do Prime Cred: exibe as notificações push e abre o link ao tocar.
self.addEventListener("push", (event) => {
  const dados = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(dados.titulo || "Prime Cred", {
      body: dados.corpo || "",
      icon: "/icones/icone-192.png",
      badge: "/icones/icone-192.png",
      data: { link: dados.link || "/painel" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = event.notification.data?.link || "/painel";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((janelas) => {
      for (const j of janelas) {
        if ("focus" in j) {
          j.navigate(link);
          return j.focus();
        }
      }
      return self.clients.openWindow(link);
    }),
  );
});
