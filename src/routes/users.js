const express = require('express');
const userRepository = require('../repositories/userRepository');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    return res.json(await userRepository.listUsers());
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
