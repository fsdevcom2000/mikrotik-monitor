/**
 * @file Service Worker for MikroTik Monitor PWA
 * @description Handles offline caching and resource management.
 * @author fsdevcom2000
 * @url https://github.com/fsdevcom2000/mikrotik-monitor
 */

const CACHE_NAME = "mikrotik-monitor-v1";

const STATIC_ASSETS = [
	"/",
	"/index.html",
	"/style.css",
	"/app.js",
	"/manifest.webmanifest"
];


self.addEventListener(
	"install",
	event => {

		event.waitUntil(

			caches
				.open(CACHE_NAME)
				.then(
					cache =>
						cache.addAll(
							STATIC_ASSETS
						)
				)
		);

		self.skipWaiting();
	}
);


self.addEventListener(
	"activate",
	event => {

		event.waitUntil(

			caches
				.keys()
				.then(
					keys =>
						Promise.all(

							keys
								.filter(
									key =>
										key !==
										CACHE_NAME
								)
								.map(
									key =>
										caches.delete(key)
								)
						)
				)
		);

		self.clients.claim();
	}
);


self.addEventListener(
	"fetch",
	event => {

		const url =
			new URL(event.request.url);


		// API always from server.
		if (
			url.pathname.startsWith("/api/")
		) {

			event.respondWith(
				fetch(event.request)
			);

			return;
		}


		// Static files:
		// network first, then cache.
		event.respondWith(

			fetch(event.request)
				.then(response => {

					const copy =
						response.clone();

					caches
						.open(CACHE_NAME)
						.then(
							cache =>
								cache.put(
									event.request,
									copy
								)
						);

					return response;
				})
				.catch(
					() =>
						caches.match(
							event.request
						)
				)
		);
	}
);