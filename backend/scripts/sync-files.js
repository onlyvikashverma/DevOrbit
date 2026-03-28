import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from backend root
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/devorbit';

// Define Schema locally to avoid relative import issues in script
const fileSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['file', 'folder'], required: true },
  content: { type: String, default: '' },
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'File', default: null },
});

const File = mongoose.model('File', fileSchema);

const IGNORE_DIRS = ['node_modules', '.git', '.next', 'dist', 'build', '.gemini'];

async function syncDir(dirPath, parentId = null) {
  const items = fs.readdirSync(dirPath);

  for (const item of items) {
    if (IGNORE_DIRS.includes(item)) continue;
    
    const fullPath = path.join(dirPath, item);
    const stats = fs.statSync(fullPath);
    const type = stats.isDirectory() ? 'folder' : 'file';

    // Check if exists
    let dbItem = await File.findOne({ name: item, parentId, type });
    
    if (!dbItem) {
      console.log(`[SYNC] Creating ${type}: ${item}`);
      let content = '';
      if (type === 'file') {
        try {
          content = fs.readFileSync(fullPath, 'utf8');
        } catch (e) {
          console.warn(`[WARN] Could not read ${fullPath}`);
        }
      }
      
      dbItem = new File({
        name: item,
        type,
        parentId,
        content
      });
      await dbItem.save();
    } else if (type === 'file') {
      // Optional: Update content if changed? For now, just skip to avoid overwriting DB edits
      // console.log(`[SYNC] Skipping existing file: ${item}`);
    }

    if (type === 'folder') {
      await syncDir(fullPath, dbItem._id);
    }
  }
}

async function run() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected.');

    const projectRoot = path.join(__dirname, '../../'); // DevOrbit root
    console.log(`Scanning project root: ${projectRoot}`);
    
    await syncDir(projectRoot);
    
    console.log('Sync complete!');
  } catch (err) {
    console.error('Sync failed:', err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
