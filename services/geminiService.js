const generateQuizAttempt = async (topic, difficulty, numberOfQuestions, fileContent = null) => {
  let prompt = '';

  if (fileContent) {
    // Truncate file content to avoid exceeding API token limits. A large
    // document can easily go over the model's context window. This is a safeguard.
    const MAX_CONTENT_LENGTH = 500000;
    let processedContent = fileContent;
    if (processedContent.length > MAX_CONTENT_LENGTH) {
      console.warn(`File content was truncated to ${MAX_CONTENT_LENGTH} characters to fit within API token limits.`);
      processedContent = processedContent.substring(0, MAX_CONTENT_LENGTH);
    }

    prompt = `Generate a ${numberOfQuestions}-question multiple-choice quiz in JSON format based on the following document. The difficulty level should be "${difficulty}". The topic is derived from the document's content, but you can use "${topic}" as a hint for the topic. For each question, provide 4 options and identify the correct answer.\n\nDocument Content:\n"""\n${processedContent}\n"""`;
  } else {
    prompt = `Generate a ${numberOfQuestions}-question multiple-choice quiz in JSON format about "${topic}" with a difficulty level of "${difficulty}". For each question, provide 4 options and identify the correct answer.`;
  }

  const response = await fetch('/api/generate-quiz', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt }),
  });

  let responsePayload = {};
  try {
    responsePayload = await response.json();
  } catch {
    throw new Error('The quiz API returned an invalid JSON response.');
  }

  if (!response.ok) {
    const serverError = responsePayload?.error || `Quiz API request failed with status ${response.status}.`;
    throw new Error(serverError);
  }

  const jsonText = responsePayload?.text?.trim() || '';
  if (!jsonText) {
    throw new Error("The AI returned an empty response. It might be unable to generate a quiz for the given topic/document.");
  }
  
  const quizData = JSON.parse(jsonText);
  
  if (!Array.isArray(quizData) || quizData.length === 0) {
      throw new Error("Invalid quiz data format received from the API.");
  }

  return quizData;
};

export const generateQuiz = async (topic, difficulty, numberOfQuestions, fileContent = null) => {
  const MAX_RETRIES = 3;
  let lastError = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await generateQuizAttempt(topic, difficulty, numberOfQuestions, fileContent);
    } catch (error) {
      lastError = error;
      console.error(`Attempt ${attempt} to generate quiz failed:`, error);
      
      // Do not retry on key/auth/config errors, as those are fatal.
      if (error.message.includes("GEMINI_API_KEY") || error.message.includes("401") || error.message.includes("403")) {
          break;
      }
      
      if (attempt < MAX_RETRIES) {
        const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s
        console.log(`Retrying in ${delay / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  console.error("All quiz generation attempts failed.", lastError);
  
  if (lastError) {
      if (lastError.message.includes("GEMINI_API_KEY") || lastError.message.includes('401') || lastError.message.includes('403') || lastError.message.includes('API key not valid')) {
          throw new Error("The server Gemini API key is missing, leaked, or invalid. Set GEMINI_API_KEY on Vercel (and .env.local for local dev), then redeploy/restart.");
      }
      if (lastError.message.includes('xhr') || lastError.message.includes('500') || lastError.message.includes('fetch')) {
        throw new Error("A network error occurred while generating the quiz. Please check your connection and try again.");
      }
      if (lastError.message.includes("empty response")) {
          throw new Error("The AI failed to generate a quiz for this topic. Please try a different topic or file.");
      }
  }
  
  throw new Error("Failed to generate the quiz after multiple attempts. Please try again later.");
};