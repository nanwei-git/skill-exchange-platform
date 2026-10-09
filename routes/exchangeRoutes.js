const express = require('express');
const controller = require('../controllers/exchangeController');
const { requireAuth } = require('../middlewares/auth');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();
router.use(requireAuth);

router.post('/', asyncHandler(controller.create));
router.get('/', asyncHandler(controller.list));
router.get('/:id', asyncHandler(controller.detail));
router.patch('/:id/decision', asyncHandler(controller.decide));
router.post('/:id/confirm', asyncHandler(controller.confirm));
router.delete('/:id', asyncHandler(controller.cancel));

module.exports = router;
