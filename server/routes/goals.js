const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/goals');

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);
router.get('/progress', ctrl.progress);

module.exports = router;
