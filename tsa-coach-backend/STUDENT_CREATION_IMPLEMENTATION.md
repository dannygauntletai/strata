# Student Creation Implementation for TSA Parent Portal

## 🚨 Critical Issue Resolved: Database Schema Compliance Gap

### **Problem Identified**
The parent portal enrollment process was **NOT** creating EdFi-compliant student records in PostgreSQL as required by the database schema in `database_schema.md`. Instead, it was only managing workflow data in DynamoDB.

### **Database Schema Requirements vs. Previous Implementation**

#### ✅ **Required (per database_schema.md):**
- **PostgreSQL EdFi Student Model**: `students` table with EdFi-compliant fields
- **PostgreSQL StudentSchoolAssociation**: Links students to schools with enrollment details  
- **PostgreSQL TSAStudentExtension**: TSA-specific enrollment data and tracking
- **OneRoster User Records**: Student user accounts following OneRoster standards
- **DynamoDB**: Operational workflow tracking only

#### ❌ **Previous Implementation Gap:**
- ✅ DynamoDB enrollment workflow tracking
- ✅ Document management and scheduling
- **❌ MISSING: EdFi Student record creation in PostgreSQL**
- **❌ MISSING: StudentSchoolAssociation creation**
- **❌ MISSING: TSAStudentExtension creation**
- **❌ MISSING: OneRoster User creation for students**

---

## ✅ **Solution Implemented**

### **New Architecture: Hybrid PostgreSQL + DynamoDB Student Creation**

When parents complete **Step 4 (Student Information)**, the system now:

1. **✅ DynamoDB Workflow**: Continue managing enrollment process
2. **✅ PostgreSQL EdFi Student**: Create permanent student record
3. **✅ PostgreSQL Association**: Link student to school  
4. **✅ PostgreSQL TSA Extension**: Store TSA-specific enrollment data
5. **✅ OneRoster User**: Create student user account

When parents complete **Step 6 (Payment)**, the system:

1. **✅ Updates Status**: Marks student as fully enrolled
2. **✅ Completes Enrollment**: Finalizes the enrollment process

### **Implementation Details**

#### **1. Student Creation Module (`student_creation.py`)**
```python
async def create_edfi_student_from_enrollment(enrollment_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Create complete EdFi-compliant student record set from enrollment data
    
    Creates:
    - EdFi Student record (students table)
    - Student-School Association (student_school_associations table) 
    - TSA Student Extension (tsa_student_extensions table)
    - OneRoster User record (users table)
    """
```

**Key Features:**
- **EdFi Compliance**: Follows EdFi data standards for student records
- **OneRoster Compliance**: Creates OneRoster user records for students
- **Data Validation**: Validates required fields before creation
- **Error Handling**: Graceful handling with detailed logging
- **Async Support**: Uses SQLAlchemy async for database operations

#### **2. Integration with Parent Enrollment (`handler.py`)**
```python
# CRITICAL: Check if this is step 4 (student information) - CREATE STUDENT RECORDS
if step_number == 4 and STUDENT_CREATION_AVAILABLE:
    # Create EdFi-compliant student records in PostgreSQL
    student_creation_result = create_student_records_sync(updated_enrollment)

# Check if this is step 6 (payment completion) - UPDATE EXISTING STUDENT RECORDS
elif step_number == 6:
    # Update existing student records to mark as fully enrolled
    update_result = update_student_enrollment_status(updated_enrollment, 'enrolled')
```

**Features:**
- **Step 4 Trigger**: Creates student records when student information is completed
- **Step 6 Update**: Marks existing students as fully enrolled after payment
- **Non-Blocking**: Enrollment success doesn't depend on student creation
- **Comprehensive Logging**: Tracks all student creation and update events
- **Fallback Handling**: Works even if student creation module unavailable

### **3. Database Records Created**

