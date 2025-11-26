const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

const Student = require('./models/Student');
const Attendance = require('./models/Attendance');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('Mongo error:', err));

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'face-attendance-parallel-backend' });
});

// Add Student (parallel store) with logging
app.post('/students', async (req, res) => {
  try {
    console.log('POST /students received body:', req.body);
    console.log('POST /students received file:', req.file);
    const { classId, id, name, gender, guardianName, contactInfo, faceDescriptor } = req.body;
    if (!faceDescriptor) {
      return res.status(400).json({ message: 'faceDescriptor required' });
    }
    console.log('Received descriptor:', faceDescriptor); // debug
    const student = new Student({ classId, id, name, gender, guardianName, contactInfo, faceDescriptor });
    await student.save();
    res.status(201).json({ message: 'Student with descriptor stored' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add Attendance (parallel store)
app.post('/attendance', async (req, res) => {
  try {
    const { classId, date, absentees, attendancePercentage } = req.body;
    if (!classId || !date) {
      return res.status(400).json({ message: 'classId and date are required' });
    }
    const record = new Attendance({ classId, date, absentees, attendancePercentage });
    await record.save();
    res.status(201).json({ message: 'Attendance stored in parallel DB' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/students', async (req, res) => {
  try {
    const { classId } = req.query;
    const query = classId ? { classId } : {};
    const students = await Student.find(query).lean();
    res.json(students);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

const port = process.env.PORT || 5050;
app.listen(port, () => console.log(`Parallel backend running on port ${port}`));
