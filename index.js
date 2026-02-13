import 'dotenv/config';
import OpenAI from 'openai';
import pkg from './package.json' with { type: 'json' };
import { createIndexOfPineconeIfNot, upload } from './vector_db.js';
import { testAsking } from './test/test_asking.js';
import { prepareDocs } from './loaders/prepare_docs.js';


const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const options = {};


// --------------------------------------------------------
/// @brief    node index.js opt1=hello, opt2=99,...
///           => options={ opt1: 'hello', opt2: '99', ...}
///     options:
///       -skipPrepare
///       -skipCreateIndex
///       -skipUpload
///       -skipUploadToDb
///       -doLogDataToUpload
///       -skipTestAsking
///       -doFileLog
// --------------------------------------------------------
function procArgs() {
  
  //const str = '-skipPrepare -doLogDataToUpload -doFileLog';
  const str = '-doLogDataToUpload -doFileLog';
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
  console.log(`v${pkg.version}`);
  console.log('--------------------------------------------------');
}


// --------------------------------------------------
async function main() {

  procArgs();
  printGreeting();

  console.log('options=' + JSON.stringify(options));

  if(options.skipPrepare==undefined) {
    await prepareDocs();
  }

  const index = await createIndexOfPineconeIfNot();

  if(options.skipUpload==undefined) {
    await upload(openai, index, options);
  }

  if(options.skipTestAsking==undefined) {
    await testAsking(openai, index, options);
  }

  console.log('options=' + JSON.stringify(options));
}


// --------------------------------------------------
// MAIN routine
await main();
