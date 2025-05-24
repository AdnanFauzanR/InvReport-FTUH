const express = require('express');
const router = express.Router();
const { getSkillHandler } = require('../api/skills');

router.get('/list-skill', getSkillHandler);

module.exports = router;