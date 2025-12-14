import path from "path";
import fs from "fs";
import { fetchHRBookInfos } from './hrbookinfos.js';
import { loadSummary } from './hrbook_summary.js';
import { convToWordJoinedText, loadText, splitByTokens } from '../load_txts.js';
import { colorStrRed } from '../../util/color_str.js';


// --------------------------------------------------------
/// @param[in]    basepath    'R:/git_repo/doc'
/// @return       metadatas
// --------------------------------------------------------
export async function loadMetadatas_HRBook(basepath) {

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

    const metadatasSub = loadMetadatasInBook(basepath, bookinfo);
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
/// @param[in]    basepath
/// @return       metadatas
// --------------------------------------------------------
function loadMetadatasInBook(basepath, bookinfo) {

  const _bookFolderName = bookFolderName(bookinfo);    // e.g. 'doc-add-axes-korean'

  console.log('==============================================');
  console.log(`loadMetadatasInBook(${_bookFolderName})`);

  const pathBook = path.join(basepath, _bookFolderName);
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
  let shortMetaData = null;
  for (const item of items) {
    const metadata = loadMetadataInSummaryItem(basepath, bookinfo, item);
    copyMetadataFromBookInfo(metadata, bookinfo);   // 책 정보를 각 metadata에 첨부한다.
    printMetadata(metadata);

    shortMetaData = mergeShortMetadata(shortMetaData, metadata);
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
function copyMetadataFromBookInfo(metadata, bookinfo)
{
  if(!bookinfo) return;
  metadata.langCode = bookinfo.langCode;
  metadata.bookSeries = bookinfo.series;
  metadata.bookTitle = bookinfo.title;
}


// --------------------------------------------------------
function printMetadata(metadata)
{  
  console.log(`  - metadata.bookSeries=${metadata.bookSeries}`);
  console.log(`  - metadata.bookTitle=${metadata.bookTitle}`);
  console.log(`  - metadata.chapterTitle=${metadata.chapterTitle}`);
  console.log(`  - metadata.text=${metadata.text.substring(0, 100)}...`);
}


// --------------------------------------------------------
/// @return   새로운 shortMetaData
/// @brief    metadatatext가 너무 짧으면 (가령 제목만 있는 section), 다음 metadata의 text를 덧붙인다.
// --------------------------------------------------------
function mergeShortMetadata(shortMetaData, metadata) {

 if(shortMetaData) {
    shortMetaData.text += metadata.text;
  }
  if(metadata.text.length < 100) {
    return metadata;
  }
  return null;
}


// --------------------------------------------------------
/// @brief    metadata.text를 chunk 크기로 나눠, 여러 metadata로 복제하여,
///           metadatas 배열에 push
// --------------------------------------------------------
function splitMetadataAndPush(metadatas, metadata) {
 
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
/// @param[in]   basepath
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
function loadMetadataInSummaryItem(basepath, bookinfo, item) {

  const _bookFolderName = bookFolderName(bookinfo);    // e.g. 'doc-add-axes-korean'
  const rpathname = path.join(_bookFolderName, item.rpathname);

  console.log('------------------------------------');
  console.log(`loadMetadataInSummaryItem() : ${rpathname})`);

  const metadata = {};
  metadata.chapterTitle = item.title;
  metadata.rpathname = item.rpathname;

  const pathname = path.join(basepath, rpathname);
  
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
function makeSourceUrl(bookinfo, rpathname) {

  const parts = rpathname.split(/[\\/]/);
  if(parts.length == 0) return '';

  let rpath = parts.join('/');
  rpath = rpath.replace(/\.md$/i, '');    // 맨 끝 .md 제거

  const subPath = `${bookinfo.book_id}/${bookinfo.ver_id}/${rpath}`;
  
  const source = `https://hrbook-hrc.web.app/#/view/` + subPath;
  return source;
}
