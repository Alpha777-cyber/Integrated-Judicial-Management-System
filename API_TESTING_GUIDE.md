# UBUTABERAhub API Testing Guide
## Complete Postman Collection for All Endpoints

### Base URL
```
http://localhost:5000/api
```

### Authentication Headers
For protected endpoints, include:
```
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

---

## 1. AUTHENTICATION ENDPOINTS
### Base Path: `/api/auth`

#### 1.1 Register New User
```http
POST /api/auth/register
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "password": "SecurePass123!",
  "role": "citizen",
  "phone": "+250788123456",
  "nationalId": "1199080012345678"
}
```

#### 1.2 Login User
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john.doe@example.com",
  "password": "SecurePass123!"
}
```

#### 1.3 Refresh Token
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "your_refresh_token_here"
}
```

#### 1.4 Get Current User
```http
GET /api/auth/me
Authorization: Bearer <token>
```

#### 1.5 Forgot Password
```http
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "john.doe@example.com"
}
```

#### 1.6 Reset Password
```http
POST /api/auth/reset-password
Content-Type: application/json

{
  "token": "reset_token_from_email",
  "password": "NewSecurePass123!"
}
```

#### 1.7 Change Password
```http
POST /api/auth/change-password
Authorization: Bearer <token>
Content-Type: application/json

{
  "currentPassword": "SecurePass123!",
  "newPassword": "NewSecurePass123!"
}
```

#### 1.8 Logout
```http
POST /api/auth/logout
Authorization: Bearer <token>
Content-Type: application/json

{
  "refreshToken": "your_refresh_token_here"
}
```

---

## 2. SECURE AUTH ENDPOINTS (Enhanced Security)
### Base Path: `/api/secure-auth`

#### 2.1 Secure Register
```http
POST /api/secure-auth/register
Content-Type: application/json

{
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane.smith@example.com",
  "password": "SecurePass123!",
  "role": "lawyer",
  "phone": "+250788123457",
  "nationalId": "1199080012345679"
}
```

#### 2.2 Secure Login
```http
POST /api/secure-auth/login
Content-Type: application/json

{
  "email": "jane.smith@example.com",
  "password": "SecurePass123!"
}
```

#### 2.3 Get Current User (Secure)
```http
GET /api/secure-auth/me
Authorization: Bearer <token>
```

#### 2.4 Secure Logout
```http
POST /api/secure-auth/logout
Authorization: Bearer <token>
Content-Type: application/json

{
  "refreshToken": "your_refresh_token_here"
}
```

#### 2.5 Change Password (Secure)
```http
POST /api/secure-auth/change-password
Authorization: Bearer <token>
Content-Type: application/json

{
  "currentPassword": "SecurePass123!",
  "newPassword": "NewSecurePass123!"
}
```

---

## 3. USER MANAGEMENT ENDPOINTS
### Base Path: `/api/users`

#### 3.1 Get User Profile
```http
GET /api/users/profile
Authorization: Bearer <token>
```

#### 3.2 Update User Profile
```http
PUT /api/users/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "firstName": "John Updated",
  "lastName": "Dve Updated",
  "phone": "+250788123458",
  "bio": "Experienced legal professional",
  "experience": "5 years in corporate law",
  "education": "LLB University of Rwanda",
  "specializations": ["corporate law", "contract law"],
  "officeLocation": "Kigali, Rwanda",
  "languages": ["English", "Kinyarwanda", "French"],
  "website": "https://johndoe-law.com",
  "linkedin": "https://linkedin.com/in/johndoe"
}
```

#### 3.3 Upload Profile Photo
```http
POST /api/users/upload-photo
Authorization: Bearer <token>
Content-Type: multipart/form-data

photo: <file>
```

#### 3.4 Get User Statistics (Admin Only)
```http
GET /api/users/stats
Authorization: Bearer <admin_token>
```

#### 3.5 Get All Users (Admin Only)
```http
GET /api/users?page=1&limit=10&role=citizen&status=active&search=john
Authorization: Bearer <admin_token>
```

#### 3.6 Get User by ID (Admin Only)
```http
GET /api/users/60f7b3b3b3b3b3b3b3b3b3b3
Authorization: Bearer <admin_token>
```

#### 3.7 Suspend User (Admin Only)
```http
PUT /api/users/60f7b3b3b3b3b3b3b3b3b3b3/suspend
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "reason": "Violation of terms",
  "duration": 30
}
```

#### 3.8 Unsuspend User (Admin Only)
```http
PUT /api/users/60f7b3b3b3b3b3b3b3b3b3b3/unsuspend
Authorization: Bearer <admin_token>
```

#### 3.9 Delete User (Admin Only)
```http
DELETE /api/users/60f7b3b3b3b3b3b3b3b3b3b3
Authorization: Bearer <admin_token>
```

---

## 4. LAWYER ENDPOINTS
### Base Path: `/api/lawyers`

#### 4.1 Get All Lawyers
```http
GET /api/lawyers?page=1&limit=10&specialization=family%20law&location=kigali
```

#### 4.2 Search Lawyers
```http
GET /api/lawyers/search?q=property%20dispute&specialization=property%20law&location=kigali&minRating=4.5&available=true&page=1&limit=10
```

#### 4.3 Get Lawyer Specializations
```http
GET /api/lawyers/specializations
```

#### 4.4 Get Top Rated Lawyers
```http
GET /api/lawyers/top-rated?limit=10
```

#### 4.5 Get Available Lawyers
```http
GET /api/lawyers/available?date=2024-01-15&startTime=10:00&endTime=11:00&specialization=family%20law
```

#### 4.6 Get Lawyer Statistics (Lawyer Only)
```http
GET /api/lawyers/my-stats
Authorization: Bearer <lawyer_token>
```

#### 4.7 Get Lawyer by ID
```http
GET /api/lawyers/60f7b3b3b3b3b3b3b3b3b3b4
```

#### 4.8 Rate Lawyer
```http
POST /api/lawyers/60f7b3b3b3b3b3b3b3b3b3b4/rate
Authorization: Bearer <citizen_token>
Content-Type: application/json

