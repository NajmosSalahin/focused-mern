const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/exportData');

router.get('/', ctrl.exportAll);

module.exports = router;
