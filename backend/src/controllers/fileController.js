import File from '../models/File.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Resolves special system keywords to absolute paths
 */
const resolveSpecialPath = (targetPath) => {
  console.log(`[DEBUG] Resolving path: "${targetPath}"`);
  if (!targetPath) return os.homedir();
  if (['Desktop', 'Documents', 'Downloads'].includes(targetPath)) {
    const resolved = path.join(os.homedir(), targetPath);
    console.log(`[DEBUG] Keyword match! Resolved to: "${resolved}"`);
    return resolved;
  }
  
  // On Windows, treat "C:\" as an absolute path
  if (process.platform === 'win32' && /^[a-zA-Z]:[\\/]?/.test(targetPath)) {
    return path.normalize(targetPath);
  }

  const resolved = path.resolve(targetPath);
  console.log(`[DEBUG] Resolved to: "${resolved}"`);
  return resolved;
};

export const getFiles = async (req, res) => {
  try {
    const { userId, sessionId } = req.query;
    
    // Build filter: either files owned by the logged in user, or guest files matching this session
    const filter = {};
    const conditions = [];
    
    if (userId) conditions.push({ ownerId: userId });
    if (sessionId) conditions.push({ sessionId, isGuest: true });
    
    // Fallback: if no credentials passed, maybe don't return anything or return global (for backwards compat)
    if (conditions.length > 0) {
      filter.$or = conditions;
    } else {
      filter.isGuest = false; // Only return non-guest files if no specific user requested
      filter.ownerId = { $exists: false }; // Global files
    }

    const rawFiles = await File.find(filter);
    const files = rawFiles.map(f => ({
      id: f._id.toString(),
      name: f.name,
      type: f.type,
      content: f.content,
      parentId: f.parentId || null,
      ownerId: f.ownerId || null,
      sessionId: f.sessionId || null,
      isGuest: f.isGuest
    }));
    res.status(200).json(files);
  } catch (error) {
    console.error('getFiles error:', error);
    res.status(500).json({ error: 'Failed to fetch files' });
  }
};

export const createFile = async (req, res) => {
  try {
    const { name, type, parentId, content, ownerId, sessionId, isGuest } = req.body;
    
    const fileData = { 
      name, 
      type, 
      content: content || '',
      isGuest: !!isGuest
    };

    // Only add IDs if they are present and valid
    if (parentId && parentId.match(/^[0-9a-fA-F]{24}$/)) fileData.parentId = parentId;
    if (ownerId && ownerId.match(/^[0-9a-fA-F]{24}$/)) fileData.ownerId = ownerId;
    if (sessionId) fileData.sessionId = sessionId;

    const newFileRaw = new File(fileData);
    await newFileRaw.save();
    
    // Map to standardized format
    const newFile = {
      id: newFileRaw._id.toString(),
      name: newFileRaw.name,
      type: newFileRaw.type,
      content: newFileRaw.content,
      parentId: newFileRaw.parentId || null,
      ownerId: newFileRaw.ownerId || null,
      sessionId: newFileRaw.sessionId || null,
      isGuest: newFileRaw.isGuest
    };
    
    res.status(201).json(newFile);
  } catch (error) {
    console.error('createFile error:', error);
    res.status(500).json({ error: error.message || 'Failed to create file' });
  }
};

export const deleteFile = async (req, res) => {
  try {
    const { id } = req.params;
    await File.findByIdAndDelete(id);
    res.status(200).json({ message: 'File deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete file' });
  }
};

export const updateFileContent = async (req, res) => {
  try {
    const { id } = req.params;
    const { content, name } = req.body;
    const updatedRaw = await File.findByIdAndUpdate(id, { content, name }, { new: true });
    
    const updated = {
      id: updatedRaw._id.toString(),
      name: updatedRaw.name,
      type: updatedRaw.type,
      content: updatedRaw.content,
      parentId: updatedRaw.parentId || null
    };
    
    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update file' });
  }
};

