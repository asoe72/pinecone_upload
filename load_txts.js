import path from "path";
import fs from "fs";


// --------------------------------------------------------
/// @param[in]    pathnameBookshelves   e.g. '_test/bookshelves.json'
/// @return       metadatas
// --------------------------------------------------------
export function loadMetadatasFromBookshelves(pathnameBookshelves) {

  console.log('');
  console.log('==============================================');
  console.log('[1/3] LOADING BOOKSHELVES:');

  try {
    const metadatas = [];
    
    const data = fs.readFileSync(pathnameBookshelves, 'utf-8');

    const bookshelves = JSON.parse(data);

    for(const bookshelf of bookshelves) {
      const metadatasSub = loadMetadatasInBookshelf(bookshelf)
      metadatas.push(...metadatasSub);
    }
    return metadatas;
  }
  catch(err) {
    console.error(`Failed to read or parse ${pathnameBookshelves}`, err.message);
    return -1;
  }
}


// --------------------------------------------------------
/// @param[in]    bookshelf
//                  - basepath    'R:/git_repo/doc'
//                  - prefix      (optional) e.g. 'doc-'
//                  - type        'folders' or 'files'
//                  - exts        대상 확장자. e.g. ['txt', 'md', 'json']
/// @return       metadatas
// --------------------------------------------------------
export function loadMetadatasInBookshelf(bookshelf) {

  if (bookshelf.type == 'folders') {
    return loadMetadatasInBookshelf_Folders(bookshelf);
  }
  else if (bookshelf.type == 'files') {
    return [];    //loadMetadatasInGroup_Files(bookshelf);
  }
}


// --------------------------------------------------------
/// @param[in]    bookshelf
//                  - basepath    'R:/git_repo/doc'
//                  - prefix      (optional) e.g. 'doc-'
//                  - type        'folders' or 'files'
//                  - exts        대상 확장자. e.g. ['txt', 'md', 'json']
/// @return       metadatas
// --------------------------------------------------------
export function loadMetadatasInBookshelf_Folders(bookshelf) {

  const metadatas = [];

  // 하위 폴더 탐색; book 들이 모인 최상위 경로 (e.g. "R:/git_repo/doc")
  const entries = fs.readdirSync(bookshelf.basepath, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory() == false) continue;

    const folderName = entry.name;    // e.g. 'doc-add-axes'

    // 폴더명 접두어 필터링
    if(bookshelf.prefix) {
      if (folderName.startsWith(bookshelf.prefix)==false) continue;
    }
    
    const metadatasSub = loadMetadatasInBook(bookshelf, folderName);
    metadatas.push(...metadatasSub);
  }

  return metadatas;
}


// --------------------------------------------------------
/// @param[in]    bookshelf
/// @param[in]    lpathBook       e.g. 'doc-add-axes'
/// @return       metadatas
// --------------------------------------------------------
export function loadMetadatasInBook(bookshelf, lpathBook) {

  console.log('==============================================');
  console.log(`loadMetadatasInBook(${lpathBook})`);

  const folderNames = [];

  const pathBook = path.join(bookshelf.basepath, lpathBook);
  console.log(`pathBook=${pathBook}`);

  // 책 제목 등 정보
  const bookinfo = bookinfoFromBookPath(pathBook);

  // 하위 chapter 폴더들 탐색하여 folderNames[]에 수집
  const entries = fs.readdirSync(pathBook, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const chapterFolderName = entry.name;
      if (chapterFolderName.startsWith('.') || chapterFolderName == '_assets') continue;  // .git, 그림폴더 등 제외
      folderNames.push(chapterFolderName);
    }
  }

  // book 폴더 내의 모든 chapter 폴더들에 대해, metadata들 생성하여 metadatas[]에 넣는다.
  const metadatas = [];
  for (const folderName of folderNames) {
    const lpathChapter = path.join(lpathBook, folderName);
    const metadata = loadMetadataInChapter(bookshelf, lpathChapter);
    copyMetadataFromBookInfo(metadata, bookinfo);   // 책 정보를 각 metadata에 첨부한다.
    printMetadata(metadata);

    // metadata.text를 분할해 여러 개의 metadata들을 만들어 넣는다.
    const metadatasSub = splitMetadata(metadata);
    metadatas.push(...metadatasSub);
  }

  return metadatas;
}


