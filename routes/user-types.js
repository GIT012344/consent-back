const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Mock data storage (in-memory)
let mockUserTypes = [
  { id: 1, type_name: 'customer', description: 'ลูกค้าทั่วไป', policy_content: 'นโยบายความเป็นส่วนตัวสำหรับลูกค้า\n\nเราให้ความสำคัญกับข้อมูลส่วนบุคคลของท่าน และมุ่งมั่นที่จะปกป้องความเป็นส่วนตัวของท่าน' },
  { id: 2, type_name: 'employee', description: 'พนักงาน', policy_content: 'นโยบายความเป็นส่วนตัวสำหรับพนักงาน\n\nข้อมูลส่วนบุคคลของพนักงานจะถูกใช้เพื่อการบริหารทรัพยากรบุคคลเท่านั้น' },
  { id: 3, type_name: 'partner', description: 'พาร์ทเนอร์', policy_content: 'นโยบายความเป็นส่วนตัวสำหรับพาร์ทเนอร์\n\nข้อมูลของพาร์ทเนอร์ธุรกิจจะถูกเก็บรักษาอย่างปลอดภัยและใช้เพื่อการดำเนินธุรกิจร่วมกันเท่านั้น' }
];

let nextId = 4;

// GET all user types
router.get('/', async (req, res) => {
  try {
    // Try database first
    const result = await pool.query('SELECT * FROM user_types ORDER BY id');
    
    if (result.rows && result.rows.length > 0) {
      res.json({
        success: true,
        data: result.rows
      });
    } else {
      // Use mock data if database is empty
      res.json({
        success: true,
        data: mockUserTypes
      });
    }
  } catch (error) {
    console.error('Database error, using mock data:', error.message);
    // Return mock data if database fails
    res.json({
      success: true,
      data: mockUserTypes
    });
  }
});

// GET single user type
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await pool.query('SELECT * FROM user_types WHERE id = $1', [id]);
    
    if (result.rows && result.rows.length > 0) {
      res.json({
        success: true,
        data: result.rows[0]
      });
    } else {
      // Try mock data
      const userType = mockUserTypes.find(ut => ut.id === parseInt(id));
      if (userType) {
        res.json({
          success: true,
          data: userType
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'User type not found'
        });
      }
    }
  } catch (error) {
    // Try mock data on error
    const userType = mockUserTypes.find(ut => ut.id === parseInt(id));
    if (userType) {
      res.json({
        success: true,
        data: userType
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'User type not found'
      });
    }
  }
});

// POST create new user type
router.post('/', async (req, res) => {
  const { type_name, description, policy_content } = req.body;
  
  if (!type_name) {
    return res.status(400).json({
      success: false,
      message: 'Type name is required'
    });
  }
  
  try {
    const result = await pool.query(
      'INSERT INTO user_types (type_name, description, policy_content) VALUES ($1, $2, $3) RETURNING *',
      [type_name, description || '', policy_content || '']
    );
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    // Add to mock data if database fails
    const newUserType = {
      id: nextId++,
      type_name,
      description: description || '',
      policy_content: policy_content || ''
    };
    mockUserTypes.push(newUserType);
    
    res.json({
      success: true,
      data: newUserType
    });
  }
});

// Update user type
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { type_name, description, policy_content } = req.body;
  
  try {
    const result = await pool.query(
      'UPDATE user_types SET type_name = $1, description = $2, policy_content = $3 WHERE id = $4 RETURNING *',
      [type_name, description || '', policy_content || '', id]
    );
    
    if (result.rows && result.rows.length > 0) {
      res.json({
        success: true,
        data: result.rows[0]
      });
    } else {
      // Update mock data
      const index = mockUserTypes.findIndex(ut => ut.id === parseInt(id));
      if (index !== -1) {
        mockUserTypes[index] = {
          ...mockUserTypes[index],
          type_name: type_name || mockUserTypes[index].type_name,
          description: description || mockUserTypes[index].description,
          policy_content: policy_content || mockUserTypes[index].policy_content
        };
        res.json({
          success: true,
          data: mockUserTypes[index]
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'User type not found'
        });
      }
    }
  } catch (error) {
    // Update mock data on error
    const index = mockUserTypes.findIndex(ut => ut.id === parseInt(id));
    if (index !== -1) {
      mockUserTypes[index] = {
        ...mockUserTypes[index],
        type_name: type_name || mockUserTypes[index].type_name,
        description: description || mockUserTypes[index].description,
        policy_content: policy_content || mockUserTypes[index].policy_content
      };
      res.json({
        success: true,
        data: mockUserTypes[index]
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'User type not found'
      });
    }
  }
});

// Delete user type
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await pool.query('DELETE FROM user_types WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows && result.rows.length > 0) {
      res.json({
        success: true,
        message: 'User type deleted successfully'
      });
    } else {
      // Delete from mock data
      const index = mockUserTypes.findIndex(ut => ut.id === parseInt(id));
      if (index !== -1) {
        mockUserTypes.splice(index, 1);
        res.json({
          success: true,
          message: 'User type deleted successfully'
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'User type not found'
        });
      }
    }
  } catch (error) {
    // Delete from mock data on error
    const index = mockUserTypes.findIndex(ut => ut.id === parseInt(id));
    if (index !== -1) {
      mockUserTypes.splice(index, 1);
      res.json({
        success: true,
        message: 'User type deleted successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'User type not found'
      });
    }
  }
});

module.exports = router;
