const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { uploadNote } = require('../middleware/uploadMiddleware');
const { AddNote, GetNotes, UpdateNote, DeleteNote } = require('../controller/noteController');

// All notes routes require authentication
router.post('/add/note', auth, uploadNote.single('file'), AddNote);
router.get('/get/notes', auth, GetNotes);
router.put('/update/note/:id', auth, uploadNote.single('file'), UpdateNote);
router.delete('/delete/note/:id', auth, DeleteNote);

module.exports = router;
