
// --------------------------------------------------------
async function askQuestion(openai, index, query) {
  // 쿼리 임베딩
  console.log(`openai.embeddings.create()`);

  const qEmb = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: query
  });

  // Pinecone 검색
  console.log(`index.query()`);
  const results = await index.query({
    topK: 3,
    vector: qEmb.data[0].embedding,
    includeMetadata: true
  });

  const context = results.matches.map(m => m.metadata.text).join("\n");

  // ChatGPT에 전달
  console.log(`openai.chat.completions.create()`);
  console.log(`   ; Please, wait about 10~20 seconds...`);
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "다음 문서를 참고하여 질문에 답하세요." },
      { role: "user", content: `문서:\n${context}\n\n질문: ${query}` }
    ]
  });

  return completion.choices[0].message.content;
}


// --------------------------------------------------------
export const ask = async (openai, index, question) => {
  
  const answer = await askQuestion(openai, index, question);
  console.log("답변:", answer);
};
