"""
Utility functions for onboarding aligned with database.md schema
Now using SQLAlchemy for better PostgreSQL integration
"""
import boto3
import json
import os
from datetime import datetime
from typing import Dict, Any, Optional, List
from shared_utils import get_dynamodb_table, get_current_timestamp
from database_models import db_manager


def send_invitation_email(email: str, school_name: str, invitation_id: str) -> bool:
    """Send invitation email to coach"""
    try:
        ses = boto3.client('ses')
        
        subject = f"Join {school_name} as a Coach - TSA Coach Portal"
        
        body = f"""
        Hello,
        
        You've been invited to join {school_name} as a coach on the TSA Coach Portal.
        
        Click the link below to complete your registration:
        https://your-domain.com/onboarding/{invitation_id}
        
        Best regards,
        TSA Coach Portal Team
        """
        
        response = ses.send_email(
            Source=os.environ.get('FROM_EMAIL', 'no-reply@texassportsacademy.com'),
            Destination={'ToAddresses': [email]},
            Message={
                'Subject': {'Data': subject},
                'Body': {'Text': {'Data': body}}
            }
        )
        
        print(f"Email sent successfully to {email}. Message ID: {response['MessageId']}")
        return True
        
    except Exception as e:
        print(f"Error sending email to {email}: {str(e)}")
        return False


def validate_onboarding_data(data: Dict[str, Any]) -> Dict[str, Any]:
    """Validate onboarding wizard data"""
    required_fields = [
        'email',
        'school_name',
        'sport',
        'school_type',           # Critical for school setup
        'grade_levels_served',   # Critical for academic structure
        'role_type',            # Critical for profile setup
        'academic_year'         # Critical for academic sessions
    ]
    
    # Check required fields
    missing_fields = []
    for field in required_fields:
        if field not in data or not data[field]:
            missing_fields.append(field)
    
    if missing_fields:
        return {
            'valid': False,
            'error': f"Missing required fields: {', '.join(missing_fields)}"
        }
    
    # Validate email format
    email = data.get('email', '')
    if '@' not in email or '.' not in email:
        return {
            'valid': False,
            'error': 'Invalid email format'
        }
    
    # Validate sport selection
    valid_sports = ['football', 'basketball', 'baseball', 'soccer', 'track', 'tennis', 'volleyball', 'other']
    sport = data.get('sport', '').lower()
    if sport not in valid_sports:
        return {
            'valid': False,
            'error': f"Invalid sport. Must be one of: {', '.join(valid_sports)}"
        }
    
    # Validate school type
    valid_school_types = ['elementary', 'middle', 'high', 'combined', 'k-12']
    school_type = data.get('school_type', '').lower()
    if school_type not in valid_school_types:
        return {
            'valid': False,
            'error': f"Invalid school type. Must be one of: {', '.join(valid_school_types)}"
        }
    
    # Validate role type (aligned with database.md profile roles)
    valid_role_types = ['school_owner', 'instructor', 'administrator', 'coach', 'director', 'principal', 'counselor']
    role_type = data.get('role_type', '').lower()
    if role_type not in valid_role_types:
        return {
            'valid': False,
            'error': f"Invalid role type. Must be one of: {', '.join(valid_role_types)}"
        }
    
    # Validate grade levels served (must be array and not empty)
    grade_levels = data.get('grade_levels_served', [])
    if not isinstance(grade_levels, list) or len(grade_levels) == 0:
        return {
            'valid': False,
            'error': 'Grade levels served must be specified as a non-empty array'
        }
    
    # Validate academic year format (YYYY-YYYY)
    academic_year = data.get('academic_year', '')
    if not academic_year or len(academic_year) != 9 or academic_year[4] != '-':
        return {
            'valid': False,
            'error': 'Academic year must be in format YYYY-YYYY (e.g., 2024-2025)'
        }
    
    return {'valid': True}


