import { GoogleGenAI, Type } from "@google/genai";

const QUIZ_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      question: {
        type: Type.STRING,
        description: "The quiz question.",
      },
      questionType: {
        type: Type.STRING,
        description: "One of: Multiple Choice, Identification, True or False.",
      },
      difficulty: {
        type: Type.STRING,
        description: "One of: Easy, Medium, Hard.",
      },
      options: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description:
          'Options for the question. For Identification this should be an empty array. For True or False it should be ["True","False"]. For Multiple Choice it should have 4 options.',
      },
      correctAnswer: {
        type: Type.STRING,
        description: "The correct answer from the provided options.",
      },
    },
    required: ["question", "options", "correctAnswer", "questionType", "difficulty"],
  },
};

type VercelRequest = {
  method?: string;
  body?: unknown;
};

type VercelResponse = {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string | string[]) => void;
};

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  res.setHeader("Allow", ["POST"]);

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed. Use POST." });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    res.status(500).json({ error: "Server misconfiguration: GEMINI_API_KEY is missing." });
    return;
  }

  const body = req.body as { prompt?: unknown } | undefined;
  const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";

  if (!prompt) {
    res.status(400).json({ error: "Invalid request body. 'prompt' must be a non-empty string." });
    return;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: QUIZ_SCHEMA,
      },
    });

    const text = response.text?.trim();
    if (!text) {
      res.status(502).json({ error: "Gemini returned an empty response." });
      return;
    }

    res.status(200).json({ text });
  } catch (error: any) {
    const statusCode = typeof error?.status === "number" ? error.status : 500;
    const message =
      typeof error?.message === "string" && error.message.length > 0
        ? error.message
        : "Failed to generate quiz content.";

    res.status(statusCode).json({
      error: message,
      details: error?.error ?? null,
    });
  }
}
