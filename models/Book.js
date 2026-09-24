import mongoose from 'mongoose';

const LineSchema = new mongoose.Schema({
  lineNumber: { type: Number, required: true },
  text: { type: String, required: true }
}, { _id: false });

const PageSchema = new mongoose.Schema({
  pageNumber: { type: Number, required: true },
  title: { type: String, default: '' },
  lines: [LineSchema]
}, { _id: false });

const BookSchema = new mongoose.Schema({
  bookId: { type: String, required: true, unique: true, index: true },
  title: { type: String, required: true },
  totalPages: { type: Number, required: true },
  toc: [{
    level: Number,
    title: String,
    page: Number
  }],
  pages: [PageSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.models.Book || mongoose.model('Book', BookSchema);