#### **EdFi Student Record**
```sql
INSERT INTO students (
    student_unique_id,     -- TSA-STU-20241208-ABC123
    student_usi,           -- 1734555555123 (unique integer)
    first_name,            -- From enrollment data
    last_name,             -- From enrollment data
    birth_date,            -- From step 4 student info
    birth_sex_descriptor,  -- From step 4 student info
    hispanic_latino_ethnicity, -- From step 4 demographics
    races,                 -- From step 4 demographics (JSONB)
    source_system_descriptor -- 'TSA_Admissions_Portal'
)
```

#### **Student-School Association**
```sql
INSERT INTO student_school_associations (
    student_unique_id,            -- Links to student
    school_id,                    -- From enrollment coach data
    entry_date,                   -- Today's date
    entry_grade_level_descriptor, -- From enrollment
    entry_type_descriptor,        -- 'New student'
    school_year,                  -- Current academic year
    primary_school                -- true
)
```

#### **TSA Student Extension**
```sql
INSERT INTO tsa_student_extensions (
    student_unique_id,                -- Links to EdFi student
    sport_interests,                  -- From enrollment
    enrollment_status,                -- 'registered' (step 4), 'enrolled' (step 6)
    assigned_program_track,           -- From sport interest
    grade_level_at_enrollment,        -- From enrollment
    expected_start_date,              -- Calculated from enrollment
    referring_coach_id,               -- From enrollment
    invitation_id,                    -- Original invitation token
    parent_consultation_completed,    -- true (required for step 4)
    required_documents_complete,      -- false (step 5 not yet completed)
    deposit_paid,                     -- false (step 6 not yet completed)
    enrollment_completed_date,        -- null (set when step 6 completed)
    custom_data                       -- Full enrollment data for reference
)
```

#### **OneRoster User Record**
```sql
INSERT INTO users (
    sourced_id,           -- student_{student_unique_id}
    status,               -- 'active'
    username,             -- firstname.lastname.usi
    enabled_user,         -- true
    given_name,           -- From student data
    family_name,          -- From student data
    role,                 -- 'student' (OneRoster role)
    identifier,           -- student_unique_id
    birth_date,           -- From student data
    org_ids,              -- [school_id] (JSONB array)
    grades,               -- [grade_level] (JSONB array)
    model_metadata        -- Creation tracking info
)
```

---

## 📊 **Data Flow Architecture**

```
Parent Enrollment Process:
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   DynamoDB      │    │   PostgreSQL    │    │   OneRoster     │
│   Enrollment    │───▶│   EdFi Student  │───▶│   User Account  │
│   Workflow      │    │   Records       │    │   Management    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                        │                        │
        ▼                        ▼                        ▼
   Workflow Data           Academic Records          User Management
   - Progress tracking     - Student demographics    - Login accounts
   - Document status       - School associations     - Role assignments
   - Payment status        - TSA program data        - Organization links
   - Communication logs    - Academic compliance     - Grade level tracking
```

### **Benefits of Hybrid Architecture**

1. **✅ Compliance**: Meets EdFi and OneRoster requirements
2. **✅ Performance**: DynamoDB for fast workflow operations
3. **✅ Academic Integration**: PostgreSQL for academic data systems
4. **✅ Scalability**: Optimized for both operational and academic workloads
5. **✅ Audit Trail**: Complete tracking across both systems

---

## 🔧 **Technical Implementation Notes**

### **Error Handling Strategy**
- **Non-Blocking**: Enrollment can complete even if student creation fails
- **Comprehensive Logging**: All operations logged for debugging
- **Retry Logic**: Can be run manually if initial creation fails
- **Data Validation**: Pre-validates all required fields

### **ID Generation**
- **student_unique_id**: `TSA-STU-{date}-{shortid}` (e.g., TSA-STU-20241208-ABC123)
- **student_usi**: `{timestamp}{random}` (e.g., 1734555555123)
- **sourced_id**: `student_{student_unique_id}` (OneRoster format)

### **Environment Configuration**
```bash
# Required environment variables for student creation
DEFAULT_SCHOOL_ID=1                    # Fallback school ID
DB_SECRET_ARN=arn:aws:secretsmanager:... # PostgreSQL connection
SQLALCHEMY_DATABASE_URL=postgresql://... # Database connection string
```

