import { logStrToUtf8Bom } from './util/log.js';


// --------------------------------------------------------
async function askQuestion(openai, index, query, options) {
  // 쿼리 임베딩
  console.log(`openai.embeddings.create()`);

  const qEmb = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: query
  });

  const vectorOfQuery = qEmb.data[0].embedding;

  // Pinecone 검색
  console.log(`index.query()`);
  const queryResults = await index.query({
    topK: 5,
    vector: vectorOfQuery,
    includeMetadata: true
  });

  const context = queryResults.matches.map(m => JSON.stringify(m.metadata)).join("\n--------------\n");

  // ChatGPT에 전달
  console.log(`openai.chat.completions.create()`);
  console.log(`   ; Please, wait about 10~20 seconds...`);

  const messages = [
    { role: "system", content: "다음 문서를 참고하여 질문에 답하세요." },
    { role: "user", content: `문서:\n${context}\n\n질문: ${query}` }
  ];

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages
  });

  const answer = completion.choices[0].message.content;

  if(options?.doLog) {
    const pathname = 'messages.txt';
    logStrToUtf8Bom('==== askQuestion() TEST ====\n', pathname, true);

    logStrToUtf8Bom(`질문 (QUERY) : ${query}\n`, pathname, false);
    logStrToUtf8Bom(`     vector : ${JSON.stringify(vectorOfQuery)}:\n`, pathname, false);
  
    logStrToUtf8Bom(`\nQUERY RESULTS : \n`, pathname, false);
    let i=0;
    for(const m of queryResults.matches) {
      logStrToUtf8Bom(` \nQUERY RESULT [${i}]\n\n`, pathname, false);
      logStrToUtf8Bom(`score=${m.score}\n`, pathname, false);
      logStrToUtf8Bom(m.metadata.text, pathname, false);
      i++;
    }
    logStrToUtf8Bom(`답변 (ANSWER) : ${answer}:\n\n\n`, pathname, false);

    //calcLogScoreOfExpectedId(index, vectorOfQuery, 'doc-216', pathname);
  }

  return answer;
}


// --------------------------------------------------------
export const ask = async (openai, index, question, options) => {
  
  const answer = await askQuestion(openai, index, question, options);
  console.log("답변:", answer);
};


// --------------------------------------------------------
const calcLogScoreOfExpectedId = async (index, vectorOfQuery, idExpected, pathname) => {

  const vectorExpected = await getVectorFromId(index, idExpected);
  if (!vectorExpected) return -1;
  const score = scoreOfVectors(vectorOfQuery, vectorExpected);
  logStrToUtf8Bom(`score of ${idExpected} = ${score}\n`, pathname, false);
}


// --------------------------------------------------------
const getVectorFromId = async (index, id) => {

  const res = await index.fetch([id]);
  
  if (!res?.records) {
    console.error("fetch response invalid:", res);
    return null;
  }
  const record = res.records[id];
  const values = record?.values;

  return values;
}


// --------------------------------------------------------
/// @return   score = (v1 v2) / ||v1|| ||v2||
// --------------------------------------------------------
const scoreOfVectors = (v1, v2) => {
  // cosineSimilarity
  if (v1.length !== v2.length) {
    throw new Error("Vector dimensions must match");
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < v1.length; i++) {
    dot += v1[i] * v2[i];
    normA += v1[i] * v1[i];
    normB += v2[i] * v2[i];
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};
