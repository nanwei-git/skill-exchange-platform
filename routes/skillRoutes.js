const express = require('express');
const controller = require('../controllers/skillController');
const { requireAuth } = require('../middlewares/auth');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

router.get('/mine', requireAuth, asyncHandler(controller.mine));
router.get('/recommended', requireAuth, asyncHandler(controller.recommended));
router.get('/', asyncHandler(controller.list));
router.get('/:id', asyncHandler(controller.detail));
router.post('/', requireAuth, asyncHandler(controller.create));
router.put('/:id', requireAuth, asyncHandler(controller.update));
router.delete('/:id', requireAuth, asyncHandler(controller.deactivate));

module.exports = router;
