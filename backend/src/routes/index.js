const express = require('express');
const router = express.Router();

router.use('/auth', require('./auth'));
router.use('/teachers', require('./teachers'));
router.use('/upload', require('./upload'));
router.use('/stats', require('./stats'));
router.use('/admin', require('./admin'));

module.exports = router;