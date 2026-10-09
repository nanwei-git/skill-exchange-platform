const express = require('express');
const controller = require('../controllers/favoriteController');
const { requireAuth } = require('../middlewares/auth');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();
router.use(requireAuth);

router.get('/', asyncHandler(controller.list));
router.post('/:skillId', asyncHandler(controller.add));
router.delete('/:skillId', asyncHandler(controller.remove));

module.exports = router;
