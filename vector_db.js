import { Pinecone } from '@pinecone-database/pinecone';
import { loadMetadatasAll } from './loaders/loader.js';
import { printProgressBar } from './util/progress_bar.js';
import { printElapsedTime } from './util/elapsed.js';
import { logStrToUtf8Bom } from './util/log.js';


const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });


// --------------------------------------------------------
export async function createIndexOfPineconeIfNot() {

  console.log('--------------------------------------------------');
	console.log(`createIndexOfPineconeIfNot();`);
	
  const indexName = process.env.PINECONE_INDEX;
  const existing = await pc.listIndexes();
  
  console.log(`   ; indexName=${indexName}`);


	// index 없으면 생성
  if (!existing.indexes.find(i => i.name === indexName)) {

    console.log(`   ; createIndex(${indexName})`);
    await pc.createIndex({
      name: indexName,
      dimension: 1536,  // text-embedding-3-small = 1536차원
      metric: "cosine",
      spec: {
        serverless: {
          cloud: "aws",      // 또는 "gcp"
          region: "us-east-1"
        }
      }
    });
  }

  return pc.Index(indexName);
}


// --------------------------------------------------------
/// @brief   최초 1회 문서 업로드 (이미 업로드 했다면 생략 가능)
// --------------------------------------------------------
export const upload = async (openai, index, options) => {

  console.log('upload');

  const start = Date.now();

  // metadatas 생성
  const metadatas = await loadMetadatasAll();

  // 개수 제한 (시험용)
  const n_max = 20;
  metadatas.length = n_max;

  // vector DB에 upload
  if(options?.skipUploadToDb==undefined) {
    await uploadToPinecone(openai, index, metadatas, options);
  }

  // log
  if(options?.doLogDataToUpload) {
    logDataToUpload(metadatas);
  }

  // report
  console.log('');
  console.log('--------------------------------------------------');
  console.log('load files & upload to vector DB completed.');
  printElapsedTime(start);
  console.log('--------------------------------------------------');

  return index;
};


// --------------------------------------------------------
/// @param[in]   metadatas
///           { "text": 본문 chunk ...,
///             "title": README.md의 # 레벨 제목
///             "source": 출처
///           }
///           e.g.
///           { "text": "# 2. 운전\n\n운전은 로봇에게 작업 내용을...",
///             "title": "2. 운전"
///             "source": e.g. "https://hrbook-hrc.web.app/#/view/doc-hi6-operation/korean-tp630/2-operation/README"
///           }
// --------------------------------------------------------
async function uploadToPinecone(openai, index, metadatas, options) {
  
  const n_metadata = metadatas.length;

	console.log('');
	console.log('==============================================');
  console.log('[2/3] UPLOADING TO VECTOR DB:');
  console.log(`     ; n_metadata = ${n_metadata}`);

  const vectors = [];

  for (let i = 0; i < n_metadata; i++) {
    const metadata = metadatas[i];

    // embedding 생성
    const emb = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: JSON.stringify(metadata)
    });

    vectors.push({
      id: `doc-${i}`,
      values: emb.data[0].embedding,
      metadata
    });
    
    const percent = (i / n_metadata) * 100;
    printProgressBar(percent);
  }
  printProgressBar(100);
  process.stdout.write("\n");
  console.log(`   done ; n_metadata = ${n_metadata}`);

  if(options?.skipUpsert==undefined) {
    await upsertVectors(index, vectors);
  }
}


// --------------------------------------------------------
async function logDataToUpload(metadatas) {
  
  const n_metadata = metadatas.length;

	console.log('');
	console.log('==============================================');
  console.log('LOG METADATAS TO UPLOAD:');
  console.log(`     ; n_metadata = ${n_metadata}`);

  const vectors = [];

  const pathname = 'vectors.txt';
  logStrToUtf8Bom('', pathname, true);

  for (let i = 0; i < n_metadata; i++) {
    const _metadata = metadatas[i];

    vectors.push({
      id: `doc-${i}`,
      input: JSON.stringify(_metadata.metadata)
    });

    logStrToUtf8Bom(`\n\n\ndoc-${i} ----------------------`, pathname, false);
    logStrToUtf8Bom(JSON.stringify(_metadata), pathname, false);
    
    const percent = (i / n_metadata) * 100;
    printProgressBar(percent);
  }
  printProgressBar(100);
  process.stdout.write("\n");
  console.log(`   done ; n_metadata = ${n_metadata}`);
}


// --------------------------------------------------------
async function upsertVectors(index, vectors) {

  console.log(`upserting vectors (length=${vectors.length})...`);

  for (let i = 0; i < vectors.length; i += 50) {
    
    await index.upsert(vectors.slice(i, i + 50));

    const percent = (i / vectors.length) * 100;
    printProgressBar(percent);
  }
  printProgressBar(100);
  process.stdout.write("\n");
}
