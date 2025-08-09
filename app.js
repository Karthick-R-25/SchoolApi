
require('dotenv').config();


const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { body, validationResult } = require('express-validator');


const pool = require('./db'); 

const app = express();
const router = express.Router();
const PORT = process.env.PORT || 3000;


app.use(bodyParser.json()); 
app.use(express.json());
app.use(cors());
app.use(express.urlencoded({ extended: true }));



// POST method for adding School
router.post(
  '/addSchool',
  [
    body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 255 }),
    body('address').trim().notEmpty().withMessage('Address is required').isLength({ max: 500 }),
    body('latitude').notEmpty().withMessage('Latitude is required').isFloat({ min: -90, max: 90 }),
    body('longitude').notEmpty().withMessage('Longitude is required').isFloat({ min: -180, max: 180 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      
      console.warn('Validation failed for addSchool:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, address, latitude, longitude } = req.body;

    try {
      const [result] = await pool.execute(
        'INSERT INTO schools (name, address, latitude, longitude) VALUES (?, ?, ?, ?)',
        [name, address, latitude, longitude]
      );
      res.status(201).json({
        success: true,
        id: result.insertId,
        message: 'School successfully added'
      });
    } catch (err) {
      console.error('Insert error:', err.message);
      res.status(500).json({ error: 'Something went wrong while adding school' });
    }
  }
);

// GET method for list the School details
router.get('/listSchools', async (req, res) => {
  let { latitude, longitude, limit } = req.query;

  
  latitude = parseFloat(latitude);
  longitude = parseFloat(longitude);
  limit = limit ? parseInt(limit, 10) : 10; 

  
  if (isNaN(latitude) || latitude < -90 || latitude > 90) {
    return res.status(400).json({ error: 'Latitude must be between -90 and 90' });
  }
  if (isNaN(longitude) || longitude < -180 || longitude > 180) {
    return res.status(400).json({ error: 'Longitude must be between -180 and 180' });
  }
  if (isNaN(limit) || limit <= 0 || limit > 100) {
    limit = 10;
  }

  try {
    const [rows] = await pool.query(
      `SELECT 
        id,
        name,
        address,
        latitude,
        longitude,
        (6371 * ACOS(
          COS(RADIANS(?)) * COS(RADIANS(latitude)) *
          COS(RADIANS(longitude) - RADIANS(?)) +
          SIN(RADIANS(?)) * SIN(RADIANS(latitude))
        )) AS distance_km
       FROM schools
       ORDER BY distance_km ASC
       LIMIT ?`,
      [latitude, longitude, latitude, limit]
    );

    res.json({
      success: true,
      total: rows.length,
      schools: rows
    });
  } catch (err) {
    console.error('Error fetching schools:', err.message);
    res.status(500).json({ error: 'Could not fetch school list' });
  }
});

router.get('/', (req, res) => {
  res.send('School API is running');
});


app.use('/', router);


app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
