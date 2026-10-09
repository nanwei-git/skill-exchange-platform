const express = require('express');
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const categoryRoutes = require('./categoryRoutes');
const skillRoutes = require('./skillRoutes');
const exchangeRoutes = require('./exchangeRoutes');
const reviewRoutes = require('./reviewRoutes');
const notificationRoutes = require('./notificationRoutes');
const favoriteRoutes = require('./favoriteRoutes');
const statsRoutes = require('./statsRoutes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/categories', categoryRoutes);
router.use('/skills', skillRoutes);
router.use('/exchanges', exchangeRoutes);
router.use('/reviews', reviewRoutes);
router.use('/notifications', notificationRoutes);
router.use('/favorites', favoriteRoutes);
router.use('/stats', statsRoutes);

module.exports = router;
