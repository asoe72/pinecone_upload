import { loadTextAll, loadMetadatasFromBookshelves } from './load_txts.js';
import { printProgressBar } from './progress_bar.js';


// --------------------------------------------------------
function chunkText(text, chunkSize = 500, overlap = 50) {
  console.log(`chunkText();`);
  const words = text.split(/\s+/);
  const chunks = [];
  for (let i = 0; i < words.length; i += chunkSize - overlap) {
    chunks.push(words.slice(i, i + chunkSize).join(" "));
  }
  console.log(`   done ; words.length = ${words.length}`);
  return chunks;
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


// --------------------------------------------------------
async function uploadToPinecone(openai, index, chunks) {
  const vectors = [];

  console.log(`uploadToPinecone(); chunks.length = ${chunks.length}`);

  for (let i = 0; i < chunks.length; i++) {
    const emb = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: chunks[i],
    });

    vectors.push({
      id: `doc-${i}`,
      values: emb.data[0].embedding,
      metadata: { text: chunks[i] }
    });
    
    const percent = (i / chunks.length) * 100;
    printProgressBar(percent);
  }
  printProgressBar(100);
  process.stdout.write("\n");
  console.log(`   done ; chunks.length = ${chunks.length}`);

  await upsertVectors(index, vectors);
}


// --------------------------------------------------------
export const upload = async (openai, index, lpath) => {

  const text = loadTextAll(lpath);
  const chunks = chunkText(text);
   
  // 최초 1회 문서 업로드 (이미 업로드 했다면 생략 가능)
  await uploadToPinecone(openai, index, chunks);

  return index;
};


// --------------------------------------------------------
export const upload2 = async (pathnameBookshelves) => {

  //console.log('loadMetadatasInFolder test');
  const metadatas = loadMetadatasFromBookshelves(pathnameBookshelves);
  console.log(`N.metadata = ${metadatas.length}`);
};
