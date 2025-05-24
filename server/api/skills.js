const { Skill } = require('../models');

const getSkillHandler = async (req, res) => {
    try {
        const skills = await Skill.findAll({
            attributes: ['uuid', 'name'],
            where: {}
        })

        if (!skills) {
            return res.status(404).json({ error: 'No data found' });
        }

        formattedSkills = skills.map(skill => ({
            uuid: skill.uuid,
            skill_name: skill.name
        }));
        res.status(200).json(formattedSkills);
    } catch (error) {
        console.error('Error getting skills:', error);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
}

module.exports = { getSkillHandler };