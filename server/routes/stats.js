const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/stats');

router.get('/kpi', ctrl.kpi);
router.get('/daily', ctrl.daily);
router.get('/projects', ctrl.projects);
router.get('/dow', ctrl.dow);
router.get('/hour-heatmap', ctrl.hourHeatmap);
router.get('/pomo', ctrl.pomo);
router.get('/distribution', ctrl.distribution);
router.get('/insights', ctrl.insights);
router.get('/weather', ctrl.weather);
router.get('/detailed', ctrl.detailed);

module.exports = router;
