import express from 'express';
import { 
  getFiles, 
  createFile, 
  deleteFile, 
  updateFileContent,
  syncLocalFiles,
  browseSystem
} from '../controllers/fileController.js';

const router = express.Router();

router.get('/', getFiles);
router.post('/', createFile);
router.post('/sync', syncLocalFiles);
router.post('/browse', browseSystem);

router.put('/:id', updateFileContent);
router.delete('/:id', deleteFile);

export default router;
