import 'dotenv/config';
import OpenAI from 'openai';
import { createIndexOfPineconeIfNot, upload } from './vector_db.js';
import { testAsking } from './test/test_asking.js';
import { hrbook_cloneOrPullRepos } from './loaders/hrbook_clone.js';


const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const options = {};


// --------------------------------------------------------
/// @brief    node index.js opt1=hello, opt2=99,...
///           => options={ opt1: 'hello', opt2: '99', ...}
///     options:
///       -skipClone
///       -skipCreateIndex
///       -skipUpload
///       -skipUploadToDb
///       -doLogDataToUpload
///       -skipTestAsking
///       -doFileLog
// --------------------------------------------------------
function procArgs() {
  
  const str = '-skipClone -doLogDataToUpload -doFileLog';
  const args = str.split(' ');
  //const args = process.argv.slice(2);
  
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
  console.log('v1.5.0');
  console.log('--------------------------------------------------');
}


// --------------------------------------------------
// MAIN routine

procArgs();
printGreeting();

const basePath = 'R:/git_repo/doc/';

console.log('options=' + JSON.stringify(options));

if(options.skipClone==undefined) {
  await hrbook_cloneOrPullRepos(basePath);
}

const index = await createIndexOfPineconeIfNot();

if(options.skipUpload==undefined) {
  await upload(openai, index, process.env.PATHNAME_BOOKSHELVES, options);
}

if(options.skipTestAsking==undefined) {
  await testAsking(openai, index, options);
}

console.log('options=' + JSON.stringify(options));
