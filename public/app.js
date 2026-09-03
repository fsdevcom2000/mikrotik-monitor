/**
 * @file MikroTik Monitor - Frontend Application
 * @description Periodic status checker and PWA interface.
 * @author fsdevcom2000
 * @url https://github.com/fsdevcom2000/mikrotik-monitor
 * @license MIT
 */
const UPDATE_INTERVAL = 5000;
const COUNTER_INTERVAL = 1000;

let lastSeen = null;
let currentOnline = false;
let lastStatusCheck = null;


const statusElement =
	document.getElementById("status");

const statusIcon =
	document.getElementById("statusIcon");

const statusTitle =
	document.getElementById("statusTitle");

const statusSubtitle =
	document.getElementById("statusSubtitle");

const lastSeenElement =
	document.getElementById("lastSeen");

const ageElement =
	document.getElementById("age");

const checkedElement =
	document.getElementById("checked");


function formatTime(timestamp) {

	if (!timestamp) {
		return "—";
	}

	return new Date(timestamp).toLocaleString(
		"en-US",
		{
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit"
		}
	);
}


function formatAge(age) {

	if (
		age === null ||
		age === undefined
	) {
		return "—";
	}

	const seconds =
		Math.max(
			0,
			Math.floor(age / 1000)
		);


	if (seconds < 60) {
		return `${seconds} sec.`;
	}


	const minutes =
		Math.floor(seconds / 60);

	const remainingSeconds =
		seconds % 60;


	if (minutes < 60) {

		return (
			`${minutes} min. ` +
			`${remainingSeconds} sec.`
		);
	}


	const hours =
		Math.floor(minutes / 60);

	const remainingMinutes =
		minutes % 60;


	return (
		`${hours} h. ` +
		`${remainingMinutes} min.`
	);
}


function renderStatus() {

	if (!lastSeen) {

		statusElement.className =
			"card status offline";

		statusIcon.textContent = "✕";

		statusTitle.textContent =
			"OFFLINE";

		statusSubtitle.textContent =
			"No heartbeat from router";

		ageElement.textContent = "—";

		return;
	}


	const age =
		Date.now() - lastSeen;


	const online =
		age < 90000;


	currentOnline = online;


	if (online) {

		statusElement.className =
			"card status online";

		statusIcon.textContent = "✓";

		statusTitle.textContent =
			"ONLINE";

		statusSubtitle.textContent =
			"Router is connected";

	} else {

		statusElement.className =
			"card status offline";

		statusIcon.textContent = "✕";

		statusTitle.textContent =
			"OFFLINE";

		statusSubtitle.textContent =
			"No heartbeat from router";
	}


	lastSeenElement.textContent =
		formatTime(lastSeen);

	ageElement.textContent =
		formatAge(age);
}


async function updateStatus() {

	try {

		const response =
			await fetch(
				"/api/status",
				{
					cache: "no-store"
				}
			);


		if (!response.ok) {

			throw new Error(
				`HTTP ${response.status}`
			);
		}


		const data =
			await response.json();


		lastSeen =
			data.lastSeen;


		currentOnline =
			data.online;


		lastStatusCheck =
			Date.now();


		checkedElement.textContent =
			formatTime(lastStatusCheck);


		renderStatus();


	} catch (error) {

		console.error(
			"MikroTik Monitor:",
			error
		);

		statusElement.className =
			"card status error";

		statusIcon.textContent =
			"⚠";

		statusTitle.textContent =
			"ERROR";

		statusSubtitle.textContent =
			"Failed to get status";
	}
}


// Initial update
updateStatus();


// Server synchronization
setInterval(
	updateStatus,
	UPDATE_INTERVAL
);


// Local live counter
setInterval(
	renderStatus,
	COUNTER_INTERVAL
);

if ("serviceWorker" in navigator) {

	window.addEventListener(
		"load",
		() => {

			navigator.serviceWorker
				.register("/sw.js")
				.catch(error => {

					console.error(
						"Service Worker:",
						error
					);
				});
		}
	);
}
