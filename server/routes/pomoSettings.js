const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/pomoSettings');

router.get('/', ctrl.get);
router.put('/', ctrl.update);

module.exports = router;