{
  "rating": 5,
  "review": "Excellent lawyer, very professional",
  "appointmentId": "60f7b3b3b3b3b3b3b3b3b3b6"
}
```

---

## 5. APPOINTMENT ENDPOINTS
### Base Path: `/api/appointments`

#### 5.1 Create Appointment
```http
POST /api/appointments
Authorization: Bearer <citizen_token>
Content-Type: application/json

{
  "lawyerId": "60f7b3b3b3b3b3b3b3b3b3b4",
  "date": "2024-01-15",
  "startTime": "10:00",
  "endTime": "11:00",
  "type": "consultation",
  "description": "Legal consultation for business registration",
  "fee": 50000
}
```

#### 5.2 Get User Appointments
```http
GET /api/appointments?page=1&limit=10&status=pending
Authorization: Bearer <token>
```

#### 5.3 Check Availability
```http
GET /api/appointments/check-availability?lawyerId=60f7b3b3b3b3b3b3b3b3b3b4&date=2024-01-15&startTime=10:00&endTime=10:30
Authorization: Bearer <token>
```

#### 5.4 Get Appointment Statistics
```http
GET /api/appointments/stats
Authorization: Bearer <lawyer_or_admin_token>
```

#### 5.5 Get Appointment by ID
```http
GET /api/appointments/60f7b3b3b3b3b3b3b3b3b3b6
Authorization: Bearer <token>
```

#### 5.6 Update Appointment
```http
PUT /api/appointments/60f7b3b3b3b3b3b3b3b3b3b6
Authorization: Bearer <token>
Content-Type: application/json

{
  "date": "2024-01-16",
  "startTime": "11:00",
  "endTime": "12:00",
  "fee": 60000
}
```

#### 5.7 Update Appointment Status
```http
PUT /api/appointments/60f7b3b3b3b3b3b3b3b3b3b6/status
Authorization: Bearer <lawyer_or_admin_token>
Content-Type: application/json

{
  "status": "confirmed",
  "notes": "Appointment confirmed by lawyer"
}
```

#### 5.8 Add Appointment Note
```http
POST /api/appointments/60f7b3b3b3b3b3b3b3b3b3b6/notes
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Client needs to bring business documents",
  "isPrivate": false
}
```

#### 5.9 Delete Appointment (Admin Only)
```http
DELETE /api/appointments/60f7b3b3b3b3b3b3b3b3b3b6
Authorization: Bearer <admin_token>
```

---

## 6. CASE ENDPOINTS
### Base Path: `/api/cases`

#### 6.1 Create Case
```http
POST /api/cases
Authorization: Bearer <citizen_or_lawyer_token>
Content-Type: application/json

{
  "title": "Business Registration Case",
  "description": "Need assistance with company registration process",
  "type": "business",
  "priority": "medium",
  "clientType": "individual",
  "estimatedDuration": "2 weeks"
}
```

#### 6.2 Get All Cases
```http
GET /api/cases?page=1&limit=10&status=active&type=business
Authorization: Bearer <token>
```

#### 6.3 Get Case by ID
```http
GET /api/cases/60f7b3b3b3b3b3b3b3b3b3b7
Authorization: Bearer <token>
```

#### 6.4 Update Case
```http
PUT /api/cases/60f7b3b3b3b3b3b3b3b3b3b7
Authorization: Bearer <lawyer_or_admin_token>
Content-Type: application/json

{
  "status": "in_progress",
  "description": "Started documentation process",
  "priority": "high"
}
```

#### 6.5 Assign Lawyer to Case
```http
POST /api/cases/60f7b3b3b3b3b3b3b3b3b3b7/assign
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "lawyerId": "60f7b3b3b3b3b3b3b3b3b3b4"
}
```

#### 6.6 Add Case Document
```http
POST /api/cases/60f7b3b3b3b3b3b3b3b3b3b7/documents
Authorization: Bearer <token>
Content-Type: multipart/form-data

