import path from "path";
import fs from "fs";


// --------------------------------------------------------
function loadText(pathname) {
  console.log(`loadTest(${pathname});`);
  return fs.readFileSync(pathname, "utf-8");
}


// --------------------------------------------------------
export function loadTextAll(lpath) {

  // 폴더 내의 파일 이름 모두 읽기
  const fnames = fs.readdirSync(lpath);
  
  let combinedText = '';

  for (const fname of fnames) {
    const ext = fname.substring(fname.lastIndexOf('.') + 1);
    if (ext != 'txt') continue;

    const pathname = path.join(lpath, fname);

    // 파일인지 확인 (하위 폴더는 제외)
    if (fs.statSync(pathname).isFile()) {
      const content = loadText(pathname);
      combinedText += content + "\n"; // 파일 사이 구분용 줄바꿈 추가
    }
  }

  return combinedText;
}
