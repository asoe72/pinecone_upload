import path from "path";
import fs from "fs";


// --------------------------------------------------------
/// @param[in]  pathBook      SUMMARY.md가 위치한 book 경로
/// @return     parseSummary() 참조
// --------------------------------------------------------
export function loadSummary(pathBook) {
    const pathname = path.join(pathBook, 'SUMMARY.md');
    const text = fs.readFileSync(pathname, "utf-8");
    const textNoBom = text.replace(/^\uFEFF/, '');  // UTF-8 BOM 제거
    const items = parseSummary(textNoBom);
    return items;
}


// --------------------------------------------------------
/// @return 
///   [
///     {
///       title: '2.1.1 운전 방법',
///       rpathname: '2-operation/1-manual-operation/1-how-to-op.md',
///       indent: 4
///     },
///     ...
///   ]
/// @brief    SUMMARY.md의 경로파일명
// --------------------------------------------------------
function parseSummary(summaryText) {

  const lines = summaryText.split("\n");
  const items = [];

  const regex = /^(\s*)\*\s+\[(.+?)\]\((.+?)\)/;

  for (const line of lines) {
    const match = line.match(regex);
    if (!match) continue;

    const indent = match[1].length;
    const title = match[2];
    const rpathname = match[3];

    items.push({ title, rpathname, indent });
  }

  return items;
}
