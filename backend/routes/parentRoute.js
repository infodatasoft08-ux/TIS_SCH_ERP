const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { AddParents, GetParents, UpdateParent, UpdateParentPassword, DeleteParent, GetParentWithChildrenById, AddParentChildLink, DeleteParentChild } = require('../controller/parentsController');


// curl -X POST http://localhost:5000/api/parents/add/parents \
//  -H "Content-Type: application/json" \
//  -d '{
//    "name":"kamla devi","email":"kamla@test.com","password":"kamla@123",
//    "role_id":4, "occupation":"house wise", "relation":"mother", "phone":"9876543210"
//  }'
router.post('/add/parents', auth, AddParents);

// curl "http://localhost:5000/api/parents/get/parent?q=sita&limit=20"
router.get('/get/parents', auth, GetParents);

// curl http://localhost:3000/api/parents/get/parents/:id
router.get('/get/parents/:id', auth, GetParentWithChildrenById);

// curl -X PUT http://localhost:5000/api/parents/update/parent/:id -H "Content-Type: application/json" -d '{"first_name":"Sita","occupation":"Homemaker"}'
router.put('/update/parents/:id', auth, UpdateParent);


// curl -X PUT http://localhost:3000/api/parents/update/parent/:id/password -H "Content-Type: application/json" -d '{"current_password":"Parent123","new_password":"NewParent456"}'
router.put('/update/parents/:id/password', auth, UpdateParentPassword);

// Link children:
// curl -X POST http://localhost:3000/api/parents/add/parents/:id/children -H "Content-Type: application/json" -d '{"student_ids":[2,3]}'
router.post('/add/parents/:id/children', auth, AddParentChildLink);


// Unlink child:
// curl -X DELETE http://localhost:3000/api/parents/delete/parents/1/children/2
router.delete('/delete/parents/:id/children/:student_id', auth, DeleteParentChild);

// Delete parent:
// curl -X DELETE http://localhost:5000/api/parent/delete/parent/1
router.delete('/delete/parent/:id', auth, DeleteParent);

module.exports = router;