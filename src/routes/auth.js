const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/userRepository');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/register', async (req, res, next) => {
  try {
    const { fullName, email, password, phone } = req.body || {};
    if (!fullName || !email || !password) {
      return res.status(400).json({ error: 'Обязательные поля: fullName, email, password' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: 'Пароль должен быть не короче 6 символов' });
    }
    const exists = await userRepository.findByEmail(email);
    if (exists) {
      return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const id = await userRepository.createUser({
      fullName,
      email,
      passwordHash,
      phone,
      role: 'client',
    });
    const user = await userRepository.findById(id);
    return res.status(201).json(user);
  } catch (err) {
    return next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Обязательные поля: email, password' });
    }
    const user = await userRepository.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, fullName: user.full_name },
      process.env.JWT_SECRET || 'dev_secret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );
    return res.json({
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        phone: user.phone,
      },
    });
  } catch (err) {
    return next(err);
  }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await userRepository.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
    return res.json(user);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
