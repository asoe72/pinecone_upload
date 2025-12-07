import path from "path";
import fs from "fs";
import { encoding_for_model } from "@dqbd/tiktoken";
import { fetchHRBookInfos } from './bookinfos.js';
import { loadSummary } from './summary.js';
import { colorStrRed } from './util/color_str.js';


const enc = encoding_for_model("gpt-4o-mini");

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

  const pathBook = path.join(bookshelf.basepath, _bookFolderName);
  console.log(`pathBook=${pathBook}`);

  // 책 제목 등 정보
  const bookinfoInBook = bookinfoFromBookPath(pathBook);
  if(bookinfoInBook == null) {
    return null;
  } 
  Object.assign(bookinfo, bookinfoInBook); // bookinfos.json의 각 info 객체에, 개별 폴더의 bookinfo.json 객체를 합함.

  // book 폴더 내의 모든 summary 항목들에 대해, metadata들 생성하여 metadatas[]에 넣는다.
  const metadatas = [];

  // { title, path, index }
  const items = loadSummary(pathBook);
  for (const item of items) {
    const metadata = loadMetadataInSummaryItem(bookshelf, bookinfo, item);
    copyMetadataFromBookInfo(metadata, bookinfo);   // 책 정보를 각 metadata에 첨부한다.
    printMetadata(metadata);

    splitMetadataAndPush(metadatas, metadata);
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
  console.log(`  - metadata title=${metadata.title}`);
  console.log(`  - metadata.text=${metadata.text.substring(0, 100)}...`);
}


// --------------------------------------------------------
/// @brief    metadata.text를 chunk 크기로 나눠, 여러 metadata로 복제하여,
///           metadatas 배열에 push
// --------------------------------------------------------
export function splitMetadataAndPush(metadatas, metadata) {
 
  const chunks = splitByTokens(metadata.text);

  if(chunks.length == 1) {
    metadatas.push(metadata);
    return;
  }
  
  // metadata.text를 chunk 크기로 나눠, 여러 metadata로 복제
  for (const chunk of chunks) {
    const metadataCopy = structuredClone(metadata);
    metadataCopy.text = chunk;    // 분할된
    metadatas.push(metadataCopy);
  }
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
/// @return   metadata; 한 section 분량의 정보를 모은 upsert용 객체
///           text는 아직 chunk 단위 분할을 하기 전 상태
///           { title: ...
///             text: item.rpathname 파일의 text,
///           }
///           e.g.
///           { title: "2. 운전"
///             text: "# 2. 운전\n\n운전은 로봇에게 작업 내용을...",
///           }
// --------------------------------------------------------
export function loadMetadataInSummaryItem(bookshelf, bookinfo, item) {

  const _bookFolderName = bookFolderName(bookinfo);    // e.g. 'doc-add-axes-korean'
  const rpathname = path.join(_bookFolderName, item.rpathname);

  console.log('------------------------------------');
  console.log(`loadMetadataInSummaryItem() : ${rpathname})`);

  const metadata = {};
  metadata.title = item.title;
  metadata.rpathname = item.rpathname;

  const pathname = path.join(bookshelf.basepath, rpathname);
  
  metadata.text = convToWordJoinedText(loadText(pathname));

  return metadata;
}


// --------------------------------------------------------
function finalizeMetadatas(bookinfo, metadatas) {

  for(const metadata of metadatas) {
    metadata.source = makeSourceUrl(bookinfo, metadata.rpathname);
    delete metadata.rpathname;
  }
}


// --------------------------------------------------------
/// @param[in]   rpath      e.g. '3-Setup/1-robottype/robottype.md'
/// @return     e.g. `https://hrbook-hrc.web.app/#/view/doc-add-axes/korean/3-Setup/1-robottype/robottype`
// --------------------------------------------------------
export function makeSourceUrl(bookinfo, rpathname) {

  const parts = rpathname.split(/[\\/]/);
  if(parts.length == 0) return '';

  let rpath = parts.join('/');
  rpath = rpath.replace(/\.md$/i, '');    // 맨 끝 .md 제거

  const subPath = `${bookinfo.book_id}/${bookinfo.ver_id}/${rpath}`;
  
  const source = `https://hrbook-hrc.web.app/#/view/` + subPath;
  return source;
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
function convToWordJoinedText(text) {

  const words = text.split(/\s+/);
  return words.join(" ").trim();  
}


// --------------------------------------------------------
function loadText(pathname) {

  console.log(`      loadTextFile(${pathname});`);
  try {
    const text = fs.readFileSync(pathname, "utf-8");
    const textNoBom = text.replace(/^\uFEFF/, '');  // UTF-8 BOM 제거
    return textNoBom;
  } catch(err) {
    console.error(colorStrRed(`Failed to read file ${pathname}\n`), err.message);
    return '';
  }
}


// --------------------------------------------------------
function splitByTokens(text, maxTokens = 4096, overlap = 400) {

  const tokens = enc.encode(text);
  const chunks = [];

  let start = 0;
  while (start < tokens.length) {
    const end = Math.min(start + maxTokens, tokens.length);
    const chunkTokens = tokens.slice(start, end);
    
    const decoder = new TextDecoder("utf-8");
    const chunkText = decoder.decode(enc.decode(chunkTokens));

    chunks.push(chunkText);
    start += (maxTokens - overlap);
  }

  return chunks;
}
