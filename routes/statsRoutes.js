const express = require('express');
const controller = require('../controllers/statsController');
const { requireAuth } = require('../middlewares/auth');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();
router.get('/me', requireAuth, asyncHandler(controller.mine));

module.exports = router;
