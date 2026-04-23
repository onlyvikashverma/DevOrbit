import express from 'express';
import { aiChatHandler } from '../controllers/aiController.js';

const router = express.Router();

router.post('/chat', aiChatHandler);

export default router;
