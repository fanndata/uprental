const express = require('express');
const orderRepository = require('../repositories/orderRepository');
const rentalRepository = require('../repositories/rentalRepository');
const carRepository = require('../repositories/carRepository');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

function isStaff(user) {
  return user.role === 'admin' || user.role === 'manager';
}

async function assertCarFree(carId, startDate, endDate, excludeOrderId = null) {
  const car = await carRepository.getById(Number(carId));
  if (!car) return { error: { status: 404, body: { error: 'Автомобиль не найден' } } };
  if (car.status === 'maintenance') {
    return { error: { status: 400, body: { error: 'Автомобиль недоступен для аренды' } } };
  }
  const rentalOverlap = await rentalRepository.countDateOverlap(car.id, startDate, endDate);
  const orderOverlap = await orderRepository.countActiveOverlap(
    car.id,
    startDate,
    endDate,
    excludeOrderId
  );
  if (car.status === 'rented' || rentalOverlap > 0 || orderOverlap > 0) {
    return { error: { status: 400, body: { error: 'Автомобиль занят на выбранные даты' } } };
  }
  return { car };
}

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const filters = { status: req.query.status };
    if (req.user.role === 'client') filters.clientId = req.user.id;
    return res.json(await orderRepository.getAll(filters));
  } catch (err) {
    return next(err);
  }
});

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Некорректный id' });
    }
    const order = await orderRepository.getById(id);
    if (!order) return res.status(404).json({ error: 'Заявка не найдена' });
    if (!isStaff(req.user) && order.client_id !== req.user.id) {
      return res.status(403).json({ error: 'Недостаточно прав для выполнения операции' });
    }
    return res.json(order);
  } catch (err) {
    return next(err);
  }
});

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { carId, startDate, endDate, comment } = req.body || {};
    if (!carId || !startDate || !endDate) {
      return res.status(400).json({ error: 'Обязательные поля: carId, startDate, endDate' });
    }
    const clientId = req.user.role === 'client' ? req.user.id : Number(req.body.clientId || req.user.id);
    if (!clientId) return res.status(400).json({ error: 'Не указан clientId' });

    const check = await assertCarFree(carId, startDate, endDate);
    if (check.error) return res.status(check.error.status).json(check.error.body);

    const id = await orderRepository.createOrder({
      carId: check.car.id,
      clientId,
      managerId: null,
      startDate,
      endDate,
      status: 'new',
      comment,
    });
    return res.status(201).json(await orderRepository.getById(id));
  } catch (err) {
    return next(err);
  }
});

router.patch('/:id', requireAuth, async (req, res, next) => {
  try {
    const order = await orderRepository.getById(Number(req.params.id));
    if (!order) return res.status(404).json({ error: 'Заявка не найдена' });

    const nextStatus = req.body.status ?? order.status;
    if (!isStaff(req.user)) {
      if (order.client_id !== req.user.id || nextStatus !== 'cancelled') {
        return res.status(403).json({ error: 'Клиент может только отменить свою заявку' });
      }
    }

    if (nextStatus === 'approved') {
      const check = await assertCarFree(order.car_id, order.start_date, order.end_date, order.id);
      if (check.error) return res.status(check.error.status).json(check.error.body);
    }

    await orderRepository.updateOrder(order.id, {
      status: nextStatus,
      managerId: isStaff(req.user) ? req.user.id : order.manager_id,
      comment: req.body.comment ?? order.comment,
      processedAt: nextStatus === 'new' ? order.processed_at : new Date(),
    });
    return res.json(await orderRepository.getById(order.id));
  } catch (err) {
    return next(err);
  }
});

router.delete('/:id', requireAuth, requireRole('admin', 'manager'), async (req, res, next) => {
  try {
    const ok = await orderRepository.deleteOrder(Number(req.params.id));
    if (!ok) return res.status(404).json({ error: 'Заявка не найдена' });
    return res.json({ message: 'Заявка удалена' });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
