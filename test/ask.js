import { logStrToUtf8Bom } from '../util/log.js';


const instruction = `
	당신은 HD 현대로보틱스의 로봇 제품과 Hi6 제어기 전문가 상담원입니다. 
	이 content에 포함된 아래 지문만 참고하여 답변해야 합니다. 

	- 지문에 없는 내용은 절대 추측이나 일반 지식 바탕으로 답변하지 마세요.
	- 지문에 없는 내용은 절대 타 제품의 지식을 바탕으로 답변하지 마세요.
	- 사용자 질문의 제어기라는 말은 문맥 상 HD현대로보틱스의 Hi6 제어기 제품이라는 말입니다.
	- 사용자 질문의 로봇이라는 말은 문맥 상 HD현대로보틱스의 로봇기구 제품이라는 말입니다.
	- 조작이나 확인에 관한 내용은 Hi6 제어기라는 별도의 명시가 없으면, TP630 티치펜던트의 메뉴와 화면이름, 모니터링 창, 조작키를 중심으로 설명하세요.
	- 명령문에 대한 내용은 Hi6 제어기라는 별도의 명시가 없으면, HRScript 언어의 문법과 예시를 중심으로 설명하세요.
	- 친절하게 답변하세요.
	- 지문에 없는 내용은 "죄송하지만, 해당 내용은 알 수 없습니다. [HRBook (https://hrbook-hrc.web.app)](https://hrbook-hrc.web.app)을 참조하거나 [HD현대로보틱스 공식사이트의 고객지원](https://www.hd-hyundairobotics.com)을 통해 문의 바랍니다."라고 안내하세요.
	- 답변은 전문적이고 정확하게 작성하세요.
`;


// --------------------------------------------------------
export const ask = async (openai, index, question, options) => {
  
  // 쿼리에 대한 vector 얻기
  const vectorOfQuery = await queryVectorOfContent(openai, question);

  // Pinecone 검색하여 context 얻기
  const queryResults = await queryRefDataFromVectorDb(index, vectorOfQuery);
  const refData = queryResults.matches.map(m => JSON.stringify(m.metadata)).join("\n--------------\n");

  // OpenAI에 chat completion 요청
  const answer = await callChatCompletion(openai, refData, question);
  
  // file log (분석용)
  if(options?.doFileLog) {
    doFileLog(question, vectorOfQuery, queryResults, answer);
  }
  console.log("답변:", answer);

  return answer;
}


// --------------------------------------------------------
async function queryVectorOfContent(openai, content) {

  console.log(`openai.embeddings.create()`);

	// 쿼리 임베딩 (질문의 vector를 qEmb.data[0].embedding로 얻게 됨.)
	const qEmb = await openai.embeddings.create({
		model: "text-embedding-3-small",
		input: content
	});

	const vector = qEmb.data[0].embedding;	// input 속성이 배열이 아닌 단일 문자열(한개의 질문)이므로 qEmb.data[]도 1개 요소만 존재한다.
	return vector;
}


// --------------------------------------------------------
async function queryRefDataFromVectorDb(index, vector) {

  console.log(`queryRefDataFromVectorDb()`);

	const result = await index.query({
		topK: 5,
		vector,
		includeMetadata: true
	});

	return result;
}


// --------------------------------------------------------
async function callChatCompletion(openai, refData, question) {

  console.log(`openai.chat.completions.create()`);
  console.log(`   ; Please, wait about 10~20 seconds...`);


	//console.log(instruction);
	const msgForOpenAI = [
		{ role: "system", content: instruction + refData },		// 지시사항(instruction)과 참조데이터(refData)
		{ role: "user", content: `문서:\n${refData}\n\n질문: ${question}` }
	];

	const completion = await openai.chat.completions.create({
		model: "gpt-4o-mini",
		messages: msgForOpenAI
	});

  const choice = completion.choices[0];
  console.log('>>>>>>>>>>> choice=' + JSON.stringify(choice));

  const answer = choice.message.content;
	return answer;
}


// --------------------------------------------------------
function doFileLog(question, vectorOfQuery, queryResults, answer) {

  const pathname = 'messages.txt';
  logStrToUtf8Bom('==== askQuestion() TEST ====\n', pathname, true);

  logStrToUtf8Bom(`질문 (question) : ${question}\n`, pathname, false);
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