export const syncLocalFiles = async (req, res) => {
  try {
    const { customPath, clearExisting } = req.body;
    console.log(`[DEBUG] Sync Request - path: "${customPath}", clear: ${clearExisting}`);
    
    // Resolve path using special keywords or absolute
    let rootPath = resolveSpecialPath(customPath);
    
    // Check existence
    if (!fs.existsSync(rootPath) || !fs.statSync(rootPath).isDirectory()) {
      return res.status(400).json({ error: 'Invalid directory path provided' });
    }

    if (clearExisting) {
      console.log('Clearing existing workspace files...');
      await File.deleteMany({});
    }

    const EXCLUDE = ['node_modules', '.git', 'dist', 'build', '.gemini', '.next', '.DS_Store', 'System Volume Information', '$RECYCLE.BIN'];
    let totalFiles = 0;
    const MAX_FILES = 1000;

    const scan = async (dir, parentId = null) => {
      if (totalFiles > MAX_FILES) return;
      
      try {
        const items = fs.readdirSync(dir);
        for (const item of items) {
          if (EXCLUDE.includes(item)) continue;
          const fullPath = path.join(dir, item);
          
          try {
            const stats = fs.statSync(fullPath);
            const type = stats.isDirectory() ? 'folder' : 'file';
            totalFiles++;

            let dbNode = await File.findOne({ name: item, parentId, type });
            if (!dbNode) {
              let content = '';
              if (type === 'file') {
                try { content = fs.readFileSync(fullPath, 'utf8'); } catch(e) {}
              }
              dbNode = new File({ name: item, type, parentId, content });
              await dbNode.save();
            } else if (type === 'file') {
              // Update content if changed
              try {
                const diskContent = fs.readFileSync(fullPath, 'utf8');
                if (dbNode.content !== diskContent) {
                  dbNode.content = diskContent;
                  await dbNode.save();
                }
              } catch(e) {}
            }
            
            if (type === 'folder') await scan(fullPath, dbNode._id);
          } catch (statError) {
            continue; // Skip inaccessible nodes
          }
        }
      } catch (readdirError) {
        console.log(`[DEBUG] Skipping restricted directory: ${dir}`);
      }
    };

    console.log(`Starting sync for: ${rootPath}`);
    await scan(rootPath);
    res.status(200).json({ message: 'Sync complete', syncedPath: rootPath });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ error: 'Failed to sync local files' });
  }
};

/**
 * Browses the host file system
 */
export const browseSystem = async (req, res) => {
  try {
    let { targetPath } = req.body;

    // Handle Windows drives separately if no path
    if (!targetPath && process.platform === 'win32') {
      try {
        const drivesRaw = execSync('wmic logicaldisk get name').toString();
        const drives = drivesRaw.split('\r\r\n')
          .filter(line => line.includes(':'))
          .map(line => ({
            name: line.trim(),
            type: 'drive',
            path: line.trim() + '\\'
          }));
        return res.status(200).json({ 
          currentPath: 'drives',
          contents: drives,
          isRoot: true 
        });
      } catch (e) {
        targetPath = 'Desktop'; // Fallback
      }
    }

    const fullPath = resolveSpecialPath(targetPath);
    
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'Path does not exist' });
    }

    const stats = fs.statSync(fullPath);
    if (!stats.isDirectory()) {
      return res.status(400).json({ error: 'Not a directory' });
    }

    const items = fs.readdirSync(fullPath, { withFileTypes: true });
    const contents = items
      .filter(item => !item.name.startsWith('$')) // Filter system files
      .map(item => ({
        name: item.name,
        type: item.isDirectory() ? 'folder' : 'file',
        path: path.join(fullPath, item.name)
      }))
      .sort((a, b) => {
        if (a.type === b.type) return a.name.localeCompare(b.name);
        return a.type === 'folder' ? -1 : 1;
      });

    res.status(200).json({
      currentPath: fullPath,
      parentPath: path.dirname(fullPath) === fullPath ? null : path.dirname(fullPath),
      contents,
      isRoot: fullPath === path.parse(fullPath).root
    });

  } catch (error) {
    console.error('Browse error:', error);
    res.status(500).json({ error: 'Failed to browse system' });
  }
};

