import { exec } from "child_process";
import path from "path";
import fs from "fs";


// --------------------------------------------------------
export async function cloneOrPullRepos() {
	
	const bookinfos = await fetchHRBookInfos();
	const basePath = 'R:/hrchatbot2_docs/hrbook/';
	const baseUrl = 'https://github.com/hyundai-robotics/';

	// base 디렉토리가 없으면 생성
	if (!fs.existsSync(basePath)) {
		fs.mkdirSync(basePath, { recursive: true });
	}

	let idx = 0;
	for (const info of bookinfos) {
		
		if(idx > 2) break;	// for test

		console.log('-------------------------------------');
		console.log(`IDX = ${idx}/${bookinfos.length}`);

		idx++;
		
		const targetFolderName = info.book_id + '-' + info.ver_id;	// e.g. 'doc-spot-weld-korean'
		const _path = path.join(basePath, targetFolderName);
		const url = baseUrl + info.book_id + '.git';
		const branch = info.ver_id;

		console.log(
`cloneRepo()
	- path=${_path}
	- url=${url}
	- branch=${branch}\n`);

		if (info.url) {
			console.log(': not git repo => skipped');
			continue;
		}		
		
		await cloneOrPullRepo(basePath, targetFolderName, url, branch);
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
/// @return
// 			-		-1                   skipped (has local change)
// 			-		{ stdout, stderr }   pulled or cloned
// --------------------------------------------------------
async function cloneOrPullRepo(basePath, targetFolderName, repoUrl, branch) {

	const repoPath = path.join(basePath, targetFolderName);

	// 기존 폴더 있으면 pull
	if (fs.existsSync(repoPath)) {

		// 로컬 변경 여부 확인
		const hasChange = await hasLocalChanges(repoPath);
		if(hasChange) {
			console.log(': has local change => \x1b[31mSKIP\x1b[0m');
			return -1;
		}

		console.log(': already exist => pull');
		const result = await pullRepo(repoPath);
		return result;
	}

	// 기존 폴더 있으면 clone
	else {
		const result = await cloneRepo(basePath, targetFolderName, repoUrl, branch);
		return result;
	}
}


// --------------------------------------------------------
/// @param[in]    repoPath		'R:/hrchatbot2_docs/hrbook/doc-spot-weld-korean'
/// @return				로컬 변경(unstaged or staged)이 있는지 여부
// --------------------------------------------------------
function hasLocalChanges(repoPath) {
	return new Promise((resolve, reject) => {
		exec('git status --porcelain', { cwd: repoPath }, (err, stdout, stderr) => {
			if (err) {
				return reject(err);
			}
			// stdout에 문자가 있으면 변경 있음
			resolve(stdout.trim().length > 0);
		});
	});
}


// --------------------------------------------------------
/// @param[in]    repoPath		'R:/hrchatbot2_docs/hrbook/doc-spot-weld-korean'
/// @return				Promise, { stdout, stderr }
// --------------------------------------------------------
function pullRepo(repoPath) {
	
	// pull
	return new Promise((resolve, reject) => {
		exec("git pull", { cwd: repoPath }, (error, stdout, stderr) => {
			if (error) {
					console.error("  Error:", error.message);
					reject(error);
					return;
			}
			if (stderr.trim().length > 0) {
					console.error("  git log(STDERR):", stderr);
			}
			console.log("  STDOUT:", stdout);
			resolve({ stdout, stderr });
		});
	});
}


// --------------------------------------------------------
/// @param[in]    basePath		'R:/hrchatbot2_docs/hrbook/'
/// @param[in]    targetFolderName		'doc-spot-weld-korean'
/// @param[in]    repoUrl			'https://github.com/hyundai-robotics/doc-spot-weld.git'
/// @param[in]    branch			'korean'
/// @return				Promise, { stdout, stderr }
// --------------------------------------------------------
function cloneRepo(basePath, targetFolderName, repoUrl, branch) {

	return new Promise((resolve, reject) => {

		// basePath가 있을 경우 해당 경로로 이동해서 clone 실행
		const cmd = `git -C "${basePath}" clone -b "${branch}" --single-branch "${repoUrl}" "${targetFolderName}"`;

		exec(cmd, (err, stdout, stderr) => {
			if (err) {
				reject(stderr || err.message);
				return;
			}
			resolve({ stdout, stderr });
		});
	});
}
