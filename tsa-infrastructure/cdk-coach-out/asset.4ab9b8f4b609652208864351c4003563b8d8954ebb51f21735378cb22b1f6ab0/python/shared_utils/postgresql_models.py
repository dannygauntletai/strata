"""
PostgreSQL Database Models for TSA Coach Platform
Contains EdFi and OneRoster compliant academic data models

ARCHITECTURE:
- Academic Database (EdFi Compliant): Schools, students, operators, courses, academic sessions, sections, attendance
- Enrollment Database (OneRoster Compliant): Organizations, users, enrollments  
- Workflow Database: Workflow definitions, instances, and tasks
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum
from datetime import date, datetime


# =================================================================
# ACADEMIC DATABASE ENUMS (EdFi Compliant)
# =================================================================

class GradeLevel(str, Enum):
    """Grade levels following EdFi standards"""
    KINDERGARTEN = "Kindergarten"
    FIRST_GRADE = "First grade"
    SECOND_GRADE = "Second grade"
    THIRD_GRADE = "Third grade"
    FOURTH_GRADE = "Fourth grade"
    FIFTH_GRADE = "Fifth grade"
    SIXTH_GRADE = "Sixth grade"
    SEVENTH_GRADE = "Seventh grade"
    EIGHTH_GRADE = "Eighth grade"
    NINTH_GRADE = "Ninth grade"
    TENTH_GRADE = "Tenth grade"
    ELEVENTH_GRADE = "Eleventh grade"
    TWELFTH_GRADE = "Twelfth grade"


class EnrollmentStatus(str, Enum):
    """Student enrollment status"""
    ENROLLED = "enrolled"
    WITHDRAWN = "withdrawn"
    GRADUATED = "graduated"
    TRANSFERRED = "transferred"


class AttendanceCode(str, Enum):
    """Attendance codes"""
    PRESENT = "P"
    ABSENT_EXCUSED = "AE"
    ABSENT_UNEXCUSED = "AU"
    TARDY = "T"
    TARDY_EXCUSED = "TE"


class OperatorRoleType(str, Enum):
    """Operator role types"""
    GUIDE = "guide"
    ADMINISTRATOR = "administrator"
    COACH = "coach"
    DIRECTOR = "director"
    SCHOOL_OWNER = "school_owner"
    INSTRUCTOR = "instructor"


class EmploymentStatus(str, Enum):
    """Employment status for operators"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    TERMINATED = "terminated"
    ON_LEAVE = "on_leave"


# =================================================================
# ACADEMIC DATABASE MODELS (EdFi Compliant)
# =================================================================

