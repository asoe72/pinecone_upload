import 'dotenv/config';
import OpenAI from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';
import { upload, upload2 } from './upload.js';
import { ask } from './ask.js';
import { printElapsedTime } from './elapsed.js';


const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });


// --------------------------------------------------------
async function createIndexOfPinecone() {

  console.log('--------------------------------------------------');
  console.log('upload');

  const indexName = process.env.PINECONE_INDEX;
  const existing = await pc.listIndexes();

  console.log(`createIndexOfPinecone();`);
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


console.log('--------------------------------------------------');
console.log('pinecone_upload');
console.log('programmed by Choi, Won-hyuk');
console.log('v1.0.0');
console.log('--------------------------------------------------');

// test
upload2('_test/bookshelves.json');
process.exit(0);




const start = Date.now();

const index = await createIndexOfPinecone();
await upload(openai, index, process.env.LEARNING_DATA_PATH);
console.log('--------------------------------------------------');
console.log('upload completed.');
printElapsedTime(start);

console.log('--------------------------------------------------');
console.log('test');

// test
const start2 = Date.now();
//await ask(index, "로봇타입 및 부가축 정수를 설정하기 위해 필요한 엔지니어 코드는?")
//await ask(index, "협조제어 공통좌표계 설정 방법 설명해줘, 특히 어느 화면으로 들어가야 하는지도.")
//await ask(index, "아크센싱 프로그램의 간단한 예제를 만들어줘.")
await ask(openai, index, "간단한 이더넷 UDP 통신 job 프로그램 예제?")
console.log('test completed.');
printElapsedTime(start2);