// --------------------------------------------------------
/// @param[in]    bookpath    'R:\git_repo\doc\doc-spot-weld'
/// @return       bookinfo    { "langCode": "ko", series: "현대로봇 Hi6 제어기", title: "기능설명서 - 스폿 용접", .. }
// --------------------------------------------------------
function bookinfoFromBookPath(bookpath) {

  const pathnameBookinfo = path.join(bookpath, 'bookinfo.json');
  //console.log(`pathnameBookinfo=${pathnameBookinfo}`);

  try {
    const data = fs.readFileSync(pathnameBookinfo, 'utf-8');
    //console.log(`data=${data}`);
  
    const bookinfo = JSON.parse(data);
    return bookinfo;
  }
  catch(err) {
    console.error(`Failed to read or parse ${pathnameBookinfo}`, err.message);
    return null;
  }
}


// --------------------------------------------------------
export function copyMetadataFromBookInfo(metadata, bookinfo)
{
  if(!bookinfo) return;
  metadata.langCode = bookinfo.langCode;
  metadata.bookSeries = bookinfo.series;
  metadata.bookTitle = bookinfo.title;
}


// --------------------------------------------------------
export function printMetadata(metadata)
{  
  console.log(`  - metadata.bookSeries=${metadata.bookSeries}`);
  console.log(`  - metadata.bookTitle=${metadata.bookTitle}`);
  console.log(`  - metadata.chapterTitle=${metadata.chapterTitle}`);
  console.log(`  - metadata.source=${metadata.source}`);
  console.log(`  - metadata.text=${metadata.text.substring(0, 100)}...`);
}


// --------------------------------------------------------
/// @brief    metadata.text를 chunk 크기로 나눠, 여러 metadata로 복제하여,
///           metadatas 배열에 push 후 리턴
// --------------------------------------------------------
export function splitMetadata(metadata) {
 
  const metadatas = [];
  const chunks = chunkText(metadata.text);

  // metadata.text를 chunk 크기로 나눠, 여러 metadata로 복제
  for (const chunk of chunks) {
    const metadataCopy = {...metadata};
    metadataCopy.text = chunk;    // 분할된
    metadatas.push(metadataCopy);
  }

  return metadatas;
}


// --------------------------------------------------------
function chunkText(text, chunkSize = 500, overlap = 50) {
  console.log(`      chunkText();`);
  const words = text.split(/\s+/);
  const chunks = [];
  for (let i = 0; i < words.length; i += chunkSize - overlap) {
    chunks.push(words.slice(i, i + chunkSize).join(" "));
  }
  console.log(`        done ; chunks.length = ${chunks.length}`);
  return chunks;
}


// --------------------------------------------------------
/// @param[in]   bookshelf
/// @param[in]   lpathChapter      e.g. 'doc-add-axes/1-Introduction'
/// @return   metadata; 한 chapter 분량의 정보를 모은 upsert용 객체
///           text는 아직 chunk 단위 분할을 하기 전 상태
///           { "text": lpathChapter 이하 모든 폴더의 .md들을 합친 text,
///             "title": lpathChapter의 README.md의 # 레벨 제목
///             "source": 출처
///           }
///           e.g.
///           { "text": "# 2. 운전\n\n운전은 로봇에게 작업 내용을...",
///             "title": "2. 운전"
///             "source": e.g. "https://hrbook-hrc.web.app/#/view/doc-hi6-operation/korean-tp630/2-operation/README"
///           }
// --------------------------------------------------------
export function loadMetadataInChapter(bookshelf, lpathChapter) {

  console.log('------------------------------------');
  console.log(`loadMetadataInChapter(${lpathChapter})`);

  const metadata = {};

  // chapter 본문
  metadata.text = loadTextAll(bookshelf, lpathChapter);
  
  // chapter 출처
  metadata.source = makeSourceUrl(lpathChapter);

  // chapter 제목
  const abspathChapter = path.join(bookshelf.basepath, lpathChapter);
  metadata.chapterTitle = readTitleOfReadme(abspathChapter);

  //console.log(`loadMetadataInChapter(${pathChapter}):\n  ${JSON.stringify(metadata, null, 2)}\n\n`);
  return metadata;
}


