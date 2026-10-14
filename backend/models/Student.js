const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
  {
    studentId: { type: String, required: true, unique: true, trim: true, uppercase: true, maxlength: 20 },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 120 },
    department: { type: String, required: true, trim: true, maxlength: 80 },
    semester: { type: Number, required: true, min: 1, max: 12 },
    contact: { type: String, trim: true, default: '' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Student', studentSchema);
