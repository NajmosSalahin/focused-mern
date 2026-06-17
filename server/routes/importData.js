const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/importData');

router.post('/', ctrl.importData);

module.exports = router;
