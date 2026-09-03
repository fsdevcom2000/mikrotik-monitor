/**
 * @file MikroTik Monitor - Cloudflare Worker Backend
 * @description Handles router heartbeats and exposes status API.
 * @author fsdevcom2000
 * @url https://github.com/fsdevcom2000/mikrotik-monitor
 * @license MIT
 */

interface Env {
	ROUTER_STATUS: KVNamespace;
	HEARTBEAT_TOKEN: string;
}

const KV_WRITE_INTERVAL = 120_000; // 2 min
const OFFLINE_TIMEOUT = 180_000; // 3 min

interface RouterStatus {
	lastSeen: number;
}

export default {
	async fetch(
		request: Request,
		env: Env
	): Promise<Response> {

		const url = new URL(request.url);

		// =========================
		// POST /api/heartbeat
		// =========================

		if (
			request.method === "POST" &&
			url.pathname === "/api/heartbeat"
		) {
			const auth =
				request.headers.get("Authorization");

			if (
				auth !==
				`Bearer ${env.HEARTBEAT_TOKEN}`
			) {
				return new Response(
					"Unauthorized",
					{
						status: 401
					}
				);
			}

			const now = Date.now();

			const current =
				await env.ROUTER_STATUS.get(
					"mikrotik",
					"json"
				) as RouterStatus | null;

			// Update KV only once every 2 minutes.
			if (
				!current ||
				now - current.lastSeen >= KV_WRITE_INTERVAL
			) {
				const status: RouterStatus = {
					lastSeen: now
				};

				await env.ROUTER_STATUS.put(
					"mikrotik",
					JSON.stringify(status)
				);
			}

			return Response.json({
				ok: true,
				lastSeen: now
			});
		}

		// =========================
		// GET /api/status
		// =========================

		if (
			request.method === "GET" &&
			url.pathname === "/api/status"
		) {
			const data =
				await env.ROUTER_STATUS.get(
					"mikrotik",
					"json"
				) as RouterStatus | null;

			if (!data) {
				return Response.json({
					online: false,
					lastSeen: null,
					age: null
				});
			}

			const age =
				Date.now() - data.lastSeen;

			return Response.json({
				online: age < OFFLINE_TIMEOUT,
				lastSeen: data.lastSeen,
				age
			});
		}

		// Let Cloudflare Static Assets handle everything else.
		return new Response(null, {
			status: 404
		});
	}
} satisfies ExportedHandler<Env>;

