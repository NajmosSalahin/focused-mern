const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/pomoSessions');

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.delete('/today', ctrl.removeToday);

module.exports = router;
