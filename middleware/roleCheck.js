// Middleware to check user role permissions
const checkUserRole = (allowedRoles) => {
  return (req, res, next) => {
    const userType = req.body.userType || req.query.userType || req.params.userType;
    
    if (!userType) {
      return res.status(400).json({
        success: false,
        message: 'User type is required'
      });
    }
    
    if (!allowedRoles.includes(userType)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. This action is only allowed for: ${allowedRoles.join(', ')}`,
        userType: userType
      });
    }
    
    req.userType = userType;
    next();
  };
};

// Validate that user can only submit consent for their role
const validateConsentRole = async (req, res, next) => {
  const { userType, consentVersionId } = req.body;
  
  if (!userType) {
    return res.status(400).json({
      success: false,
      message: 'User type is required for consent submission'
    });
  }
  
  // Add userType to request for later use
  req.validatedUserType = userType;
  
  // If consentVersionId is provided, verify it matches the user type
  if (consentVersionId) {
    const { pool } = require('../config/database');
    
    try {
      const result = await pool.query(
        'SELECT user_type FROM consent_versions WHERE id = $1',
        [consentVersionId]
      );
      
      if (result.rows.length > 0) {
        const versionUserType = result.rows[0].user_type;
        
        // Check if version is specifically for this user type
        if (versionUserType && versionUserType !== userType) {
          return res.status(403).json({
            success: false,
            message: `This consent version is for ${versionUserType} only. You are submitting as ${userType}.`,
            allowedType: versionUserType,
            submittedType: userType
          });
        }
      }
    } catch (error) {
      console.error('Error checking consent version role:', error);
      // Continue even if check fails - don't block submission
    }
  }
  
  next();
};

module.exports = {
  checkUserRole,
  validateConsentRole
};
