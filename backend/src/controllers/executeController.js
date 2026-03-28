import { executeCode } from '../services/dockerExecutor.js';

export const runCodeHandler = async (req, res) => {
  try {
    const { language, content } = req.body;
    
    if (!language || !content) {
      return res.status(400).json({ error: 'Language and content are required' });
    }

    const result = await executeCode(language, content);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
