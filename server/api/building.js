const express = require('express');
const { Building } = require('../models');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/db');

const getBuildingHandler = async (req, res) => {
    try {
        const buildings = await Building.findAll({
            attributes : ['uuid', 'building_name'],
            where: {}
        })

        if (!buildings) {
            return res.status(404).json({ error: 'No data found' });
        }

        formattedBuildings = buildings.map(building => ({
            uuid: building.uuid,
            building_name: building.building_name
        }))
        res.status(200).json(formattedBuildings)
    } catch (error) {
        console.error('Error getting buildings:', error);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
}

module.exports = {
    getBuildingHandler
}