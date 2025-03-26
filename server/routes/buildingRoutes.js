const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { getBuildingHandler } = require('../api/building');


router.get('/list-building', getBuildingHandler);

module.exports = router;