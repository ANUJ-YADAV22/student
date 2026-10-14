const mongoose = require('mongoose');
const Student = require('../models/Student');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CONTACT_RE = /^[0-9+\-\s]{7,15}$/;
const FIELDS = ['studentId', 'name', 'email', 'department', 'semester', 'contact'];

// Keep only known fields and force primitive types (blocks NoSQL operator injection such as {"$gt": ""}).
function pick(body) {
  const out = {};
  for (const f of FIELDS) {
    if (body[f] === undefined || body[f] === null) continue;
    out[f] = f === 'semester' ? Number(body[f]) : String(body[f]).trim();
  }
  return out;
}

function validate(data, { partial = false } = {}) {
  const errors = [];
  if (!partial) {
    for (const f of ['studentId', 'name', 'email', 'department', 'semester']) {
      if (data[f] === undefined || data[f] === '') errors.push(`${f} is required`);
    }
  }
  if (data.studentId !== undefined && data.studentId !== '' && !/^[A-Za-z0-9-]{1,20}$/.test(data.studentId)) errors.push('studentId must be alphanumeric (max 20 chars)');
  if (data.name !== undefined && data.name !== '' && (data.name.length < 2 || data.name.length > 100)) errors.push('name must be 2-100 characters');
  if (data.email !== undefined && data.email !== '' && !EMAIL_RE.test(data.email)) errors.push('email is invalid');
  if (data.semester !== undefined && (!Number.isInteger(data.semester) || data.semester < 1 || data.semester > 12)) errors.push('semester must be an integer between 1 and 12');
  if (data.contact !== undefined && data.contact !== '' && !CONTACT_RE.test(data.contact)) errors.push('contact must be 7-15 digits');
  if (partial) {
    for (const f of ['name', 'email', 'department']) if (data[f] === '') errors.push(`${f} cannot be empty`);
  }
  return errors;
}

// :id may be the business key (studentId, e.g. ST101) or the MongoDB _id.
async function findByParam(id) {
  const key = String(id).trim();
  let doc = await Student.findOne({ studentId: key.toUpperCase() });
  if (!doc && mongoose.isValidObjectId(key)) doc = await Student.findById(key);
  return doc;
}

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

exports.getStudents = async (req, res, next) => {
  try {
    const filter = {};
    const q = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    if (q) {
      const rx = new RegExp(escapeRegex(q), 'i');
      filter.$or = [{ studentId: rx }, { name: rx }, { email: rx }, { department: rx }];
    }
    const students = await Student.find(filter).sort({ createdAt: -1 }).limit(500);
    res.json({ success: true, count: students.length, data: students });
  } catch (err) { next(err); }
};

exports.getStudent = async (req, res, next) => {
  try {
    const student = await findByParam(req.params.id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    res.json({ success: true, data: student });
  } catch (err) { next(err); }
};

exports.createStudent = async (req, res, next) => {
  try {
    const data = pick(req.body || {});
    const errors = validate(data);
    if (errors.length) return res.status(400).json({ success: false, message: 'Validation failed', errors });
    const student = await Student.create(data);
    res.status(201).json({ success: true, message: 'Student added successfully', data: student });
  } catch (err) { next(err); }
};

exports.updateStudent = async (req, res, next) => {
  try {
    const data = pick(req.body || {});
    delete data.studentId; // business key is immutable
    if (Object.keys(data).length === 0) return res.status(400).json({ success: false, message: 'No valid fields to update' });
    const errors = validate(data, { partial: true });
    if (errors.length) return res.status(400).json({ success: false, message: 'Validation failed', errors });
    const student = await findByParam(req.params.id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    Object.assign(student, data);
    await student.save();
    res.json({ success: true, message: 'Student updated successfully', data: student });
  } catch (err) { next(err); }
};

exports.deleteStudent = async (req, res, next) => {
  try {
    const student = await findByParam(req.params.id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    await student.deleteOne();
    res.json({ success: true, message: 'Student deleted successfully' });
  } catch (err) { next(err); }
};
