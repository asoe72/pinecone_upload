
// --------------------------------------------------------
/// @return		HRBOOK의 bookinfos.json의 json data
// --------------------------------------------------------
export async function fetchHRBookInfos() {

	const url = 'https://hrcontentsrelay-bmgae5hdbzapc4bc.koreacentral-01.azurewebsites.net/api/proxy?path=hrbookinfos/refs/heads/master/bookinfos.json';

	try {
		const res = await fetch(url, {
			method: "GET",
			headers: { "Accept": "application/json" }
		});

		if (!res.ok) {
			throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
		}

		const data = await res.json();
		return data;
	}
	catch (e) {
		console.error("Error fetching book infos:", e);
		throw e;
	}
}
