import express from 'express';
import { runCodeHandler } from '../controllers/executeController.js';

const router = express.Router();

router.post('/', runCodeHandler);

export default router;
