import mongoose from 'mongoose';

const MatchItemSchema = new mongoose.Schema({
  lineId: Number,
  topic: String,
  noteLine: String,
  rawNote: String,
  pageNumber: Number,
  sectionTitle: String,
  startLine: Number,
  endLine: Number,
  exactQuote: String,
  confidence: Number,
  explanation: String
}, { _id: false });

const ReadingRangeSchema = new mongoose.Schema({
  start: Number,
  end: Number,
  count: Number
}, { _id: false });

const MatchHistorySchema = new mongoose.Schema({
  bookId: { type: String, required: true, index: true },
  bookTitle: { type: String, required: true },
  notesSnippet: { type: String, default: '' },
  totalBookPages: { type: Number, default: 0 },
  pagesToReadCount: { type: Number, default: 0 },
  timeSavedPercent: { type: Number, default: 0 },
  uniquePages: [{ type: Number }],
  readingRanges: [ReadingRangeSchema],
  matches: [MatchItemSchema],
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.MatchHistory || mongoose.model('MatchHistory', MatchHistorySchema);
