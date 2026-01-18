import { exec } from "child_process";
import { fetchHRBookInfos } from './hrbookinfos.js';
import { startDotProgress } from '../../util/progress_bar.js';
import { colorStrGreen, colorStrYellow, colorStrCyan } from '../../util/color_str.js';
import path from "path";
import fs from "fs";


// --------------------------------------------------------
/// @param[in]    basePath		'R:/hrchatbot2_docs/hrbook/'
/// @return		처리한 repo 개수
// --------------------------------------------------------
export async function hrbook_cloneOrPullRepos(basePath) {
	
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
		//if(idx < 50) continue;
		//if(idx > 60) break;
			
		const targetFolderName = info.book_id;	// e.g. 'doc-spot-weld'
		
		const url = baseUrl + info.book_id + '.git';
		const branch = info.ver_id;
		const title = info.title;

		printCloneOrPullRepo(idx, idxMax, basePath, targetFolderName, url, branch, title);
	
		if(filterBookinfo(info) == false) continue;
				
		await cloneOrPullRepo(basePath, targetFolderName, url, branch);
	}

	return idxMax;
}


// --------------------------------------------------------
function filterBookinfo(bookinfo) {
  
  // PDF 등은 skip
	if (bookinfo.url) {
		console.log(': not git repo => ' + colorStrYellow('SKIP'));
		return false;
	}
	// 한글버전만 포함,
	if(bookinfo.ver_id.includes('ko') == false) {
		console.log(': not Korean language => ' + colorStrYellow('SKIP'));
		return false;
	}
	if(bookinfo.ver_id.includes('tp600')) {
		console.log(': TP600 => ' + colorStrYellow('SKIP'));
		return false;            // tp600 제외
	}
    
  return true;
}


// --------------------------------------------------------
function printCloneOrPullRepo(idx, idxMax, basePath, targetFolderName, url, branch, title) {

	const repoPath = path.join(basePath, targetFolderName);

	console.log('---------------------------------------');
	console.log(`[IDX ${idx}/${idxMax}] cloneOrPullRepo:`);

	console.log(
`	- repoPath=${repoPath}
	- url=${url}
	- branch=${branch}
	- title=${title}`);
}


// --------------------------------------------------------
/// @param[in]    basePath		'R:/hrchatbot2_docs/hrbook/'
/// @param[in]    targetFolderName		'doc-spot-weld'
/// @param[in]    repoUrl			'https://github.com/hyundai-robotics/doc-spot-weld.git'
/// @param[in]    branch			'ko'
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
		try {
			const result = await cloneRepo(basePath, targetFolderName, repoUrl, branch);
			return result;
		} catch(err) {
			return err;
		}
	}
}


// --------------------------------------------------------
/// @param[in]    repoPath		'R:/hrchatbot2_docs/hrbook/doc-spot-weld'
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
/// @param[in]    repoPath		'R:/hrchatbot2_docs/hrbook/doc-spot-weld'
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
/// @param[in]    targetFolderName		'doc-spot-weld'
/// @param[in]    repoUrl			'https://github.com/hyundai-robotics/doc-spot-weld.git'
/// @param[in]    branch			'ko'
/// @return				Promise, { stdout, stderr }
// --------------------------------------------------------
function cloneRepo(basePath, targetFolderName, repoUrl, branch) {

	return new Promise((resolve, reject) => {

		// basePath가 있을 경우 해당 경로로 이동해서 clone 실행
		//const cmd = `git -C "${basePath}" clone -b "${branch}" --single-branch "${repoUrl}" "${targetFolderName}"`;
		const cmd = `git -C "${basePath}" clone -b "${branch}" "${repoUrl}" "${targetFolderName}"`;

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
