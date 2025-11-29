import 'dotenv/config';
import OpenAI from 'openai';
import { createIndexOfPineconeIfNot, upload } from './vector_db.js';
import { ask } from './ask.js';
import { printElapsedTime } from './elapsed.js';
import { cloneOrPullRepos } from './clone_docs.js';


const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });


// --------------------------------------------------------
function printGreeting() {
  console.log('--------------------------------------------------');
  console.log('pinecone_upload');
  console.log('programmed by Choi, Won-hyuk');
  console.log('v1.2.0');
  console.log('--------------------------------------------------');
}


// --------------------------------------------------------
async function testAsking() {
  
  console.log('');
  console.log('==============================================');
  console.log('[3/3] ASKING TEST:');

  const start = Date.now();
  //await ask(index, "로봇타입 및 부가축 정수를 설정하기 위해 필요한 엔지니어 코드는?")
  //await ask(index, "협조제어 공통좌표계 설정 방법 설명해줘, 특히 어느 화면으로 들어가야 하는지도.")
  //await ask(index, "아크센싱 프로그램의 간단한 예제를 만들어줘.")
  await ask(openai, index, "간단한 이더넷 UDP 통신 job 프로그램 예제?")
  console.log('--------------------------------------------------');
  console.log('ASKING TEST completed.');
  printElapsedTime(start);
  console.log('--------------------------------------------------');
}


// --------------------------------------------------
// MAIN routine

printGreeting();

const basePath = 'R:/git_repo/doc/';
await cloneOrPullRepos(basePath);

//const index = await createIndexOfPineconeIfNot();
//await upload(openai, index, process.env.PATHNAME_BOOKSHELVES);
//await testAsking();
