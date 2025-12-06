import 'dotenv/config';
import OpenAI from 'openai';
import { createIndexOfPineconeIfNot, upload } from './vector_db.js';
import { testAsking } from './test_asking.js';
import { cloneOrPullRepos } from './clone_docs.js';


const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const options = {};


// --------------------------------------------------------
/// @brief    node index.js opt1=hello, opt2=99,...
///           => options={ opt1: 'hello', opt2: '99', ...}
// --------------------------------------------------------
function procArgs() {
  const args = process.argv.slice(2);
  
  for (const a of args) {
    const [key, value] = a.split('=');
    if (key.startsWith('-')) {
        options[key.substring(1)] = value ?? true;
    }
  }
}


// --------------------------------------------------------
function printGreeting() {
  console.log('--------------------------------------------------');
  console.log('pinecone_upload');
  console.log('programmed by Choi, Won-hyuk');
  console.log('v1.4.0');
  console.log('--------------------------------------------------');
}


// --------------------------------------------------
// MAIN routine

// options:
// -skipClone
// -skipCreateIndex
// -skipUpload
// -skipUploadToDb
// -doLogDataToUpload
// -skipTestAsking
// -doLog

procArgs();
printGreeting();

const basePath = 'R:/git_repo/doc/';

console.log('options=' + JSON.stringify(options));

if(options.skipClone==undefined) {
  await cloneOrPullRepos(basePath);
}

const index = await createIndexOfPineconeIfNot();

if(options.skipUpload==undefined) {
  await upload(openai, index, process.env.PATHNAME_BOOKSHELVES, options);
}

if(options.skipTestAsking==undefined) {
  await testAsking(openai, index, options);
}

console.log('options=' + JSON.stringify(options));
