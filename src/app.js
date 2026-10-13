require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const authRoutes = require('./routes/auth');
const categoryRoutes = require('./routes/categories');
const carRoutes = require('./routes/cars');
const rentalRoutes = require('./routes/rentals');
const orderRoutes = require('./routes/orders');
const reportRoutes = require('./routes/reports');
const userRoutes = require('./routes/users');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'car-rental-api' });
});

app.get('/', (req, res) => {
  res.render('index', {
    title: 'Car Rental API',
    endpoints: [
      'POST /api/auth/register',
      'POST /api/auth/login',
      'GET /api/cars',
      'GET /api/orders',
      'POST /api/orders',
      'GET /api/rentals',
      'GET /api/rentals/export?format=csv',
      'GET /api/reports/workload?from=&to=',
      'GET /api/reports/performance',
    ],
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/cars', carRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/rentals', rentalRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
