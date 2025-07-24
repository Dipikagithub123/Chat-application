const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');

router.post('/register', authController.register);
router.post('/login', authController.login);

// Contact management
router.get('/contacts', auth, authController.getContacts);
router.post('/contacts/add', auth, authController.addContact);
router.post('/contacts/remove', auth, authController.removeContact);

module.exports = router; 