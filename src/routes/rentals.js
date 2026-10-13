const express = require('express');
const rentalRepository = require('../repositories/rentalRepository');
const carRepository = require('../repositories/carRepository');
const exportService = require('../services/exportService');
const { daysBetween } = require('../utils/dates');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

function canViewRental(user, rental) {
  if (user.role === 'admin' || user.role === 'manager') return true;
  return rental.client_id === user.id;
}

router.get('/export', requireAuth, async (req, res, next) => {
  try {
    const format = String(req.query.format || 'csv').toLowerCase();
    const filters = {
      status: req.query.status,
      from: req.query.from,
      to: req.query.to,
    };
    if (req.user.role === 'client') filters.clientId = req.user.id;

    const rows = await rentalRepository.getAll(filters);

    if (format === 'csv') {
      const csv = exportService.toCsv(rows);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="rentals.csv"');
      return res.send(`\uFEFF${csv}`);
    }
    if (format === 'excel' || format === 'xlsx') {
      const buffer = await exportService.toExcel(rows);
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader('Content-Disposition', 'attachment; filename="rentals.xlsx"');
      return res.send(Buffer.from(buffer));
    }
    if (format === 'pdf') {
      const buffer = await exportService.toPdf(rows);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="rentals.pdf"');
      return res.send(buffer);
    }
    return res.status(400).json({ error: 'Поддерживаемые форматы: csv, excel, pdf' });
  } catch (err) {
    return next(err);
  }
});

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const filters = {
      status: req.query.status,
      from: req.query.from,
      to: req.query.to,
    };
    if (req.user.role === 'client') filters.clientId = req.user.id;
    const rows = await rentalRepository.getAll(filters);
    return res.json(rows);
  } catch (err) {
    return next(err);
  }
});

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Некорректный id. Подставь число, например /api/rentals/6' });
    }
    const rental = await rentalRepository.getById(id);
    if (!rental) return res.status(404).json({ error: 'Аренда не найдена' });
    if (!canViewRental(req.user, rental)) {
      return res.status(403).json({ error: 'Недостаточно прав для выполнения операции' });
    }
    const comments = await rentalRepository.getComments(rental.id);
    return res.json({ ...rental, comments });
  } catch (err) {
    return next(err);
  }
});

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { carId, startDate, endDate, deposit } = req.body || {};
    if (!carId || !startDate || !endDate) {
      return res.status(400).json({ error: 'Обязательные поля: carId, startDate, endDate' });
    }
    const days = daysBetween(startDate, endDate);
    if (days == null) {
      return res.status(400).json({ error: 'Некорректный диапазон дат' });
    }
    const car = await carRepository.getById(Number(carId));
    if (!car) return res.status(404).json({ error: 'Автомобиль не найден' });
    if (car.status === 'maintenance') {
      return res.status(400).json({ error: 'Автомобиль недоступен для аренды' });
    }
    const rentalOverlap = await rentalRepository.countDateOverlap(car.id, startDate, endDate);
    if (car.status === 'rented' || rentalOverlap > 0) {
      return res.status(400).json({ error: 'Автомобиль занят на выбранные даты' });
    }

    const clientId =
      req.user.role === 'client' ? req.user.id : Number(req.body.clientId || req.user.id);
    if (!clientId) return res.status(400).json({ error: 'Не указан clientId' });

    const totalPrice = Number(car.daily_price) * days;
    const id = await rentalRepository.createRental({
      carId: car.id,
      clientId,
      managerId: req.user.role === 'client' ? null : req.user.id,
      startDate,
      endDate,
      status: 'pending',
      totalPrice,
      deposit: deposit != null ? Number(deposit) : 0,
    });
    return res.status(201).json(await rentalRepository.getById(id));
  } catch (err) {
    return next(err);
  }
});

router.patch('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Некорректный id. Подставь число, например /api/rentals/6' });
    }
    const rental = await rentalRepository.getById(id);
    if (!rental) return res.status(404).json({ error: 'Аренда не найдена' });

    const isStaff = req.user.role === 'admin' || req.user.role === 'manager';
    if (!isStaff && rental.client_id !== req.user.id) {
      return res.status(403).json({ error: 'Недостаточно прав для выполнения операции' });
    }
    if (!isStaff && req.body.status && req.body.status !== 'cancelled') {
      return res.status(403).json({ error: 'Клиент может только отменить свою заявку' });
    }

    const nextStatus = req.body.status ?? rental.status;
    const startDate = req.body.startDate ?? rental.start_date;
    const endDate = req.body.endDate ?? rental.end_date;
    const carId = Number(req.body.carId ?? rental.car_id);
    const car = await carRepository.getById(carId);
    if (!car) return res.status(404).json({ error: 'Автомобиль не найден' });

    const days = daysBetween(startDate, endDate);
    if (days == null) return res.status(400).json({ error: 'Некорректный диапазон дат' });

    if (nextStatus === 'active') await carRepository.updateStatus(carId, 'rented');
    if (nextStatus === 'completed' || nextStatus === 'cancelled') {
      await carRepository.updateStatus(carId, 'available');
    }

    await rentalRepository.updateRental(rental.id, {
      carId,
      startDate,
      endDate,
      status: nextStatus,
      totalPrice: Number(car.daily_price) * days,
      deposit: req.body.deposit != null ? Number(req.body.deposit) : rental.deposit,
      managerId: isStaff ? req.user.id : rental.manager_id,
      completedAt: nextStatus === 'completed' ? new Date() : rental.completed_at,
    });

    return res.json(await rentalRepository.getById(rental.id));
  } catch (err) {
    return next(err);
  }
});

router.delete('/:id', requireAuth, requireRole('admin', 'manager'), async (req, res, next) => {
  try {
    const rental = await rentalRepository.getById(Number(req.params.id));
    if (!rental) return res.status(404).json({ error: 'Аренда не найдена' });
    await rentalRepository.deleteRental(rental.id);
    if (rental.status === 'active') {
      await carRepository.updateStatus(rental.car_id, 'available');
    }
    return res.json({ message: 'Аренда удалена' });
  } catch (err) {
    return next(err);
  }
});

router.post('/:id/comments', requireAuth, async (req, res, next) => {
  try {
    const rental = await rentalRepository.getById(Number(req.params.id));
    if (!rental) return res.status(404).json({ error: 'Аренда не найдена' });
    if (!canViewRental(req.user, rental)) {
      return res.status(403).json({ error: 'Недостаточно прав для выполнения операции' });
    }
    const text = (req.body || {}).text;
    if (!text || !String(text).trim()) {
      return res.status(400).json({ error: 'Обязательное поле: text' });
    }
    const commentId = await rentalRepository.addComment(rental.id, req.user.id, String(text).trim());
    const comments = await rentalRepository.getComments(rental.id);
    return res.status(201).json({ id: commentId, comments });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
