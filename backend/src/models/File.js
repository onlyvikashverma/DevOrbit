import mongoose from 'mongoose';

const fileSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['file', 'folder'], required: true },
  content: { type: String, default: '' },
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'File', default: null },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: false },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  sessionId: { type: String, required: false },
  isGuest: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model('File', fileSchema);