### **Deployment**
- **Lambda Function**: Updated `lambda_parent_enrollment` with student creation
- **Dependencies**: Requires SQLAlchemy shared layer for PostgreSQL access
- **Database**: Requires PostgreSQL with EdFi schema tables
- **Permissions**: Lambda needs PostgreSQL and DynamoDB access

---

## 🧪 **Testing Scenarios**

### **Test 1: Complete Enrollment Flow**
1. Parent receives invitation from coach
2. Parent completes all 6 enrollment steps
3. **Expected**: EdFi student records created in PostgreSQL
4. **Verify**: Check `students`, `student_school_associations`, `tsa_student_extensions`, `users` tables

### **Test 2: Partial Enrollment**
1. Parent completes steps 1-5 but not payment
2. **Expected**: No PostgreSQL student records created
3. **Verify**: Only DynamoDB enrollment workflow data exists

### **Test 3: Error Handling**
1. Parent completes step 6 with invalid data
2. **Expected**: Student creation logs error but enrollment still succeeds
3. **Verify**: DynamoDB enrollment marked complete, PostgreSQL creation can be retried

### **Test 4: Data Validation**
1. Missing required student information (name, etc.)
2. **Expected**: Student creation fails with clear error message
3. **Verify**: Error logged with specific missing fields

---

## 📋 **Monitoring & Maintenance**

### **Key Metrics to Monitor**
- **Student Creation Success Rate**: Should be >95%
- **Step 6 Completion to Student Creation Latency**: Should be <30 seconds
- **Data Consistency**: DynamoDB enrollment count vs PostgreSQL student count

### **Troubleshooting Commands**
```bash
# Check student creation logs
aws logs filter-log-events --log-group-name "/aws/lambda/tsa-parent-enrollment-dev" --filter-pattern "student_record_created"

# Verify PostgreSQL student records
SELECT COUNT(*) FROM students WHERE source_system_descriptor = 'TSA_Admissions_Portal';

# Check enrollment completion without student records
SELECT * FROM enrollments WHERE status = 'completed' AND student_records IS NULL;
```

### **Manual Student Creation Recovery**
If student creation fails during enrollment, it can be manually triggered:
```python
# Get enrollment data from DynamoDB
enrollment = get_enrollment_by_id('TSA-ENROLL-20241208-ABC123')

# Manually create student records
result = await create_edfi_student_from_enrollment(enrollment)
```

---

## 🎯 **Next Steps & Enhancements**

### **Phase 1 Complete** ✅
- [x] Basic EdFi student record creation
- [x] Student-school association
- [x] TSA extension data
- [x] OneRoster user creation
- [x] Integration with enrollment workflow

### **Phase 2 Considerations** (Future)
- [ ] **Bulk Student Import**: For existing students
- [ ] **Parent User Creation**: OneRoster parent/guardian records
- [ ] **Academic Schedule Integration**: Course enrollments
- [ ] **Grade Book Integration**: Academic progress tracking
- [ ] **Advanced Demographics**: Extended EdFi demographic data

### **Performance Optimizations** (Future)
- [ ] **Batch Processing**: Multiple students in one transaction
- [ ] **Async Queuing**: Separate student creation from enrollment workflow
- [ ] **Caching**: Reduce duplicate database lookups
- [ ] **Connection Pooling**: Optimize PostgreSQL connections

---

## 📚 **References**
- **Database Schema**: `database_schema.md` - EdFi and OneRoster compliance requirements
- **EdFi Standards**: [Ed-Fi Data Standard](https://www.ed-fi.org/data-standard/)
- **OneRoster Specification**: [OneRoster v1.1](https://www.imsglobal.org/activity/onerosterlis)
- **TSA Architecture**: `PARENT_PORTAL_DEPLOYMENT.md` - Overall portal architecture

---

**Status**: ✅ **IMPLEMENTED AND DEPLOYED**  
**Last Updated**: December 2024  
**Schema Compliance**: ✅ **EdFi + OneRoster Compliant** 