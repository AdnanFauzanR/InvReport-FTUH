const express = require('express');
const router = express.Router();
const { getBuildingHandler } = require('../api/building');


router.get('/list-building', getBuildingHandler);

module.exports = router;