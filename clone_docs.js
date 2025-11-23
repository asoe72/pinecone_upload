import { exec } from "child_process";
import path from "path";
import fs from "fs";


// --------------------------------------------------------
export async function cloneRepos() {
	
	const bookinfos = await fetchHRBookInfos();
	const basePath = 'R:/hrchatbot2_docs/hrbook/';
	const baseUrl = 'https://github.com/hyundai-robotics/';

	let idx = 0;
	for (const info of bookinfos) {
		
		console.log('-------------------------------------');
		console.log(`IDX = ${idx}/${bookinfos.length}`);

		idx++;
		const targetFolderName = info.book_id + '-' + info.ver_id;	// e.g. 'doc-spot-weld-korean'
		const url = baseUrl + info.book_id + '.git';
		const branch = info.ver_id;

		console.log(`cloneRepo()
		- url=${url}
		- branch=${branch}\n`);

		if (info.url) {
			console.log(': not git repo => skipped');
			continue;
		}		
		
		await cloneRepo(basePath, targetFolderName, url, branch);
	}
}


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


// --------------------------------------------------------
/// @param[in]    basePath		'R:/hrchatbot2_docs/hrbook/'
/// @param[in]    targetFolderName		'doc-spot-weld-korean'
/// @param[in]    repoUrl			'https://github.com/hyundai-robotics/doc-spot-weld.git'
/// @param[in]    branch			'korean'
// --------------------------------------------------------
function cloneRepo(basePath, targetFolderName, repoUrl, branch) {

		// 기존 폴더 있으면 skip
		const _path = path.join(basePath, targetFolderName);
    if (fs.existsSync(_path)) {
			console.log(': already exist => skipped');
      return;
    }

	return new Promise((resolve, reject) => {

		// 디렉토리가 없으면 생성
		if (!fs.existsSync(basePath)) {
			fs.mkdirSync(basePath, { recursive: true });
		}

		// basePath가 있을 경우 해당 경로로 이동해서 clone 실행
		const cmd = `git -C "${basePath}" clone -b "${branch}" --single-branch "${repoUrl}" "${targetFolderName}"`;

		exec(cmd, (err, stdout, stderr) => {
			if (err) {
				reject(stderr || err.message);
				return;
			}
			resolve(stdout);
		});
	});
}
