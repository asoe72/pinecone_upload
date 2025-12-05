import path from "path";
import fs from "fs";
import { fetchHRBookInfos } from './bookinfos.js';
import { colorStrRed } from './util/color_str.js';


// --------------------------------------------------------
/// @param[in]    pathnameBookshelves   e.g. '_test/bookshelves.json'
/// @return       metadatas
// --------------------------------------------------------
export async function loadMetadatasFromBookshelves(pathnameBookshelves) {

  console.log('');
  console.log('==============================================');
  console.log('[1/3] LOADING BOOKSHELVES:');

  try {
    const metadatas = [];
    
    const data = fs.readFileSync(pathnameBookshelves, 'utf-8');

    const bookshelves = JSON.parse(data);

    for(const bookshelf of bookshelves) {
      const metadatasSub = await loadMetadatasInBookshelf(bookshelf)
      metadatas.push(...metadatasSub);
    }
    return metadatas;
  }
  catch(err) {
    console.error(colorStrRed(`Failed to read or parse ${pathnameBookshelves}\n`), err.message);
    return -1;
  }
}


// --------------------------------------------------------
/// @param[in]    bookshelf
//                  - basepath    'R:/git_repo/doc'
//                  - type        'folders' or 'files'
//                  - exts        대상 확장자. e.g. ['txt', 'md', 'json']
/// @return       metadatas
// --------------------------------------------------------
export async function loadMetadatasInBookshelf(bookshelf) {

  if (bookshelf.type == 'folders') {
    return await loadMetadatasInBookshelf_Folders(bookshelf);
  }
  else if (bookshelf.type == 'files') {
    return [];    //loadMetadatasInGroup_Files(bookshelf);
  }
}


// --------------------------------------------------------
/// @param[in]    bookshelf
//                  - basepath    'R:/git_repo/doc'
//                  - type        'folders' or 'files'
//                  - excludeFiles  (optional) e.g. ["book.md", "bookinfo.json"..]
//                  - exts        대상 확장자. e.g. ['txt', 'md', 'json']
/// @return       metadatas
// --------------------------------------------------------
export async function loadMetadatasInBookshelf_Folders(bookshelf) {

  const metadatas = [];

  const bookinfos = await fetchHRBookInfos();

  let idx = 0;
  let n_ok = 0;
  let n_skip = 0;

  // bookinfos 항목 중 일부 filter-out 하고 load
  for (const bookinfo of bookinfos) {
  
    if(filterBookinfo(bookinfo) == false) {
      n_skip++;
      continue;
    }

    idx++;
		//if(idx < 99) continue;
    //if(idx > 8) break;

    //console.log(`book_id:${bookinfo.book_id}, ver_id:${bookinfo.ver_id}, shelf_ids:${JSON.stringify(bookinfo.shelf_ids)}`);

    const metadatasSub = loadMetadatasInBook(bookshelf, bookinfo);
    if(metadatasSub == null) {
      n_skip++;
      continue;
    }
    metadatas.push(...metadatasSub);
    n_ok++;
  }

  console.log('--------------------------------------------------');
  console.log(`TOTAL BOOKS = ${bookinfos.length}`)
  console.log(`N.OK = ${n_ok}, N.SKIP = ${n_skip}`)

  return metadatas;
}


// --------------------------------------------------------
function filterBookinfo(bookinfo) {

  if(bookinfo.ver_id.includes('korean') == false) return false;  // 한글버전만 포함,
  if(bookinfo.ver_id.includes('tp600')) return false;            // tp600 제외
  if(bookinfo.shelf_ids.includes('hi7-cont')) return false;      // hi7은 아직 제외,
  
  return true;
}


// --------------------------------------------------------
/// @param[in]    bookshelf
/// @return       metadatas
// --------------------------------------------------------
export function loadMetadatasInBook(bookshelf, bookinfo) {

  const _bookFolderName = bookFolderName(bookinfo);    // e.g. 'doc-add-axes-korean'

  console.log('==============================================');
  console.log(`loadMetadatasInBook(${_bookFolderName})`);

  const folderNames = [];

  const pathBook = path.join(bookshelf.basepath, _bookFolderName);
  console.log(`pathBook=${pathBook}`);

  // 책 제목 등 정보
  const bookinfoInBook = bookinfoFromBookPath(pathBook);
  if(bookinfoInBook == null) {
    return null;
  }
  Object.assign(bookinfo, bookinfoInBook); // bookinfos.json의 각 info 객체에, 개별 폴더의 bookinfo.json 객체를 합함.

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

    if(folderName.startsWith('.')) continue;    // .git/ 등은 skip
    if(bookshelf.excludeFolders.includes(folderName)) continue;
    //@@const metadata = loadMetadataInChapter(bookshelf, bookinfo, rpathChapter);
    const metadata = loadMetadataInChapter(bookshelf, bookinfo, folderName);
    copyMetadataFromBookInfo(metadata, bookinfo);   // 책 정보를 각 metadata에 첨부한다.
    printMetadata(metadata);

    // metadata.text를 분할해 여러 개의 metadata들을 만들어 넣는다.
    const metadatasSub = splitMetadata(metadata);
    metadatas.push(...metadatasSub);
  }

  finalizeMetadatas(bookinfo, metadatas);

  return metadatas;
}