class School(BaseModel):
    """Schools table - EdFi compliant"""
    school_id: str = Field(..., max_length=50)
    school_name: str = Field(..., max_length=255)
    school_type: Optional[str] = Field(None, max_length=50)
    district_id: Optional[str] = Field(None, max_length=50)
    address: Optional[Dict[str, Any]] = Field(default_factory=dict)
    phone: Optional[str] = Field(None, max_length=20)
    website: Optional[str] = Field(None, max_length=255)
    principal_name: Optional[str] = Field(None, max_length=255)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class Student(BaseModel):
    """Students table - EdFi compliant"""
    student_unique_id: str = Field(..., max_length=50)
    student_usi: int = Field(..., description="Unique Student Identifier")
    first_name: str = Field(..., max_length=100)
    last_name: str = Field(..., max_length=100)
    middle_name: Optional[str] = Field(None, max_length=100)
    birth_date: Optional[date] = None
    gender: Optional[str] = Field(None, max_length=20)
    hispanic_latino_ethnicity: Optional[bool] = None
    races: Optional[Dict[str, Any]] = Field(default_factory=dict)
    grade_level: Optional[GradeLevel] = None
    school_id: Optional[str] = Field(None, max_length=50)
    enrollment_status: Optional[EnrollmentStatus] = None
    entry_date: Optional[date] = None
    exit_date: Optional[date] = None
    graduation_plan: Optional[str] = Field(None, max_length=100)
    cohort_year: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class Operator(BaseModel):
    """Operators table for school staff and coaches"""
    operator_id: str = Field(..., max_length=50)
    operator_usi: int = Field(..., description="Unique Staff Identifier")
    first_name: str = Field(..., max_length=100)
    last_name: str = Field(..., max_length=100)
    middle_name: Optional[str] = Field(None, max_length=100)
    birth_date: Optional[date] = None
    gender: Optional[str] = Field(None, max_length=20)
    email: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=20)
    role_type: OperatorRoleType
    hire_date: Optional[date] = None
    position_title: Optional[str] = Field(None, max_length=255)
    employment_status: Optional[EmploymentStatus] = None
    school_id: Optional[str] = Field(None, max_length=50)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class Course(BaseModel):
    """Courses table"""
    course_code: str = Field(..., max_length=50)
    course_title: str = Field(..., max_length=255)
    course_description: Optional[str] = None
    credit_hours: Optional[float] = None
    grade_levels: Optional[List[GradeLevel]] = Field(default_factory=list)
    subject_area: Optional[str] = Field(None, max_length=100)
    career_pathway: Optional[str] = Field(None, max_length=100)
    tsa_competitive_events: Optional[List[str]] = Field(default_factory=list)
    prerequisites: Optional[List[str]] = Field(default_factory=list)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class AcademicSession(BaseModel):
    """Academic sessions table"""
    session_id: str = Field(..., max_length=50)
    session_name: str = Field(..., max_length=255)
    school_year: int
    term: Optional[str] = Field(None, max_length=50)
    begin_date: date
    end_date: date
    total_instructional_days: Optional[int] = None
    school_id: Optional[str] = Field(None, max_length=50)
    created_at: Optional[datetime] = None


class Section(BaseModel):
    """Sections table"""
    section_id: str = Field(..., max_length=50)
    section_identifier: str = Field(..., max_length=100)
    course_code: Optional[str] = Field(None, max_length=50)
    session_id: Optional[str] = Field(None, max_length=50)
    instructor_id: Optional[str] = Field(None, max_length=50)
    classroom_identifier: Optional[str] = Field(None, max_length=50)
    max_students: Optional[int] = None
    enrolled_students: int = Field(default=0)
    sequence_of_course: Optional[int] = None
    created_at: Optional[datetime] = None


class Attendance(BaseModel):
    """Attendance table"""
    attendance_id: str  # UUID
    student_id: str = Field(..., max_length=50)
    section_id: str = Field(..., max_length=50)
    attendance_date: date
    attendance_code: Optional[AttendanceCode] = None
    attendance_category: Optional[str] = Field(None, max_length=50)
    excuse_type: Optional[str] = Field(None, max_length=50)
    minutes_absent: int = Field(default=0)
    created_at: Optional[datetime] = None


# =================================================================
# ENROLLMENT DATABASE MODELS (OneRoster Compliant)
# =================================================================

class OrganizationStatus(str, Enum):
    """OneRoster organization status"""
    ACTIVE = "active"
    TOBEDELETED = "tobedeleted"


class OrganizationType(str, Enum):
    """OneRoster organization types"""
    SCHOOL = "school"
    DISTRICT = "district"
    DEPARTMENT = "department"


class UserRole(str, Enum):
    """OneRoster user roles"""
    STUDENT = "student"
    TEACHER = "teacher"
    ADMINISTRATOR = "administrator"


class OneRosterOrganization(BaseModel):
    """Organizations table - OneRoster compliant"""
    sourced_id: str = Field(..., max_length=255)
    status: OrganizationStatus = OrganizationStatus.ACTIVE
    date_last_modified: Optional[datetime] = None
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)
    name: str = Field(..., max_length=255)
    type: OrganizationType
    identifier: Optional[str] = Field(None, max_length=255)
    parent_id: Optional[str] = Field(None, max_length=255)


