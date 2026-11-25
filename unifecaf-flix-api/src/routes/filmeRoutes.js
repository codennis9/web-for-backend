'use strict';

const express = require('express');
const FilmeController = require('../controllers/filmeController');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.get('/filtro/filme', asyncHandler(FilmeController.filtrar));
router.get('/filme/:id', asyncHandler(FilmeController.buscarPorId));
router.get('/filme', asyncHandler(FilmeController.listar));

module.exports = router;
