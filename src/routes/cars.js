const express = require('express');
const carRepository = require('../repositories/carRepository');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const rows = await carRepository.getAll({
      status: req.query.status,
      categoryId: req.query.categoryId ? Number(req.query.categoryId) : undefined,
    });
    return res.json(rows);
  } catch (err) {
    return next(err);
  }
});

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const row = await carRepository.getById(Number(req.params.id));
    if (!row) return res.status(404).json({ error: 'Автомобиль не найден' });
    return res.json(row);
  } catch (err) {
    return next(err);
  }
});

router.post('/', requireAuth, requireRole('admin', 'manager'), async (req, res, next) => {
  try {
    const { categoryId, brand, model, year, plateNumber, color, dailyPrice, status, mileage } =
      req.body || {};
    if (!categoryId || !brand || !model || !year || !plateNumber || !color || dailyPrice == null) {
      return res.status(400).json({
        error: 'Обязательные поля: categoryId, brand, model, year, plateNumber, color, dailyPrice',
      });
    }
    if (Number(dailyPrice) < 0 || Number(year) < 1990) {
      return res.status(400).json({ error: 'Некорректные значения year или dailyPrice' });
    }
    const id = await carRepository.createCar({
      categoryId: Number(categoryId),
      brand,
      model,
      year: Number(year),
      plateNumber,
      color,
      dailyPrice: Number(dailyPrice),
      status,
      mileage: mileage != null ? Number(mileage) : 0,
    });
    return res.status(201).json(await carRepository.getById(id));
  } catch (err) {
    return next(err);
  }
});

router.patch('/:id', requireAuth, requireRole('admin', 'manager'), async (req, res, next) => {
  try {
    const existing = await carRepository.getById(Number(req.params.id));
    if (!existing) return res.status(404).json({ error: 'Автомобиль не найден' });

    const data = {
      categoryId: Number(req.body.categoryId ?? existing.category_id),
      brand: req.body.brand ?? existing.brand,
      model: req.body.model ?? existing.model,
      year: Number(req.body.year ?? existing.year),
      plateNumber: req.body.plateNumber ?? existing.plate_number,
      color: req.body.color ?? existing.color,
      dailyPrice: Number(req.body.dailyPrice ?? existing.daily_price),
      status: req.body.status ?? existing.status,
      mileage: Number(req.body.mileage ?? existing.mileage),
    };
    await carRepository.updateCar(existing.id, data);
    return res.json(await carRepository.getById(existing.id));
  } catch (err) {
    return next(err);
  }
});

router.delete('/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const ok = await carRepository.deleteCar(Number(req.params.id));
    if (!ok) return res.status(404).json({ error: 'Автомобиль не найден' });
    return res.json({ message: 'Автомобиль удалён' });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
