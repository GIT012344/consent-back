@echo off
echo Creating test policies...
echo.

REM Create Thai Customer Policy
curl -X POST http://localhost:3000/api/simple-policy -H "Content-Type: application/json" -d "{\"version\":\"2.0\",\"language\":\"th-TH\",\"userType\":\"customer\",\"title\":\"นโยบายความเป็นส่วนตัว - ลูกค้า\",\"content\":\"<h2>นโยบายความเป็นส่วนตัวสำหรับลูกค้า</h2><p>เราเก็บรวบรวมข้อมูลส่วนบุคคลของคุณเพื่อให้บริการที่ดีที่สุด</p><ul><li>ชื่อ-นามสกุล</li><li>เลขบัตรประชาชน</li><li>อีเมลและเบอร์โทร</li></ul><p>ข้อมูลของคุณจะถูกเก็บรักษาอย่างปลอดภัย</p>\"}"

echo.
echo Thai Customer Policy created!
echo.

REM Create English Customer Policy  
curl -X POST http://localhost:3000/api/simple-policy -H "Content-Type: application/json" -d "{\"version\":\"2.0\",\"language\":\"en-US\",\"userType\":\"customer\",\"title\":\"Privacy Policy - Customers\",\"content\":\"<h2>Privacy Policy for Customers</h2><p>We collect your personal information to provide the best service</p><ul><li>Name and Surname</li><li>ID/Passport</li><li>Email and Phone</li></ul><p>Your data is kept secure</p>\"}"

echo.
echo English Customer Policy created!
echo.

REM Create Thai Employee Policy
curl -X POST http://localhost:3000/api/simple-policy -H "Content-Type: application/json" -d "{\"version\":\"1.5\",\"language\":\"th-TH\",\"userType\":\"employee\",\"title\":\"นโยบายพนักงาน\",\"content\":\"<h2>นโยบายสำหรับพนักงาน</h2><p>ข้อมูลพนักงานจะถูกใช้เพื่อการบริหารงานบุคคลเท่านั้น</p>\"}"

echo.
echo Employee Policy created!
echo.
echo Test URLs:
echo - Thai Customer: http://localhost:3003/consent/customer?lang=th
echo - English Customer: http://localhost:3003/consent/customer?lang=en  
echo - Thai Employee: http://localhost:3003/consent/employee?lang=th
echo.
pause
