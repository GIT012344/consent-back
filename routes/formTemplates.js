const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// Get all form templates
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM form_templates 
      ORDER BY user_type, created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching form templates:', error);
    res.status(500).json({ error: 'Failed to fetch form templates' });
  }
});

// Get form template by user type
router.get('/user-type/:userType', async (req, res) => {
  try {
    const { userType } = req.params;
    const result = await pool.query(`
      SELECT * FROM form_templates 
      WHERE user_type = $1 AND is_active = true
      ORDER BY created_at DESC
      LIMIT 1
    `, [userType]);
    
    if (result.rows.length === 0) {
      // Return default template if none exists
      const defaultTemplate = getDefaultTemplate(userType);
      return res.json(defaultTemplate);
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching form template:', error);
    res.status(500).json({ error: 'Failed to fetch form template' });
  }
});

// Create new form template
router.post('/', async (req, res) => {
  try {
    const { userType, fields, consentText, language = 'th' } = req.body;
    
    // Deactivate existing templates for this user type
    await pool.query(`
      UPDATE form_templates 
      SET is_active = false 
      WHERE user_type = $1
    `, [userType]);
    
    // Insert new template
    const result = await pool.query(`
      INSERT INTO form_templates (
        user_type, 
        fields, 
        consent_text, 
        language, 
        is_active,
        created_by
      ) VALUES ($1, $2, $3, $4, true, 'admin')
      RETURNING *
    `, [userType, JSON.stringify(fields), consentText, language]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error creating form template:', error);
    res.status(500).json({ error: 'Failed to create form template' });
  }
});

// Update form template
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { fields, consentText, language, isActive } = req.body;
    
    const result = await pool.query(`
      UPDATE form_templates 
      SET 
        fields = $1,
        consent_text = $2,
        language = $3,
        is_active = $4,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *
    `, [JSON.stringify(fields), consentText, language, isActive, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating form template:', error);
    res.status(500).json({ error: 'Failed to update form template' });
  }
});

// Delete form template
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await pool.query('DELETE FROM form_templates WHERE id = $1', [id]);
    
    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Error deleting form template:', error);
    res.status(500).json({ error: 'Failed to delete form template' });
  }
});

// Get default template structure
function getDefaultTemplate(userType) {
  const templates = {
    customer: {
      userType: 'customer',
      fields: [
        { name: 'title', label: 'คำนำหน้า', type: 'select', required: true, options: ['นาย', 'นาง', 'นางสาว', 'อื่นๆ'] },
        { name: 'firstName', label: 'ชื่อ', type: 'text', required: true },
        { name: 'lastName', label: 'นามสกุล', type: 'text', required: true },
        { name: 'idCard', label: 'เลขบัตรประชาชน', type: 'text', required: true, pattern: '[0-9]{13}', placeholder: 'กรอกเลข 13 หลัก' },
        { name: 'email', label: 'อีเมล', type: 'email', required: true },
        { name: 'phone', label: 'เบอร์โทรศัพท์', type: 'tel', required: true, pattern: '[0-9]{10}', placeholder: '0812345678' }
      ],
      consentText: 'ข้าพเจ้ายินยอมให้บริษัทเก็บรวบรวม ใช้ และเปิดเผยข้อมูลส่วนบุคคลของข้าพเจ้าตามวัตถุประสงค์ที่ระบุในนโยบายความเป็นส่วนตัว',
      language: 'th',
      isActive: true
    },
    employee: {
      userType: 'employee',
      fields: [
        { name: 'employeeId', label: 'รหัสพนักงาน', type: 'text', required: true, placeholder: 'EMP001' },
        { name: 'title', label: 'คำนำหน้า', type: 'select', required: true, options: ['นาย', 'นาง', 'นางสาว'] },
        { name: 'firstName', label: 'ชื่อ', type: 'text', required: true },
        { name: 'lastName', label: 'นามสกุล', type: 'text', required: true },
        { name: 'department', label: 'แผนก', type: 'select', required: true, options: ['IT', 'HR', 'Sales', 'Marketing', 'Finance', 'Operations', 'Admin'] },
        { name: 'position', label: 'ตำแหน่ง', type: 'text', required: true },
        { name: 'email', label: 'อีเมลบริษัท', type: 'email', required: true, placeholder: 'name@company.com' },
        { name: 'phone', label: 'เบอร์ภายใน', type: 'tel', required: true, placeholder: 'ext. 1234' },
        { name: 'mobile', label: 'เบอร์มือถือ', type: 'tel', required: false }
      ],
      consentText: 'ข้าพเจ้ายินยอมให้บริษัทเก็บรวบรวม ใช้ และเปิดเผยข้อมูลส่วนบุคคลของข้าพเจ้าเพื่อการบริหารทรัพยากรบุคคล การจ่ายค่าตอบแทน สวัสดิการ และการปฏิบัติตามกฎหมายแรงงาน',
      language: 'th',
      isActive: true
    },
    partner: {
      userType: 'partner',
      fields: [
        { name: 'companyName', label: 'ชื่อบริษัท', type: 'text', required: true },
        { name: 'taxId', label: 'เลขประจำตัวผู้เสียภาษี', type: 'text', required: true, pattern: '[0-9]{13}' },
        { name: 'businessType', label: 'ประเภทธุรกิจ', type: 'select', required: true, options: ['Supplier', 'Distributor', 'Service Provider', 'Consultant', 'Other'] },
        { name: 'title', label: 'คำนำหน้า', type: 'select', required: true, options: ['นาย', 'นาง', 'นางสาว'] },
        { name: 'firstName', label: 'ชื่อผู้ติดต่อ', type: 'text', required: true },
        { name: 'lastName', label: 'นามสกุลผู้ติดต่อ', type: 'text', required: true },
        { name: 'position', label: 'ตำแหน่ง', type: 'text', required: true },
        { name: 'email', label: 'อีเมลผู้ติดต่อ', type: 'email', required: true },
        { name: 'phone', label: 'เบอร์โทรศัพท์', type: 'tel', required: true },
        { name: 'address', label: 'ที่อยู่บริษัท', type: 'textarea', required: true, rows: 3 }
      ],
      consentText: 'ข้าพเจ้าในฐานะตัวแทนบริษัทยินยอมให้เก็บรวบรวม ใช้ และเปิดเผยข้อมูลเพื่อการดำเนินธุรกิจร่วมกัน การติดต่อประสานงาน และการปฏิบัติตามข้อตกลงทางธุรกิจ',
      language: 'th',
      isActive: true
    }
  };
  
  return templates[userType] || templates.customer;
}

module.exports = router;
