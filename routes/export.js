const express = require('express');
const ExcelJS = require('exceljs');
const { pool } = require('../config/database');
const moment = require('moment');

const router = express.Router();

// GET /api/export/excel - Export consent records to Excel
router.get('/excel', async (req, res) => {
  try {
    const searchTerm = req.query.search || '';
    const consentType = req.query.type || '';
    const language = req.query.language || '';
    const startDate = req.query.startDate || '';
    const endDate = req.query.endDate || '';

    // Build WHERE clause (same as in consent list)
    let whereConditions = ['is_active = TRUE'];
    let queryParams = [];
    let paramIndex = 1;

    if (searchTerm) {
      whereConditions.push(`(name_surname LIKE $${paramIndex} OR id_passport LIKE $${paramIndex + 1})`);
      queryParams.push(`%${searchTerm}%`, `%${searchTerm}%`);
      paramIndex += 2;
    }

    if (consentType) {
      whereConditions.push(`consent_type = $${paramIndex}`);
      queryParams.push(consentType);
      paramIndex++;
    }

    if (language) {
      whereConditions.push(`consent_language = $${paramIndex}`);
      queryParams.push(language);
      paramIndex++;
    }

    if (startDate) {
      whereConditions.push(`DATE(created_date) >= $${paramIndex}`);
      queryParams.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      whereConditions.push(`DATE(created_date) <= $${paramIndex}`);
      queryParams.push(endDate);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get all records for export
    const query = `
      SELECT id, title, name_surname, id_passport, created_date, created_time, 
             ip_address, browser, consent_type, consent_language, consent_version, updated_at
      FROM consent_records 
      ${whereClause}
      ORDER BY created_date DESC
    `;
    
    const records = await pool.query(query, queryParams);

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Consent Records');

    // Set up columns
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Title', key: 'title', width: 15 },
      { header: 'Name-Surname', key: 'name_surname', width: 30 },
      { header: 'ID/Passport No.', key: 'id_passport', width: 20 },
      { header: 'Created Date', key: 'created_date', width: 20 },
      { header: 'Created Time', key: 'created_time', width: 15 },
      { header: 'IP Address', key: 'ip_address', width: 20 },
      { header: 'Browser', key: 'browser', width: 50 },
      { header: 'Consent Type', key: 'consent_type', width: 15 },
      { header: 'Language', key: 'consent_language', width: 12 },
      { header: 'Version', key: 'consent_version', width: 12 },
      { header: 'Updated At', key: 'updated_at', width: 20 }
    ];

    // Style the header row
    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '366092' }
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Add data rows
    records.rows.forEach((record, index) => {
      const row = worksheet.addRow({
        id: record.id,
        title: record.title,
        name_surname: record.name_surname,
        id_passport: record.id_passport,
        created_date: moment(record.created_date).format('YYYY-MM-DD HH:mm:ss'),
        created_time: record.created_time,
        ip_address: record.ip_address,
        browser: record.browser,
        consent_type: record.consent_type,
        consent_language: record.consent_language === 'th' ? 'Thai' : 'English',
        consent_version: record.consent_version,
        updated_at: moment(record.updated_at).format('YYYY-MM-DD HH:mm:ss')
      });

      // Alternate row colors
      if (index % 2 === 0) {
        row.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'F8F9FA' }
          };
        });
      }

      // Add borders to all cells
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        cell.alignment = { vertical: 'middle' };
      });
    });

    // Add summary row
    const summaryRow = worksheet.addRow({});
    summaryRow.getCell(1).value = `Total Records: ${records.rows.length}`;
    summaryRow.getCell(1).font = { bold: true };
    summaryRow.getCell(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'E9ECEF' }
    };

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      if (column.key === 'browser') {
        column.width = 50; // Keep browser column wide
      } else {
        let maxLength = 0;
        column.eachCell({ includeEmpty: true }, (cell) => {
          const columnLength = cell.value ? cell.value.toString().length : 10;
          if (columnLength > maxLength) {
            maxLength = columnLength;
          }
        });
        column.width = Math.min(maxLength + 2, 50);
      }
    });

    // Set response headers for file download
    const filename = `consent_records_${moment().format('YYYY-MM-DD_HH-mm-ss')}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Write to response
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Error exporting to Excel:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export data',
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
});

// GET /api/export/csv - Export consent records to CSV
router.get('/csv', async (req, res) => {
  try {
    const searchTerm = req.query.search || '';
    const consentType = req.query.type || '';
    const language = req.query.language || '';
    const startDate = req.query.startDate || '';
    const endDate = req.query.endDate || '';

    // Build WHERE clause (same as above)
    let whereConditions = ['is_active = TRUE'];
    let queryParams = [];
    let paramIndex = 1;

    if (searchTerm) {
      whereConditions.push(`(name_surname LIKE $${paramIndex} OR id_passport LIKE $${paramIndex + 1})`);
      queryParams.push(`%${searchTerm}%`, `%${searchTerm}%`);
      paramIndex += 2;
    }

    if (consentType) {
      whereConditions.push(`consent_type = $${paramIndex}`);
      queryParams.push(consentType);
      paramIndex++;
    }

    if (language) {
      whereConditions.push(`consent_language = $${paramIndex}`);
      queryParams.push(language);
      paramIndex++;
    }

    if (startDate) {
      whereConditions.push(`DATE(created_date) >= $${paramIndex}`);
      queryParams.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      whereConditions.push(`DATE(created_date) <= $${paramIndex}`);
      queryParams.push(endDate);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get all records for export
    const query = `
      SELECT id, title, name_surname, id_passport, created_date, created_time, 
             ip_address, browser, consent_type, consent_language, consent_version, updated_at
      FROM consent_records 
      ${whereClause}
      ORDER BY created_date DESC
    `;
    
    const records = await pool.query(query, queryParams);

    // Create CSV content
    const headers = [
      'ID', 'Title', 'Name-Surname', 'ID/Passport No.', 'Created Date', 'Created Time',
      'IP Address', 'Browser', 'Consent Type', 'Language', 'Version', 'Updated At'
    ];

    let csvContent = headers.join(',') + '\n';

    records.rows.forEach(record => {
      const row = [
        record.id,
        `"${record.title}"`,
        `"${record.name_surname}"`,
        `"${record.id_passport}"`,
        `"${moment(record.created_date).format('YYYY-MM-DD HH:mm:ss')}"`,
        `"${record.created_time}"`,
        `"${record.ip_address}"`,
        `"${record.browser.replace(/"/g, '""')}"`, // Escape quotes in browser string
        `"${record.consent_type}"`,
        `"${record.consent_language === 'th' ? 'Thai' : 'English'}"`,
        `"${record.consent_version}"`,
        `"${moment(record.updated_at).format('YYYY-MM-DD HH:mm:ss')}"`
      ];
      csvContent += row.join(',') + '\n';
    });

    // Set response headers for file download
    const filename = `consent_records_${moment().format('YYYY-MM-DD_HH-mm-ss')}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Add BOM for proper UTF-8 encoding in Excel
    res.write('\uFEFF');
    res.write(csvContent);
    res.end();

  } catch (error) {
    console.error('Error exporting to CSV:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export data',
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
});

// GET /api/export/summary - Get export summary/statistics
router.get('/summary', async (req, res) => {
  try {
    // Get total records
    const totalResult = await pool.query(
      'SELECT COUNT(*) as total FROM consent_records WHERE is_active = TRUE'
    );

    // Get records by date range
    const dateRangeResult = await pool.query(`
      SELECT 
        MIN(created_date) as earliest_record,
        MAX(created_date) as latest_record
      FROM consent_records 
      WHERE is_active = TRUE
    `);

    // Get records by type
    const typeResult = await pool.query(`
      SELECT consent_type, COUNT(*) as count 
      FROM consent_records 
      WHERE is_active = TRUE 
      GROUP BY consent_type
    `);

    // Get records by language
    const languageResult = await pool.query(`
      SELECT consent_language, COUNT(*) as count 
      FROM consent_records 
      WHERE is_active = TRUE 
      GROUP BY consent_language
    `);

    res.json({
      success: true,
      data: {
        totalRecords: parseInt(totalResult.rows[0].total),
        dateRange: {
          earliest: dateRangeResult.rows[0].earliest_record,
          latest: dateRangeResult.rows[0].latest_record
        },
        byType: typeResult.rows,
        byLanguage: languageResult.rows,
        exportFormats: ['excel', 'csv'],
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error getting export summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get export summary',
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
});

module.exports = router;
