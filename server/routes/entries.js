const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/entries');

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);
router.post('/:id/segments', ctrl.addSegment);
router.post('/:id/stop', ctrl.stop);

module.exports = router;
