const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { createNotice, getNotice, getNoticeById, updateNotice, createEvents, getEvents, deleteNotice, getEventsById, updateEvents, createEventRegister, getEventRegister, updateEventRegister, deleteEventRegister, deleteEvent, getMyRegistrations } = require('../controller/announcementController');
const { getTodayNotifications } = require('../controller/notificationController');
const { uploadEventImage, uploadNoticeImage } = require('../middleware/uploadMiddleware');

// http://localhost:5000/api/announcement/
// Notice API
router.post('/add/notice', auth, uploadNoticeImage.single('image'), createNotice);
router.get('/list/notice', auth, getNotice);
router.get('/get/notice/:id', auth, getNoticeById);
router.put('/update/notice/:id', auth, uploadNoticeImage.single('image'), updateNotice);
router.delete('/delete/notice/:id', auth, deleteNotice);


// Events API
router.post('/add/event', auth, uploadEventImage.single('image'), createEvents);
router.get('/list/event', auth, getEvents);
router.get('/get/event/:id', auth, getEventsById);
router.put('/update/event/:eventid', auth, uploadEventImage.single('image'), updateEvents);
router.delete('/delete/event/:id', auth, deleteEvent);


//Event Register API
router.post('/add/events/:eventid/register', auth, createEventRegister);
router.get('/list/events/:eventid/registrations', auth, getEventRegister);
router.put('/update/events/registrations/:reg_id', auth, updateEventRegister);
router.delete('/delete/events/registrations/:reg_id', auth, deleteEventRegister);


router.get('/list/my/registrations', auth, getMyRegistrations);
router.get('/notifications/today', auth, getTodayNotifications);


module.exports = router;