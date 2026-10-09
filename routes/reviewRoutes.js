const express = require('express');
const controller = require('../controllers/reviewController');
const { requireAuth } = require('../middlewares/auth');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();
router.use(requireAuth);

router.post('/', asyncHandler(controller.create));
router.get('/mine', asyncHandler(controller.mine));

module.exports = router;
