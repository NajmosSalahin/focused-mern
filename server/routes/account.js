const router = require('express').Router();
const ctrl = require('../controllers/account');

router.delete('/data', ctrl.deleteAllData);

module.exports = router;