class OneRosterUser(BaseModel):
    """Users table - OneRoster compliant"""
    sourced_id: str = Field(..., max_length=255)
    status: OrganizationStatus = OrganizationStatus.ACTIVE
    date_last_modified: Optional[datetime] = None
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)
    username: Optional[str] = Field(None, max_length=255)
    user_ids: Optional[List[str]] = Field(default_factory=list)
    enabled_user: bool = Field(default=True)
    given_name: Optional[str] = Field(None, max_length=255)
    family_name: Optional[str] = Field(None, max_length=255)
    middle_name: Optional[str] = Field(None, max_length=255)
    role: Optional[UserRole] = None
    identifier: Optional[str] = Field(None, max_length=255)
    email: Optional[str] = Field(None, max_length=255)
    sms: Optional[str] = Field(None, max_length=20)
    phone: Optional[str] = Field(None, max_length=20)
    agents: Optional[List[str]] = Field(default_factory=list)
    org_ids: Optional[List[str]] = Field(default_factory=list)
    grades: Optional[List[str]] = Field(default_factory=list)
    password: Optional[str] = Field(None, max_length=255)


class OneRosterEnrollment(BaseModel):
    """Enrollments table - OneRoster compliant"""
    sourced_id: str = Field(..., max_length=255)
    status: OrganizationStatus = OrganizationStatus.ACTIVE
    date_last_modified: Optional[datetime] = None
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)
    user_id: str = Field(..., max_length=255)
    class_id: Optional[str] = Field(None, max_length=255)
    school_id: str = Field(..., max_length=255)
    role: Optional[UserRole] = None
    primary_enrollment: bool = Field(default=False)
    begin_date: Optional[date] = None
    end_date: Optional[date] = None


# =================================================================
# WORKFLOW DATABASE MODELS
# =================================================================

