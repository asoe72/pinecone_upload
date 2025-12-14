import fs from "fs";
import { encoding_for_model } from "@dqbd/tiktoken";
import { colorStrRed } from '../util/color_str.js';


const enc = encoding_for_model("gpt-4o-mini");


// --------------------------------------------------------
export function convToWordJoinedText(text) {

  const words = text.split(/\s+/);
  return words.join(" ").trim();  
}


// --------------------------------------------------------
export function loadText(pathname) {

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
export function splitByTokens(text, maxTokens = 4096, overlap = 400) {

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
