const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { addRoutine, GetRoutine, GetRoutineById, updateRoutine, deleteRoutine, replaceTimeTable, getTimeTableForClass, getTimeTableForTeacher, getTimeTableWithSubjectClass, addClassBreak, updateClassBreak, deleteClassBreak } = require('../controller/timeTableRoutineController');


// http://localhost:5000/api/classroutine
router.post('/add/routine', auth,addRoutine);
router.get('/list/routine', auth,GetRoutine);
router.get('/get/routine/:routineid', auth,GetRoutineById);
router.put('/update/routine/:routineid', auth,updateRoutine);
router.delete('/delete/routine/:routineid', auth, deleteRoutine);
router.post('/add/classes/:class_id/routines/replace', auth, replaceTimeTable);
router.delete('/delete/classes/:class_id/routines/replace', auth, replaceTimeTable);
router.get('/get/classes/:class_id/routines', auth, getTimeTableForClass);
router.get('/get/teachers/:teacher_id/routines', auth, getTimeTableForTeacher);
router.get('/get/students/:student_id/routines', auth, getTimeTableWithSubjectClass);

// Add class break
router.post('/add/class-breaks', addClassBreak);

// Update class break
router.put('/update/class-breaks/:id', updateClassBreak);

// Delete class break
router.delete('/delete/class-breaks/:id', deleteClassBreak);



module.exports = router;