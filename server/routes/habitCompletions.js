const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/habitCompletions');

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.delete('/:id', ctrl.remove);
router.post('/bulk', ctrl.bulk);

module.exports = router;