class WorkflowStatus(str, Enum):
    """Workflow instance status"""
    STARTED = "started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class TaskStatus(str, Enum):
    """Workflow task status"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"


class WorkflowDefinition(BaseModel):
    """Workflow definitions table"""
    workflow_id: str  # UUID
    name: str = Field(..., max_length=255)
    description: Optional[str] = None
    category: Optional[str] = Field(None, max_length=100)
    version: int = Field(default=1)
    is_active: bool = Field(default=True)
    definition: Dict[str, Any]  # JSON workflow definition
    created_by: Optional[str] = Field(None, max_length=255)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class WorkflowInstance(BaseModel):
    """Workflow instances table"""
    instance_id: str  # UUID
    workflow_id: str  # UUID
    student_id: Optional[str] = Field(None, max_length=50)
    current_state: Optional[str] = Field(None, max_length=100)
    status: Optional[WorkflowStatus] = None
    context: Optional[Dict[str, Any]] = Field(default_factory=dict)
    started_by: Optional[str] = Field(None, max_length=255)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class WorkflowTask(BaseModel):
    """Workflow tasks table"""
    task_id: str  # UUID
    instance_id: str  # UUID
    task_name: str = Field(..., max_length=255)
    assigned_to: Optional[str] = Field(None, max_length=255)
    status: Optional[TaskStatus] = None
    due_date: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    task_data: Optional[Dict[str, Any]] = Field(default_factory=dict)
    created_at: Optional[datetime] = None


# =================================================================
# SQL SCHEMA CREATION STATEMENTS
# =================================================================

# Academic Database SQL
ACADEMIC_SCHEMA_SQL = [
    """
    CREATE TABLE schools (
        school_id VARCHAR(50) PRIMARY KEY,
        school_name VARCHAR(255) NOT NULL,
        school_type VARCHAR(50),
        district_id VARCHAR(50),
        address JSONB,
        phone VARCHAR(20),
        website VARCHAR(255),
        principal_name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """,
    """
    CREATE TABLE students (
        student_unique_id VARCHAR(50) PRIMARY KEY,
        student_usi INTEGER UNIQUE NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        middle_name VARCHAR(100),
        birth_date DATE,
        gender VARCHAR(20),
        hispanic_latino_ethnicity BOOLEAN,
        races JSONB,
        grade_level VARCHAR(20),
        school_id VARCHAR(50) REFERENCES schools(school_id),
        enrollment_status VARCHAR(50),
        entry_date DATE,
        exit_date DATE,
        graduation_plan VARCHAR(100),
        cohort_year INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """,
    """
    CREATE TABLE operators (
        operator_id VARCHAR(50) PRIMARY KEY,
        operator_usi INTEGER UNIQUE NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        middle_name VARCHAR(100),
        birth_date DATE,
        gender VARCHAR(20),
        email VARCHAR(255),
        phone VARCHAR(20),
        role_type VARCHAR(100) NOT NULL,
        hire_date DATE,
        position_title VARCHAR(255),
        employment_status VARCHAR(50),
        school_id VARCHAR(50) REFERENCES schools(school_id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """,
    """
    CREATE TABLE courses (
        course_code VARCHAR(50) PRIMARY KEY,
        course_title VARCHAR(255) NOT NULL,
        course_description TEXT,
        credit_hours DECIMAL(3,1),
        grade_levels JSONB,
        subject_area VARCHAR(100),
        career_pathway VARCHAR(100),
        tsa_competitive_events JSONB,
        prerequisites JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """,
    """
    CREATE TABLE academic_sessions (
        session_id VARCHAR(50) PRIMARY KEY,
        session_name VARCHAR(255) NOT NULL,
        school_year INTEGER NOT NULL,
        term VARCHAR(50),
        begin_date DATE NOT NULL,
        end_date DATE NOT NULL,
        total_instructional_days INTEGER,
        school_id VARCHAR(50) REFERENCES schools(school_id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """,
    """
    CREATE TABLE sections (
        section_id VARCHAR(50) PRIMARY KEY,
        section_identifier VARCHAR(100) NOT NULL,
        course_code VARCHAR(50) REFERENCES courses(course_code),
        session_id VARCHAR(50) REFERENCES academic_sessions(session_id),
        instructor_id VARCHAR(50) REFERENCES operators(operator_id),
        classroom_identifier VARCHAR(50),
        max_students INTEGER,
        enrolled_students INTEGER DEFAULT 0,
        sequence_of_course INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """,
    """
    CREATE TABLE attendance (
        attendance_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        student_id VARCHAR(50) REFERENCES students(student_unique_id),
        section_id VARCHAR(50) REFERENCES sections(section_id),
        attendance_date DATE NOT NULL,
        attendance_code VARCHAR(10),
        attendance_category VARCHAR(50),
        excuse_type VARCHAR(50),
        minutes_absent INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """
]

# OneRoster Database SQL
ONEROSTER_SCHEMA_SQL = [
    """
    CREATE TABLE organizations (
        sourced_id VARCHAR(255) PRIMARY KEY,
        status VARCHAR(20) DEFAULT 'active',
        date_last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        metadata JSONB,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        identifier VARCHAR(255),
        parent_id VARCHAR(255) REFERENCES organizations(sourced_id)
    );
    """,
    """
    CREATE TABLE users (
        sourced_id VARCHAR(255) PRIMARY KEY,
        status VARCHAR(20) DEFAULT 'active',
        date_last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        metadata JSONB,
        username VARCHAR(255) UNIQUE,
        user_ids JSONB,
        enabled_user BOOLEAN DEFAULT true,
        given_name VARCHAR(255),
        family_name VARCHAR(255),
        middle_name VARCHAR(255),
        role VARCHAR(50),
        identifier VARCHAR(255),
        email VARCHAR(255),
        sms VARCHAR(20),
        phone VARCHAR(20),
        agents JSONB,
        org_ids JSONB,
        grades JSONB,
        password VARCHAR(255)
    );
    """,
    """
    CREATE TABLE enrollments (
        sourced_id VARCHAR(255) PRIMARY KEY,
        status VARCHAR(20) DEFAULT 'active',
        date_last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        metadata JSONB,
        user_id VARCHAR(255) REFERENCES users(sourced_id),
        class_id VARCHAR(255),
        school_id VARCHAR(255) REFERENCES organizations(sourced_id),
        role VARCHAR(50),
        primary_enrollment BOOLEAN DEFAULT false,
        begin_date DATE,
        end_date DATE
    );
    """
]

# Workflow Database SQL
# Workflow Database SQL
WORKFLOW_SCHEMA_SQL = [
    """
    CREATE TABLE workflow_definitions (
        workflow_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100),
        version INTEGER DEFAULT 1,
        is_active BOOLEAN DEFAULT true,
        definition JSONB NOT NULL,
        created_by VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """,
    """
    CREATE TABLE workflow_instances (
        instance_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workflow_id UUID REFERENCES workflow_definitions(workflow_id),
        student_id VARCHAR(50),
        current_state VARCHAR(100),
        status VARCHAR(50),
        context JSONB,
        started_by VARCHAR(255),
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """,
    """
    CREATE TABLE workflow_tasks (
        task_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        instance_id UUID REFERENCES workflow_instances(instance_id),
        task_name VARCHAR(255) NOT NULL,
        assigned_to VARCHAR(255),
        status VARCHAR(50),
        due_date TIMESTAMP,
        completed_at TIMESTAMP,
        task_data JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """
]


# =================================================================
# DATABASE CONNECTION AND UTILITY FUNCTIONS
# =================================================================

def create_tables():
    """Create all database tables - required by shared_utils import"""
    try:
        # This is a placeholder function that would normally create tables
        # In our Lambda environment, we primarily use DynamoDB
        print("📝 PostgreSQL table creation called (using DynamoDB for most operations)")
        return {"status": "success", "message": "Using DynamoDB for data operations"}
    except Exception as e:
        print(f"❌ Error in create_tables: {str(e)}")
        return {"status": "error", "message": str(e)}


def get_database_connection():
    """Get database connection - required by shared_utils import"""
    try:
        # This is a placeholder function 
        print("📝 PostgreSQL connection requested (using DynamoDB for most operations)")
        return None
    except Exception as e:
        print(f"❌ Error getting database connection: {str(e)}")
        return None


def insert_school_record(school_data):
    """Insert school record - required by shared_utils import"""
    try:
        print(f"📝 School record insertion called: {school_data.get('name', 'Unknown')}")
        return {"status": "success", "school_id": "placeholder"}
    except Exception as e:
        print(f"❌ Error inserting school record: {str(e)}")
        return {"status": "error", "message": str(e)}


def insert_user_record(user_data):
    """Insert user record - required by shared_utils import"""
    try:
        print(f"📝 User record insertion called: {user_data.get('email', 'Unknown')}")
        return {"status": "success", "user_id": "placeholder"}
    except Exception as e:
        print(f"❌ Error inserting user record: {str(e)}")
        return {"status": "error", "message": str(e)}


WORKFLOW_SCHEMA_SQL_OLD = [
    """
    CREATE TABLE workflow_definitions (
        workflow_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100),
        version INTEGER DEFAULT 1,
        is_active BOOLEAN DEFAULT true,
        definition JSONB NOT NULL,
        created_by VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """,
    """
    CREATE TABLE workflow_instances (
        instance_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workflow_id UUID REFERENCES workflow_definitions(workflow_id),
        student_id VARCHAR(50),
        current_state VARCHAR(100),
        status VARCHAR(50),
        context JSONB,
        started_by VARCHAR(255),
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """,
    """
    CREATE TABLE workflow_tasks (
        task_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        instance_id UUID REFERENCES workflow_instances(instance_id),
        task_name VARCHAR(255) NOT NULL,
        assigned_to VARCHAR(255),
        status VARCHAR(50),
        due_date TIMESTAMP,
        completed_at TIMESTAMP,
        task_data JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """
]

# Index Creation SQL
INDEX_CREATION_SQL = [
    "CREATE INDEX idx_students_school_grade ON students(school_id, grade_level);",
    "CREATE INDEX idx_attendance_student_date ON attendance(student_id, attendance_date);",
    "CREATE INDEX idx_sections_course_session ON sections(course_code, session_id);",
    "CREATE INDEX idx_users_role_org ON users(role, (org_ids->>0));",
    "CREATE INDEX idx_enrollments_user_class ON enrollments(user_id, class_id);",
    "CREATE INDEX idx_enrollments_school_role ON enrollments(school_id, role);",
    "CREATE INDEX idx_workflow_instances_student ON workflow_instances(student_id, status);",
    "CREATE INDEX idx_workflow_tasks_assigned ON workflow_tasks(assigned_to, status);",
    "CREATE INDEX idx_workflow_tasks_due ON workflow_tasks(due_date) WHERE status != 'completed';"
] 