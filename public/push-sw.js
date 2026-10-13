// The worker that receives Kancara's push notifications. It is separate from the offline worker (sw.js) and has
// a scope of its own, so it can run where that one is not kept, and neither touches the other's requests.

const ICON = "/icons/icon-192.png";
const FALLBACK_URL = "/trips";

// A waiting worker takes over at once: there is nothing here an open page depends on.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data.json().data || {};
  } catch {
    // A push with nothing readable in it is still shown, since the browser requires every push to be.
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Kancara", {
      body: data.body || "",
      icon: ICON,
      badge: ICON,
      // One search is one notification: news about it replaces what was there and sounds again.
      tag: data.tag || undefined,
      renotify: Boolean(data.tag),
      data: { url: data.url || FALLBACK_URL },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || FALLBACK_URL, self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((open) => {
      // A Kancara tab that is already open is brought forward and sent to the page; otherwise a new one opens.
      const tab = open.find((client) => new URL(client.url).origin === self.location.origin);
      if (tab && "navigate" in tab) return tab.focus().then(() => tab.navigate(url));
      return self.clients.openWindow(url);
    }),
  );
});