// --------------------------------------------------------
/// @return       e.g. 'doc-add-axes-korean'
// --------------------------------------------------------
function bookFolderName(bookinfo) {

  return bookinfo.book_id + '-' + bookinfo.ver_id;
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
  
    // UTF-8 BOM 제거
    const dataNoBom = data.replace(/^\uFEFF/, '');

    const bookinfo = JSON.parse(dataNoBom);
    return bookinfo;
  }
  catch(err) {
    console.error(colorStrRed(`Failed to read or parse ${pathnameBookinfo}\n`), err.message);
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
  console.log(`  - metadata.text=${metadata.text.substring(0, 100)}...`);
  console.log(`  - metadata N.bookmarks=${metadata.bookmarks.length}`);
}


// --------------------------------------------------------
/// @brief    metadata.text를 chunk 크기로 나눠, 여러 metadata로 복제하여,
///           chunk 범위 내의 bookmarks만 남기고,
///           metadatas 배열에 push 후 리턴
// --------------------------------------------------------
export function splitMetadata(metadata) {
 
  if(metadata.bookmarks.length == 0) return [];

  const metadatas = [];
  const chunks = chunkText(metadata.text);
  //const len = metadata.text.length;

  let offsetSt = 0;
  let lastBookmark = {};

  // metadata.text를 chunk 크기로 나눠, 여러 metadata로 복제
  for (const chunk of chunks) {
    const metadataCopy = structuredClone(metadata);
    metadataCopy.text = chunk;    // 분할된
    metadataCopy.bookmarks = filteredBookmarks(metadataCopy.bookmarks, offsetSt, chunk.length);
    lastBookmark = updateOrApplyLastBookmark(metadataCopy.bookmarks, lastBookmark);
        
    metadatas.push(metadataCopy);
    offsetSt += chunk.length;
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
function filteredBookmarks(bookmarks, offsetSt, len) {

  const bookmarksOut = [];
  const offsetEn = offsetSt + len;

  for (const bookmark of bookmarks) {

    if(bookmark.offset < offsetSt) continue;
    if(bookmark.offset >= offsetEn) continue;

    bookmarksOut.push(bookmark);
  }

  return bookmarksOut;
}


// --------------------------------------------------------
/// @param[in,out]   bookmarks
/// @param[in]       lastBookmark  
/// @return   updatedLastBookmark
// --------------------------------------------------------
function updateOrApplyLastBookmark(bookmarks, lastBookmark) {

  let updatedLastBookmark = lastBookmark;

  if(bookmarks.length == 0) {
    bookmarks.push({...lastBookmark});    // bookmark가 하나도 없으면, 마지막 bookmark의 사본 넣어줌
  }
  else {
    const lastIdx = bookmarks.length - 1;
    updatedLastBookmark = {...bookmarks[lastIdx]};    // bookmark들이 있으면, 마지막 bookmark의 사본 보관
  }

  return updatedLastBookmark;
}


// --------------------------------------------------------
/// @param[in]   bookshelf
/// @param[in]   bookinfo
/// @param[in]   folderName     e.g. '1-Introduction'
/// @param[in]   rpathChapter      e.g. 'doc-add-axes/1-Introduction'
/// @return   metadata; 한 chapter 분량의 정보를 모은 upsert용 객체
///           text는 아직 chunk 단위 분할을 하기 전 상태
///           { text: rpathChapter 이하 모든 폴더의 .md들을 합친 text,
///             bookmarks: {
///               title: .md의 첫 행 # 레벨 제목
///               rpath: 출처의 상대경로
///             }
///           }
///           e.g.
///           { "text": "# 2. 운전\n\n운전은 로봇에게 작업 내용을...",
///             bookmarks: {
///               title: "2. 운전"
///               rpath: e.g. "2-operation/README"
///             }
///           }
// --------------------------------------------------------
export function loadMetadataInChapter(bookshelf, bookinfo, folderName) {

  const _bookFolderName = bookFolderName(bookinfo);    // e.g. 'doc-add-axes-korean'
  const rpathChapter = path.join(_bookFolderName, folderName);

  console.log('------------------------------------');
  console.log(`loadMetadataInChapter(${rpathChapter})`);

  const metadata = {};
  metadata.text = '';
  metadata.bookmarks = [];    // 폴더당 1개씩의 bookmark { offset, rpath, title }

  // chapter 본문
  loadTextAll(metadata, bookshelf, rpathChapter);
  


  //console.log(`loadMetadataInChapter(${pathChapter}):\n  ${JSON.stringify(metadata, null, 2)}\n\n`);
  return metadata;
}


// --------------------------------------------------------
function finalizeMetadatas(bookinfo, metadatas) {

  for(const metadata of metadatas) {
    finalizeBookmarks(bookinfo, metadata);
  }
}


// --------------------------------------------------------
function finalizeBookmarks(bookinfo, metadata) {

  for(const bookmark of metadata.bookmarks) {
    bookmark.source = makeSourceUrl(bookinfo, bookmark.rpath);
    delete bookmark.offset;
    delete bookmark.rpath;
  }

  // pinecone의 metadata key는 객체의 배열이 허용되지 않으므로, json 문자열로 변환
  // (Metadata value must be a string, number, boolean or list of strings)
  metadata.bookmarks = JSON.stringify(metadata.bookmarks);
}


// --------------------------------------------------------
/// @param[in]   rpath      e.g. '1-Introduction' or '3-Setup/1-robottype/robottype.md'
/// @return     e.g. `https://hrbook-hrc.web.app/#/view/doc-add-axes/korean/1-Introduction/README`
// --------------------------------------------------------
export function makeSourceUrl(bookinfo, rpath) {

  const parts = rpath.split(/[\\/]/);
  if(parts.length == 0) return '';
  const parts2 = parts.slice(1);
  const rpath2 = parts2.join('/');
  
  let subPath = `${bookinfo.book_id}/${bookinfo.ver_id}/${rpath2}`;
  if(subPath.endsWith('.md') == false) {
    subPath += '/README';
  }
  else {
     subPath = subPath.replace(/\.md$/i, '');    // 맨 끝 .md 제거
  }
  const source = `https://hrbook-hrc.web.app/#/view/` + subPath;
  return source.replace(/\\/g, "/");
}


// --------------------------------------------------------
export function readTitleOfMdFile(pathname) {

  try {
    const text = loadText(pathname);
    //console.log(`text=${text}`);
  
    // 정규식으로 제목(#) 추출
    const lines = text.split('/\r?\n/');

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
/// @param[in,out]   metadata    정보를 추가할 metadata 객체
/// @param[in]   bookshelf
/// @param[in]   rpath      e.g. 'doc-add-axes/1-Introduction'
/// @return       rpath 이하 폴더 구조의 모든 .md 파일을 합친 text
// --------------------------------------------------------
export function loadTextAll(metadata, bookshelf, rpath) {
  
  // 현재 폴더에서 파일 text load해서 누적
  loadTextAllInFolder(metadata, bookshelf, rpath);

  // 하위 폴더 재귀 탐색
  const abspath = path.join(bookshelf.basepath, rpath);
  const entries = fs.readdirSync(abspath, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (entry.name.startsWith('.')) continue;
      const rpathSub = path.join(rpath, entry.name);
      loadTextAll(metadata, bookshelf, rpathSub);   // 재귀 호출
    }
  }
}


// --------------------------------------------------------
/// @param[in,out]   metadata    정보를 추가할 metadata 객체
/// @param[in]   bookshelf
/// @param[in]   rpath     e.g. 'doc-add-axes/1-Introduction'
// --------------------------------------------------------
export function loadTextAllInFolder(metadata, bookshelf, rpath) {

  // 폴더 내의 파일 이름 모두 읽기
  const abspath = path.join(bookshelf.basepath, rpath);
  const fnames = fs.readdirSync(abspath);

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

    loadTextAddBookmarkIfFile(metadata, bookshelf.basepath, rpath, fname);
  }
}


// --------------------------------------------------------
/// @param[in,out]   metadata    정보를 추가할 metadata 객체
/// @param[in]   basepath
/// @param[in]   rpath     e.g. 'doc-add-axes/1-Introduction/'
/// @param[in]   fname     e.g. 'README'
// --------------------------------------------------------
export function loadTextAddBookmarkIfFile(metadata, basepath, rpath, fname) {

  const pathname = path.join(basepath, rpath, fname);

  // 파일인지 확인 (폴더는 제외)
  if (fs.statSync(pathname).isFile() == false) return 0;

  // bookmark 생성, 추가
  const bookmark = {};
  bookmark.offset = metadata.text.length;
  bookmark.rpath = path.join(rpath, fname);
  bookmark.title = readTitleOfMdFile(pathname); 

  const text = convToWordJoinedText(loadText(pathname));
  if(text) {
    metadata.text += (metadata.text ? ' ' : '') + text;    // 파일 사이 구분용 공백 추가
  }
  metadata.bookmarks.push(bookmark);

  return 1;
}


// --------------------------------------------------------
function convToWordJoinedText(text) {

  const words = text.split(/\s+/);
  return words.join(" ").trim();  
}


// --------------------------------------------------------
function loadText(pathname) {

  console.log(`      loadText(${pathname});`);
  const text = fs.readFileSync(pathname, "utf-8");
  const textNoBom = text.replace(/^\uFEFF/, '');  // UTF-8 BOM 제거
  return textNoBom;
}
