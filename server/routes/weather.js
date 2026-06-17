const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/weather');

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.get('/location', ctrl.location);
router.get('/fetch', ctrl.fetch);

module.exports = router;
