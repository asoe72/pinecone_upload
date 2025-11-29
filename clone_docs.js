import { exec } from "child_process";
import { fetchHRBookInfos } from './bookinfos.js';
import { startDotProgress } from './util/progress_bar.js';
import { colorStrGreen, colorStrYellow, colorStrCyan } from './util/color_str.js';
import path from "path";
import fs from "fs";


// --------------------------------------------------------
/// @param[in]    basePath		'R:/hrchatbot2_docs/hrbook/'
/// @return		처리한 repo 개수
// --------------------------------------------------------
export async function cloneOrPullRepos(basePath) {
	
	const baseUrl = 'https://github.com/hyundai-robotics/';
	const bookinfos = await fetchHRBookInfos();

	// base 디렉토리가 없으면 생성
	if (!fs.existsSync(basePath)) {
		fs.mkdirSync(basePath, { recursive: true });
	}

	let idx = 0;
	const idxMax = bookinfos.length;

	for (const info of bookinfos) {
		
		// test range
		idx++;
		if(idx < 99) continue;
		//if(idx > 60) break;
		
		const targetFolderName = info.book_id + '-' + info.ver_id;	// e.g. 'doc-spot-weld-korean'
		
		const url = baseUrl + info.book_id + '.git';
		const branch = info.ver_id;

		printCloneOrPullRepo(idx, idxMax, basePath, targetFolderName, url, branch);

		if (info.url) {
			console.log(': not git repo => ' + colorStrYellow('SKIP'));
			continue;
		}		
		
		await cloneOrPullRepo(basePath, targetFolderName, url, branch);
	}

	return idxMax;
}


// --------------------------------------------------------
function printCloneOrPullRepo(idx, idxMax, basePath, targetFolderName, url, branch) {

	const repoPath = path.join(basePath, targetFolderName);

	console.log('---------------------------------------');
	console.log(`[IDX ${idx}/${idxMax}] cloneOrPullRepo:`);

	console.log(
`	- repoPath=${repoPath}
	- url=${url}
	- branch=${branch}\n`);
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
			console.log(': has local change => ' + colorStrYellow('SKIP'));
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
					console.error("  git progress:", stderr);
			}
			console.log("  git result:", colorStrCyan(stdout));
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

		process.stdout.write("  cloning : ");
		const stopDotProgress = startDotProgress();

		exec(cmd, (err, stdout, stderr) => {
			
			stopDotProgress();
			if (err) {
				reject(stderr || err.message);
				return;
			}
			const msg = stdout ? colorStrCyan(stdout) : colorStrGreen('DONE');
			console.log("  git result:",  msg);
			resolve({ stdout, stderr });
		});
	});
}
