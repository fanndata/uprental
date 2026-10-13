function notFound(req, res) {
  res.status(404).json({ error: 'Маршрут не найден' });
}

function errorHandler(err, req, res, next) {
  console.error(err);
  if (res.headersSent) return next(err);

  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(400).json({ error: 'Запись с такими уникальными данными уже существует' });
  }
  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(400).json({ error: 'Ссылка на несуществующую запись (внешний ключ)' });
  }
  if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === 'ER_ROW_IS_REFERENCED') {
    return res.status(400).json({
      error: 'Нельзя удалить запись: на неё ссылаются другие данные',
    });
  }

  const status = err.status || 500;
  res.status(status).json({
    error: status === 500 ? 'Внутренняя ошибка сервера' : err.message,
  });
}

module.exports = { notFound, errorHandler };
