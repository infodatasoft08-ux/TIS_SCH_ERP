const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { createLesson, GetLessons, UpdateLesson, GetLessonById, DeleteLessons, GetLessonByTeacher, GetLessonByClass } = require('../controller/lessonController');


router.post('/add/lessons', auth, createLesson);

router.get('/list/lessons', auth, GetLessons);

router.get('/get/lessons/:id', auth, GetLessonById);

router.put('/update/lessons/:id', auth, UpdateLesson);

router.delete('/delete/lessons/:id', auth, DeleteLessons);


router.get('/get/lessons/teacher/:teacher_id', auth, GetLessonByTeacher);


router.get('/get/lessons/class/:class_id', auth, GetLessonByClass);


module.exports = router;