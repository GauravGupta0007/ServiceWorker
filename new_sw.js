const staticCacheName = "my-static-cache";

self.addEventListener("install", function (event) {
  console.log("Service worker installed");
});

// Flag to track if the service worker is already controlling the page
let pageClient = null;

self.addEventListener("activate", function (event) {
  console.log("Service worker activated");
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then(function (clients) {
      clients.forEach(function (client) {
        // Claim any existing clients that aren't being controlled by a service worker
        if (!client.isControlled()) {
          client.postMessage({ type: "SW_READY" });
        }
        // Track the first controlled client for future updates
        if (!pageClient) {
          pageClient = client;
        }
      });
    })
  );
});

function modifyURL(url) {
  if (!url.includes(".bglhs.net")) {
    return (
      url
        .replace(/\./g, "-")
        .replace("www-", "www-")
        .replace("http://", "https://") + ".bglhs.net"
    );
  }
  return url;
}

self.addEventListener("fetch", function (event) {
  console.log("Fetch event:", event);
  console.log(" url:", event.request.url);
  console.log(" modified url", modifyURL(event.request.url));
  //window.location.href = modifyURL(event.request.url);
  console.log("event.request.mode ", event.request.mode);
  if (event.request.url.endsWith("/page1.html")) {
    event.respondWith(
      Response.redirect("http://127.0.0.1:8081/page2.html", 301)
    );
  } else {
    event.respondWith(fetch(event.request));
  }
  console.log(" after url redirection");

  // Only call event.respondWith() if this is a navigation request
  // for an HTML page.
  if (event.request.mode === "navigate") {
    console.log("navigate");
  }
  event.respondWith(
    caches.match(event.request).then(function (response) {
      return response || fetch(event.request);
    })
  );
});

self.addEventListener("message", function (event) {
  if (event.data && event.data.type === "LOCATION_CHANGE") {
    const newUrl = event.data.url;
    modifyHtmlAndSendToClient(newUrl);
  }
});

function modifyHtmlAndSendToClient(url) {
  fetch("/index.html") // Fetch the base HTML file
    .then((response) => response.text())
    .then((htmlString) => {
      const modifiedHtml = `<h1>Modified for: ${url}</h1>` + htmlString;
      const contentToPost = { type: "CONTENT_UPDATE", content: modifiedHtml };
      pageClient.postMessage(contentToPost); // Send modified content to client
    })
    .catch((error) =>
      console.error("Error fetching or modifying HTML:", error)
    );
}
