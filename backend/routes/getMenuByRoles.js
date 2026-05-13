const authMiddleware = require("../middleware/auth");
const express = require('express');
const db = require("../db");
const { fetchMenusByRole, assignMenusToRole, getAssignRoleMenus, getAssignRoleMenusTree, getRolesForMenus, fetchMenuTree } = require("../controller/fetchMenuByRolls");
const { createRole, getAllRoles } = require("../controller/rolesController");
// const adminOnly = require("../middleware/admincheck");
const router = express.Router();

router.get('/menus', authMiddleware, fetchMenusByRole);
// router.get('/menus/role/:role_id', authMiddleware, adminOnly);

router.post('/add/roles', authMiddleware, createRole);


router.post('/assign/roles/:role_id/menus', authMiddleware, assignMenusToRole);

router.get('/get/roles/:role_id/menus', authMiddleware, getAssignRoleMenus);

router.get('/get/roles/:role_id/menus/tree', authMiddleware, getAssignRoleMenusTree);

router.delete('/delete/roles/:role_id/menus/:menu_id', authMiddleware, getAssignRoleMenusTree);

router.delete('/delete/roles/:role_id/menus/:menu_id', authMiddleware, getAssignRoleMenusTree);

router.get('/get/menus/:menu_id/roles', authMiddleware, getRolesForMenus);


router.get('/get/menus/tree', authMiddleware, fetchMenuTree);

router.get('/get/allroles', authMiddleware, getAllRoles);
router.get('/get/open-allroles', getAllRoles);



module.exports = router;