document: <file>
description: "Business registration form"
```

---

## 7. UPLOAD ENDPOINTS
### Base Path: `/api/uploads`

#### 7.1 Upload Case Document
```http
POST /api/uploads/case-documents
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <document>
caseId: 60f7b3b3b3b3b3b3b3b3b3b5
description: "Contract agreement"
```

#### 7.2 Upload Multiple Case Documents
```http
POST /api/uploads/case-documents/multiple
Authorization: Bearer <token>
Content-Type: multipart/form-data

files: <documents_array>
caseId: 60f7b3b3b3b3b3b3b3b3b3b5
```

#### 7.3 Upload Appointment Document
```http
POST /api/uploads/appointment-documents
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <document>
appointmentId: 60f7b3b3b3b3b3b3b3b3b3b6
```

#### 7.4 Delete Case Document
```http
DELETE /api/uploads/case-documents/60f7b3b3b3b3b3b3b3b3b3b8
Authorization: Bearer <token>
Content-Type: application/json

{
  "caseId": "60f7b3b3b3b3b3b3b3b3b3b5"
}
```

#### 7.5 Get File Info
```http
GET /api/uploads/file-info?fileUrl=/uploads/case-documents/document.pdf
Authorization: Bearer <token>
```

---

## 8. ADMIN ENDPOINTS
### Base Path: `/api/admin`

#### 8.1 Get Dashboard Statistics
```http
GET /api/admin/dashboard
Authorization: Bearer <admin_token>
```

#### 8.2 Get System Logs
```http
GET /api/admin/logs?page=1&limit=50&level=error
Authorization: Bearer <admin_token>
```

#### 8.3 Get System Health
```http
GET /api/admin/health
Authorization: Bearer <admin_token>
```

#### 8.4 Manage System Settings
```http
PUT /api/admin/settings
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "maintenance": false,
  "registrationEnabled": true,
  "maxFileSize": 10485760,
  "allowedFileTypes": ["pdf", "doc", "docx", "jpg", "png"]
}
```

---

## 9. PROTECTED ENDPOINTS (Testing)
### Base Path: `/api/protected`

#### 9.1 Protected Profile
```http
GET /api/protected/profile
Authorization: Bearer <token>
```

#### 9.2 Admin Only
```http
GET /api/protected/admin-only
Authorization: Bearer <admin_token>
```

#### 9.3 Lawyer or Admin
```http
GET /api/protected/lawyer-or-admin
Authorization: Bearer <lawyer_or_admin_token>
```

#### 9.4 Judge or Admin
```http
GET /api/protected/judge-or-admin
Authorization: Bearer <judge_or_admin_token>
```

#### 9.5 Clerk or Admin
```http
GET /api/protected/clerk-or-admin
Authorization: Bearer <clerk_or_admin_token>
```

#### 9.6 Citizen or Admin
```http
GET /api/protected/citizen-or-admin
Authorization: Bearer <citizen_or_admin_token>
```

#### 9.7 Own Resource Check
```http
GET /api/protected/own-resource/USER_ID
Authorization: Bearer <token>
```

---

## 10. UTILITY ENDPOINTS

#### 10.1 Health Check
```http
GET /api/health
```

#### 10.2 API Documentation
```http
GET /api-docs
```

---

## TESTING SEQUENCE

### 1. Setup Test Users
1. Register admin user
2. Register lawyer user  
3. Register citizen user
4. Login each user to get tokens

### 2. Test Authentication Flow
1. Test registration
2. Test login
3. Test token refresh
4. Test password reset flow
5. Test logout

### 3. Test User Management
1. Test profile updates
2. Test photo uploads
3. Test admin user management

### 4. Test Lawyer Features
1. Test lawyer search
2. Test lawyer ratings
3. Test availability checking

### 5. Test Appointments
1. Create appointments
2. Test availability checking
3. Update appointment status
4. Add notes

### 6. Test Cases
1. Create cases
2. Assign lawyers
3. Upload documents
4. Update case status

### 7. Test File Uploads
1. Upload single files
2. Upload multiple files
3. Delete files
4. Get file info

### 8. Test Admin Functions
1. Dashboard stats
2. System settings
3. User management

---

## RESPONSE FORMATS

### Success Response
```json
{
  "success": true,
  "data": {},
  "message": "Operation successful"
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message",
  "error": "Detailed error info"
}
```

### Validation Error
```json
{
  "success": false,
  "message": "Validation Error",
  "errors": ["Field1 is required", "Field2 is invalid"]
}
```

---

## TIPS FOR TESTING

1. **Save tokens** after login for use in protected endpoints
2. **Test error cases** (invalid data, missing auth, etc.)
3. **Check rate limiting** by making rapid requests
4. **Test file uploads** with various file types and sizes
5. **Verify role-based access** by using different user tokens
6. **Test pagination** on list endpoints
7. **Test search functionality** with various parameters
8. **Check CORS** by making requests from different origins

---

## POSTMAN COLLECTION IMPORT

You can import this as a Postman collection by:
1. Copy the JSON structure below
2. Open Postman
3. Click Import
4. Select "Raw text"
5. Paste the collection JSON
6. Save the collection

This comprehensive guide covers all endpoints in your UBUTABERAhub API! 🚀
