"""
Student Creation Module for Parent Enrollment
Creates EdFi-compliant student records in PostgreSQL when enrollment is completed

Integrates with existing DynamoDB enrollment workflow to create permanent student records
following the database schema defined in database_schema.md
"""

import os
import json
import uuid
from datetime import datetime, date, timezone
from typing import Dict, Any, Optional

try:
    from shared_db_utils.database import get_async_db_manager
    from shared_db_utils.models import Student, StudentSchoolAssociation, TSAStudentExtension, User
    from tsa_shared import get_current_timestamp, create_response
    SHARED_UTILS_AVAILABLE = True
except ImportError:
    print("Warning: shared_db_utils not available, falling back to basic functionality")
    SHARED_UTILS_AVAILABLE = False


async def create_edfi_student_from_enrollment(enrollment_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Create EdFi-compliant student record in PostgreSQL from completed enrollment
    
    Args:
        enrollment_data: DynamoDB enrollment record with student information
    
    Returns:
        Dict with success status and created student information
    """
    if not SHARED_UTILS_AVAILABLE:
        return {
            'success': False,
            'error': 'Database utilities not available'
        }
    
    try:
        # Extract student information from enrollment
        student_info = extract_student_info_from_enrollment(enrollment_data)
        
        # Validate required fields for EdFi compliance
        validation = validate_student_data_for_edfi(student_info)
        if not validation['valid']:
            return {
                'success': False,
                'error': f"Student data validation failed: {validation['error']}"
            }
        
        # Create database session
        db_manager = await get_async_db_manager()
        
        try:
            async with db_manager.get_async_session() as session:
                # 1. Create EdFi Student record
                student = await create_edfi_student_record(session, student_info)
                
                # 2. Create Student-School Association
                association = await create_student_school_association(session, student, student_info)
                
                # 3. Create TSA Student Extension with enrollment details
                tsa_extension = await create_tsa_student_extension(session, student, enrollment_data)
                
                # 4. Create OneRoster User record for the student (if needed)
                user_record = await create_oneroster_student_user(session, student, student_info)
                
                # Commit all changes
                await session.commit()
                
                return {
                    'success': True,
                    'student_unique_id': student.student_unique_id,
                    'student_usi': student.student_usi,
                    'school_association_created': True,
                    'tsa_extension_created': True,
                    'user_record_created': user_record is not None,
                    'enrollment_id': enrollment_data.get('enrollment_id'),
                    'created_at': get_current_timestamp()
                }
                
        finally:
            await db_manager.close()
            
    except Exception as e:
        print(f"Error creating EdFi student record: {str(e)}")
        return {
            'success': False,
            'error': f"Failed to create student record: {str(e)}"
        }


def extract_student_info_from_enrollment(enrollment_data: Dict[str, Any]) -> Dict[str, Any]:
    """Extract and format student information from DynamoDB enrollment record"""
    
    # Get student info from enrollment step 4 data
    step_4_data = enrollment_data.get('enrollment_data', {}).get('step_4', {})
    student_info = step_4_data.get('student_info', {})
    
    # Fallback to enrollment-level student data
    if not student_info:
        student_info = {
            'first_name': enrollment_data.get('student_first_name', ''),
            'last_name': enrollment_data.get('student_last_name', ''),
            'grade_level': enrollment_data.get('grade_level', ''),
            'sport_interest': enrollment_data.get('sport_interest', ''),
        }
    
    # Generate EdFi-compliant identifiers
    student_unique_id = generate_student_unique_id(enrollment_data)
    student_usi = generate_student_usi()
    
    return {
        'student_unique_id': student_unique_id,
        'student_usi': student_usi,
        'first_name': student_info.get('first_name', ''),
        'last_name': student_info.get('last_name', ''),
        'middle_name': student_info.get('middle_name', ''),
        'birth_date': parse_birth_date(student_info.get('birth_date')),
        'birth_sex_descriptor': student_info.get('gender', ''),
        'hispanic_latino_ethnicity': student_info.get('hispanic_latino_ethnicity'),
        'races': format_race_data(student_info.get('race', [])),
        'grade_level': normalize_grade_level(student_info.get('grade_level', enrollment_data.get('grade_level', ''))),
        'school_id': get_school_id_from_enrollment(enrollment_data),
        'sport_interests': [enrollment_data.get('sport_interest', '')],
        'enrollment_data': enrollment_data
    }


def validate_student_data_for_edfi(student_info: Dict[str, Any]) -> Dict[str, Any]:
    """Validate student data meets EdFi compliance requirements"""
    
    # Required fields per EdFi specification
    required_fields = ['student_unique_id', 'student_usi', 'first_name', 'last_name']
    
    missing_fields = []
    for field in required_fields:
        if not student_info.get(field):
            missing_fields.append(field)
    
    if missing_fields:
        return {
            'valid': False,
            'error': f"Missing required EdFi fields: {', '.join(missing_fields)}"
        }
    
    # Validate data formats
    if student_info.get('birth_date') and not isinstance(student_info['birth_date'], (date, type(None))):
        return {
            'valid': False,
            'error': 'birth_date must be a valid date object'
        }
    
    if not isinstance(student_info['student_usi'], int):
        return {
            'valid': False,
            'error': 'student_usi must be an integer'
        }
    
    return {'valid': True}


async def create_edfi_student_record(session, student_info: Dict[str, Any]) -> Student:
    """Create EdFi Student record in PostgreSQL"""
    
    student = Student(
        student_unique_id=student_info['student_unique_id'],
        student_usi=student_info['student_usi'],
        first_name=student_info['first_name'],
        last_name=student_info['last_name'],
        middle_name=student_info.get('middle_name'),
        birth_date=student_info.get('birth_date'),
        birth_sex_descriptor=student_info.get('birth_sex_descriptor'),
        hispanic_latino_ethnicity=student_info.get('hispanic_latino_ethnicity'),
        races=student_info.get('races', []),
        source_system_descriptor='TSA_Admissions_Portal'
    )
    
    session.add(student)
    await session.flush()  # Get the ID without committing
    
    print(f"Created EdFi Student record: {student.student_unique_id}")
    return student


async def create_student_school_association(session, student: Student, student_info: Dict[str, Any]) -> StudentSchoolAssociation:
    """Create EdFi Student-School Association record"""
    
    # Get current academic year
    current_year = datetime.now().year
    academic_year = current_year if datetime.now().month >= 8 else current_year - 1
    
    association = StudentSchoolAssociation(
        student_unique_id=student.student_unique_id,
        school_id=student_info['school_id'],
        entry_date=date.today(),
        entry_grade_level_descriptor=student_info.get('grade_level', ''),
        entry_type_descriptor='New student',
        school_year=academic_year,
        primary_school=True
    )
    
    session.add(association)
    await session.flush()
    
    print(f"Created Student-School Association: {student.student_unique_id} -> School {student_info['school_id']}")
    return association


async def create_tsa_student_extension(session, student: Student, enrollment_data: Dict[str, Any]) -> TSAStudentExtension:
    """Create TSA-specific student extension with enrollment details"""
    
    extension = TSAStudentExtension(
        student_unique_id=student.student_unique_id,
        sport_interests=enrollment_data.get('sport_interest', '').split(','),
        enrollment_status='registered',
        assigned_program_track=enrollment_data.get('sport_interest', ''),
        grade_level_at_enrollment=enrollment_data.get('grade_level', ''),
        expected_start_date=parse_start_date(enrollment_data),
        referring_coach_id=enrollment_data.get('coach_id', ''),
        invitation_id=enrollment_data.get('invitation_token', ''),
        parent_consultation_completed=True,
        required_documents_complete=False,
        deposit_paid=False,
        enrollment_completed_date=None,
        custom_data={
            'enrollment_id': enrollment_data.get('enrollment_id'),
            'original_enrollment_data': enrollment_data,
            'admissions_portal_version': 'v3',
            'created_at_step': 4,
            'status': 'student_info_completed'
        }
    )
    
    session.add(extension)
    await session.flush()
    
    print(f"Created TSA Student Extension: {student.student_unique_id}")
    return extension


async def create_oneroster_student_user(session, student: Student, student_info: Dict[str, Any]) -> Optional[User]:
    """Create OneRoster User record for the student"""
    
    try:
        # Generate OneRoster sourced_id
        sourced_id = f"student_{student.student_unique_id}"
        
        user = User(
            sourced_id=sourced_id,
            status='active',
            username=f"{student.first_name.lower()}.{student.last_name.lower()}.{student.student_usi}",
            enabled_user=True,
            given_name=student.first_name,
            family_name=student.last_name,
            middle_name=student.middle_name,
            role='student',  # OneRoster role
            identifier=student.student_unique_id,
            birth_date=student.birth_date,
            org_ids=[f"school_{student_info['school_id']}"],
            grades=[student_info.get('grade_level', '')],
            model_metadata={
                'created_from_admissions': True,
                'student_unique_id': student.student_unique_id,
                'enrollment_source': 'parent_portal'
            }
        )
        
        session.add(user)
        await session.flush()
        
        print(f"Created OneRoster Student User: {sourced_id}")
        return user
        
    except Exception as e:
        print(f"Warning: Failed to create OneRoster user for student {student.student_unique_id}: {str(e)}")
        return None


# Utility functions

def generate_student_unique_id(enrollment_data: Dict[str, Any]) -> str:
    """Generate EdFi-compliant student_unique_id"""
    enrollment_id = enrollment_data.get('enrollment_id', '')
    if enrollment_id.startswith('TSA-ENROLL-'):
        # Extract date and ID parts from enrollment ID
        parts = enrollment_id.split('-')
        if len(parts) >= 4:
            return f"TSA-STU-{parts[2]}-{parts[3]}"
    
    # Fallback to UUID-based ID
    return f"TSA-STU-{str(uuid.uuid4())[:8].upper()}"


def generate_student_usi() -> int:
    """Generate unique EdFi student_usi (integer)"""
    # Use timestamp + random for uniqueness
    import random
    timestamp = int(datetime.now().timestamp())
    random_part = random.randint(100, 999)
    return int(f"{timestamp}{random_part}")


def parse_birth_date(birth_date_str: str) -> Optional[date]:
    """Parse birth date string into date object"""
    if not birth_date_str:
        return None
    
    try:
        # Handle various date formats
        if isinstance(birth_date_str, str):
            # Try ISO format first
            if 'T' in birth_date_str:
                return datetime.fromisoformat(birth_date_str.replace('Z', '+00:00')).date()
            else:
                return datetime.strptime(birth_date_str, '%Y-%m-%d').date()
        elif isinstance(birth_date_str, date):
            return birth_date_str
        elif isinstance(birth_date_str, datetime):
            return birth_date_str.date()
    except Exception as e:
        print(f"Warning: Could not parse birth date '{birth_date_str}': {str(e)}")
    
    return None


def normalize_grade_level(grade_level: str) -> str:
    """Normalize grade level to EdFi standards"""
    if not grade_level:
        return ''
    
    # Map common grade formats to EdFi descriptors
    grade_mapping = {
        'K': 'Kindergarten',
        'kindergarten': 'Kindergarten',
        '1': 'First grade',
        '2': 'Second grade',
        '3': 'Third grade',
        '4': 'Fourth grade',
        '5': 'Fifth grade',
        '6': 'Sixth grade',
        '7': 'Seventh grade',
        '8': 'Eighth grade',
        '9': 'Ninth grade',
        '10': 'Tenth grade',
        '11': 'Eleventh grade',
        '12': 'Twelfth grade'
    }
    
    grade_clean = grade_level.strip().lower()
    return grade_mapping.get(grade_clean, grade_level)


def format_race_data(race_input) -> list:
    """Format race data for EdFi JSONB field"""
    if not race_input:
        return []
    
    if isinstance(race_input, str):
        return [{'race_descriptor': race_input}]
    elif isinstance(race_input, list):
        return [{'race_descriptor': race} for race in race_input if race]
    
    return []


def get_school_id_from_enrollment(enrollment_data: Dict[str, Any]) -> int:
    """Extract school_id from enrollment data"""
    # Try to get from coach info or use default
    school_id = enrollment_data.get('school_id')
    if school_id:
        try:
            return int(school_id)
        except ValueError:
            pass
    
    # Fallback to default school ID (should be configured per environment)
    default_school_id = os.environ.get('DEFAULT_SCHOOL_ID', '1')
    return int(default_school_id)


def parse_start_date(enrollment_data: Dict[str, Any]) -> Optional[date]:
    """Parse expected start date from enrollment data"""
    # Look for start date in step data or use next semester
    step_data = enrollment_data.get('enrollment_data', {})
    start_date_str = step_data.get('expected_start_date')
    
    if start_date_str:
        return parse_birth_date(start_date_str)
    
    # Default to next semester start
    now = datetime.now()
    if now.month <= 6:  # Spring semester
        return date(now.year, 8, 15)  # Fall start
    else:  # Fall semester
        return date(now.year + 1, 1, 15)  # Spring start


# Fallback functions if shared utilities not available
if not SHARED_UTILS_AVAILABLE:
    def get_current_timestamp() -> str:
        return datetime.utcnow().isoformat() + 'Z'
    
    def create_response(status_code: int, body: Dict[str, Any]) -> Dict[str, Any]:
        return {
            'statusCode': status_code,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps(body)
        } 