def create_profile(onboarding_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Create a new profile record aligned with database.md schema using SQLAlchemy"""
    try:
        print("Starting profile creation with SQLAlchemy...")
        
        # Create EdFi compliant school record using SQLAlchemy
        school_id = db_manager.create_edfi_school(onboarding_data)
        if not school_id:
            print("Failed to create EdFi school record")
            return None
        
        # Create OneRoster organization using SQLAlchemy
        org_id = db_manager.create_oneroster_organization(onboarding_data, school_id)
        if not org_id:
            print("Failed to create OneRoster organization")
            return None
        
        # Create OneRoster user using SQLAlchemy
        user_id = db_manager.create_oneroster_user(onboarding_data, org_id)
        if not user_id:
            print("Failed to create OneRoster user")
            return None
        
        print(f"PostgreSQL records created successfully: school_id={school_id}, org_id={org_id}, user_id={user_id}")
        
        # Create DynamoDB profile record (per database.md schema)
        profiles_table = get_dynamodb_table(os.environ.get('PROFILES_TABLE', 'profiles'))
        
        profile_id = f"profile_{get_current_timestamp().replace(':', '').replace('-', '')}"
        
        # Extract candidate info for profile fields
        candidate_info = onboarding_data.get('candidate_info', {})
        if isinstance(candidate_info, str):
            candidate_info = json.loads(candidate_info)
        
        # Create profile record aligned with database.md schema
        profile = {
            'profile_id': profile_id,
            'school_id': str(school_id),  # Reference to EdFi school
            'email': onboarding_data['email'],
            
            # Basic profile info (per database.md)
            'first_name': candidate_info.get('firstName', ''),
            'last_name': candidate_info.get('lastName', ''),
            'middle_name': candidate_info.get('middleName', ''),
            'phone': candidate_info.get('phone', ''),
            'birth_date': candidate_info.get('birth_date', ''),
            'gender': candidate_info.get('gender', ''),
            
            # Role and experience (per database.md)
            'role_type': onboarding_data.get('role_type', 'school_owner'),
            'specializations': onboarding_data.get('specializations', []),
            'certification_level': onboarding_data.get('certification_level', 'Master'),
            'years_experience': onboarding_data.get('years_experience', 0),
            
            # Onboarding wizard progress (per database.md)
            'onboarding_progress': {
                'current_step': 10,  # Completed
                'is_completed': True
            },
            
            # Database references (linking to PostgreSQL records)
            'database_references': {
                'school_id': str(school_id),    # EdFi school
                'org_id': org_id,              # OneRoster organization
                'user_id': user_id             # OneRoster user
            },
            
            # School information
            'school_name': onboarding_data['school_name'],
            'school_type': onboarding_data.get('school_type', ''),
            'grade_levels_served': onboarding_data.get('grade_levels_served', []),
            'academic_year': onboarding_data.get('academic_year', '2024-2025'),
            
            # Sports and specializations
            'sport': onboarding_data['sport'],
            'football_type': onboarding_data.get('football_type', ''),
            
            # Student management
            'has_students': onboarding_data.get('has_students', False),
            'estimated_student_count': onboarding_data.get('estimated_student_count', 0),
            'student_grade_levels': onboarding_data.get('student_grade_levels', []),
            'enrollment_capacity': onboarding_data.get('enrollment_capacity', 0),
            
            # Students assigned (initially empty)
            'students_assigned': [],
            
            # Preferences and settings (default values per database.md)
            'preferences': {
                'communication_method': 'email',
                'meeting_frequency': 'weekly',
                'notification_settings': {
                    'email_notifications': True,
                    'sms_notifications': False,
                    'push_notifications': True,
                    'reminder_frequency': 'daily'
                },
                'dashboard_layout': 'cards',
                'timezone': 'America/Chicago'
            },
            
            # Documents and uploads (initially empty)
            'documents': [],
            
            # Location and agreements  
            'has_location': onboarding_data.get('has_location', False),
            'location': onboarding_data.get('location', ''),
            'knows_2hl': onboarding_data.get('knows_2hl', False),
            'platform_agreement': onboarding_data.get('platform_agreement', False),
            'microschool_agreement': onboarding_data.get('microschool_agreement', False),
            
            # Background check and compliance
            'background_check_status': onboarding_data.get('background_check_status', 'pending'),
            'candidate_info': candidate_info,  # Keep full candidate info for compliance
            
            # Timestamps (per database.md)
            'onboarded_date': get_current_timestamp().split('T')[0],
            'created_at': get_current_timestamp(),
            'updated_at': get_current_timestamp()
        }
        
        profiles_table.put_item(Item=profile)
        
        print(f"Profile created successfully: {profile_id}")
        print(f"Linked to school_id: {school_id}, org_id: {org_id}, user_id: {user_id}")
        return profile
        
    except Exception as e:
        print(f"Error creating profile: {str(e)}")
        import traceback
        print(f"Full traceback: {traceback.format_exc()}")
        
        # Graceful fallback - create DynamoDB profile without PostgreSQL integration
        try:
            print("Attempting fallback profile creation (DynamoDB only)...")
            
            profiles_table = get_dynamodb_table(os.environ.get('PROFILES_TABLE', 'profiles'))
            profile_id = f"profile_{get_current_timestamp().replace(':', '').replace('-', '')}"
            
            candidate_info = onboarding_data.get('candidate_info', {})
            if isinstance(candidate_info, str):
                candidate_info = json.loads(candidate_info)
            
            fallback_profile = {
                'profile_id': profile_id,
                'email': onboarding_data['email'],
                'school_name': onboarding_data['school_name'],
                'sport': onboarding_data['sport'],
                'school_type': onboarding_data.get('school_type', ''),
                'role_type': onboarding_data.get('role_type', 'school_owner'),
                'grade_levels_served': onboarding_data.get('grade_levels_served', []),
                'academic_year': onboarding_data.get('academic_year', '2024-2025'),
                'onboarding_progress': {'current_step': 10, 'is_completed': True},
                'database_status': 'postgresql_pending',
                'created_at': get_current_timestamp(),
                'updated_at': get_current_timestamp()
            }
            
            profiles_table.put_item(Item=fallback_profile)
            print(f"Fallback profile created successfully: {profile_id}")
            return fallback_profile
            
        except Exception as fallback_error:
            print(f"Fallback profile creation also failed: {str(fallback_error)}")
        return None


def get_profile_by_email(email: str) -> Optional[Dict[str, Any]]:
    """Get profile by email using email-index GSI (per database.md)"""
    try:
        profiles_table = get_dynamodb_table(os.environ.get('PROFILES_TABLE', 'profiles'))
        
        # Use email-index GSI as defined in database.md
        response = profiles_table.scan(
            FilterExpression='email = :email',
            ExpressionAttributeValues={':email': email}
        )
        
        if response['Items']:
            return response['Items'][0]
        
        return None
        
    except Exception as e:
        print(f"Error retrieving profile by email: {str(e)}")
        return None


def update_invitation_status(invitation_id: str, status: str) -> bool:
    """Update invitation status"""
    try:
        invitations_table = get_dynamodb_table(os.environ.get('INVITATIONS_TABLE', 'coach-invitations'))
        
        invitations_table.update_item(
            Key={'invitation_id': invitation_id},
            UpdateExpression='SET #status = :status, updated_at = :updated_at',
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={
                ':status': status,
                ':updated_at': get_current_timestamp()
            }
        )
        
        return True
        
    except Exception as e:
        print(f"Error updating invitation status: {str(e)}")
        return False 


# Backward compatibility aliases
create_coach_profile = create_profile  # For backward compatibility
get_coach_by_email = get_profile_by_email  # For backward compatibility 