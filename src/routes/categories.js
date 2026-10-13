const express = require('express');
const categoryRepository = require('../repositories/categoryRepository');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const rows = await categoryRepository.getAll();
    return res.json(rows);
  } catch (err) {
    return next(err);
  }
});

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const row = await categoryRepository.getById(Number(req.params.id));
    if (!row) return res.status(404).json({ error: 'Категория не найдена' });
    return res.json(row);
  } catch (err) {
    return next(err);
  }
});

router.post('/', requireAuth, requireRole('admin', 'manager'), async (req, res, next) => {
  try {
    const { name, description } = req.body || {};
    if (!name) return res.status(400).json({ error: 'Обязательное поле: name' });
    const id = await categoryRepository.createCategory({ name, description });
    const row = await categoryRepository.getById(id);
    return res.status(201).json(row);
  } catch (err) {
    return next(err);
  }
});

router.patch('/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const existing = await categoryRepository.getById(Number(req.params.id));
    if (!existing) return res.status(404).json({ error: 'Категория не найдена' });
    const name = req.body.name ?? existing.name;
    const description = req.body.description ?? existing.description;
    await categoryRepository.updateCategory(existing.id, { name, description });
    return res.json(await categoryRepository.getById(existing.id));
  } catch (err) {
    return next(err);
  }
});

router.delete('/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const ok = await categoryRepository.deleteCategory(Number(req.params.id));
    if (!ok) return res.status(404).json({ error: 'Категория не найдена' });
    return res.json({ message: 'Категория удалена' });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
