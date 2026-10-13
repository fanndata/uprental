const express = require('express');
const reportRepository = require('../repositories/reportRepository');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/workload', requireAuth, requireRole('admin', 'manager'), async (req, res, next) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) {
      return res.status(400).json({ error: 'Обязательные query-параметры: from, to' });
    }
    const report = await reportRepository.workloadReport({ from, to });
    return res.json(report);
  } catch (err) {
    return next(err);
  }
});

router.get('/performance', requireAuth, requireRole('admin', 'manager'), async (req, res, next) => {
  try {
    const report = await reportRepository.performanceReport({
      thresholdHours: req.query.thresholdHours || 72,
    });
    return res.json(report);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