// --------------------------------------------------------
export function makeSourceUrl(lpathChapter) {
  const lpath = lpathChapter.replaceAll('\\', '/');
  const parts = lpath.split('/');
  if (parts.length < 1) return '';
  const branchName = 'korean';
  parts.splice(1, 0, branchName);
  parts.push('README');
  const subPath = parts.join('/');
  const source = 'https://hrbook-hrc.web.app/#/view/' + subPath;
  return source;
}


// --------------------------------------------------------
export function readTitleOfReadme(abspathChapter) {

  const pathnameReadme = path.join(abspathChapter, 'README.md');
  //console.log(`pathnameReadme=${pathnameReadme}`);

  try {
    const textReadme = fs.readFileSync(pathnameReadme, 'utf-8');
    //console.log(`textReadme=${textReadme}`);
  
    // 정규식으로 제목(#) 추출
    const lines = textReadme.split('/\r?\n/');

    for (const line of lines) {
      const match = line.match(/#\s*(.*)/);
      if (match) {
        return match[1].trim();
      }
    }
  }
  catch(err) {
  }
  console.log(`no title`);
  
  return '';
}


// --------------------------------------------------------
/// @param[in]   bookshelf
/// @param[in]   lpath      e.g. 'doc-add-axes/1-Introduction'
/// @return       lpath 이하 폴더 구조의 모든 .md 파일을 합친 text
// --------------------------------------------------------
export function loadTextAll(bookshelf, lpath) {
  
  // 현재 폴더에서 파일 처리
  let combinedText = loadTextAllInFolder(bookshelf, lpath);

  // 하위 폴더 재귀 탐색
  const abspath = path.join(bookshelf.basepath, lpath);
  const entries = fs.readdirSync(abspath, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (entry.name.startsWith('.')) continue;
      const lpathSub = path.join(lpath, entry.name);
      const text = loadTextAll(bookshelf, lpathSub);   // 재귀 호출
      combinedText += (text ? '\n' : '') + text;
    }
  }

  return combinedText;
}


// --------------------------------------------------------
/// @param[in]   lpath     e.g. 'doc-add-axes/1-Introduction'
/// @return      lpath 폴더의 모든 .md 파일을 합친 text
// --------------------------------------------------------
export function loadTextAllInFolder(bookshelf, lpath) {

  // 폴더 내의 파일 이름 모두 읽기
  const abspath = path.join(bookshelf.basepath, lpath);
  const fnames = fs.readdirSync(abspath);

  let combinedText = '';

  for (const fname of fnames) {

    const fnameLo = fname.toLowerCase();

    // 파일명 필터링
    if (bookshelf.excludeFiles) {
      if (bookshelf.excludeFiles.includes(fnameLo)) continue;
    }

    // 확장자 필터링
    if (bookshelf.exts) {
      const ext = fnameLo.substring(fnameLo.lastIndexOf('.') + 1);
      if (bookshelf.exts.includes(ext) == false) continue;
    }

    const pathname = path.join(bookshelf.basepath, lpath, fname);

    // 파일인지 확인 (하위 폴더는 제외)
    if (fs.statSync(pathname).isFile()) {
      const text = loadText(pathname);
      combinedText += (text ? '\n' : '') + text;    // 파일 사이 구분용 줄바꿈 추가
    }
  }

  return combinedText.trim();
}


// --------------------------------------------------------
function loadText(pathname) {
  console.log(`      loadText(${pathname});`);
  return fs.readFileSync(pathname, "utf-8");
}
