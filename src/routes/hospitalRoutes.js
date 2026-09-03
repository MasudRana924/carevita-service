const express = require('express');
const router = express.Router();
const Hospital = require('../models/Hospital');

router.get('/search', async (req, res) => {
  try {
    const { query, city, district, type, limit } = req.query;

    let hospitals;
    if (query) {
      hospitals = await Hospital.search(query, {
        is_active: true,
        limit: limit || 20
      });
    } else {
      hospitals = await Hospital.findAll({
        is_active: true,
        city,
        district,
        type,
        limit: limit || 20
      });
    }

    res.status(200).json({
      success: true,
      hospitals
    });
  } catch (error) {
    console.error('Search hospitals error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search hospitals'
    });
  }
});

router.get('/nearby', async (req, res) => {
  try {
    const { lat, long, radius, type, limit } = req.query;

    if (!lat || !long) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    const hospitals = await Hospital.findNearby(lat, long, radius || 10, {
      type,
      limit: limit || 10
    });

    res.status(200).json({
      success: true,
      hospitals
    });
  } catch (error) {
    console.error('Get nearby hospitals error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch nearby hospitals'
    });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const hospital = await Hospital.findById(id);

    if (!hospital) {
      return res.status(404).json({
        success: false,
        message: 'Hospital not found'
      });
    }

    res.status(200).json({
      success: true,
      hospital
    });
  } catch (error) {
    console.error('Get hospital error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch hospital'
    });
  }
});

module.exports = router;
