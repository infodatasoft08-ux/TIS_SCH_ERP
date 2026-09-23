const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { restrictRoles } = require('../middleware/admincheck');
const { uploadNote } = require('../middleware/uploadMiddleware');
const { AddNote, GetNotes, UpdateNote, DeleteNote } = require('../controller/noteController');

// All notes routes require authentication
router.post('/add/note', auth, restrictRoles([1, 5]), uploadNote.single('file'), AddNote);
router.get('/get/notes', auth, GetNotes);
router.put('/update/note/:id', auth, restrictRoles([1, 5]), uploadNote.single('file'), UpdateNote);
router.delete('/delete/note/:id', auth, restrictRoles([1, 5]), DeleteNote);

module.exports = router;

