const express = require('express');
const controller = require('../controllers/userController');
const { requireAuth } = require('../middlewares/auth');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

router.put('/profile', requireAuth, asyncHandler(controller.updateProfile));
router.get('/:id/reviews', asyncHandler(controller.getReviews));
router.get('/:id', asyncHandler(controller.getProfile));

module.exports = router;
