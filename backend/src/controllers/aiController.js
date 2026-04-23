import { GoogleGenAI } from '@google/genai';

export const aiChatHandler = async (req, res) => {
  try {
    const { prompt, fileContext } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(200).json({
        response: "DevOrbit AI is in development phase, Please Try Again Later."
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    let contextPrompt = prompt;
    if (fileContext && fileContext.name) {
      contextPrompt = `Context File: ${fileContext.name}\nCode:\n\`\`\`\n${fileContext.content}\n\`\`\`\nUser Request: ${prompt}`;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contextPrompt,
      config: {
        systemInstruction: "You are DevOrbit AI, an expert software developer assistant. You write perfect, readable code solutions and explain things clearly. Output concise markdown."
      }
    });

    res.status(200).json({ response: response.text });
  } catch (error) {
    console.error('AI Generation Error:', error.message || error);
    res.status(500).json({ error: 'Failed to process AI request' });
  }
};
