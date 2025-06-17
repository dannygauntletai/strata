"""
SQLAlchemy Models for TSA Coach Portal
EdFi and OneRoster compliant database models
"""

from sqlalchemy import (
    Column, Integer, String, Boolean, Date, DateTime, Text, ForeignKey,
    JSON, Index, event, Table
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from datetime import datetime, timezone
from typing import Optional
import uuid

Base = declarative_base()

class TimestampMixin:
    """Mixin for automatic timestamp management"""
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now(), nullable=False)

class EdFiTimestampMixin:
    """EdFi-specific timestamp fields"""
    _last_modified_date = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now())
    _etag = Column(String(50))

# EdFi Models
class School(Base, TimestampMixin, EdFiTimestampMixin):
    """EdFi Schools table"""
    __tablename__ = 'schools'
    
    school_id = Column(Integer, primary_key=True)
    state_organization_id = Column(String(60), nullable=False)
    name_of_institution = Column(String(255), nullable=False)
    short_name_of_institution = Column(String(100))
    web_site = Column(String(255))
    operational_status_descriptor = Column(String(50))
    type_descriptor = Column(String(50))
    charter_status_descriptor = Column(String(50))
    title_i_part_a_school_designation_descriptor = Column(String(50))
    magnet_special_program_emphasis_school_descriptor = Column(String(50))
    administrative_funding_control_descriptor = Column(String(50))
    local_education_agency_id = Column(Integer)
    addresses = Column(JSONB, default=list)
    telephones = Column(JSONB, default=list)
    school_categories = Column(JSONB, default=list)
    grade_levels = Column(JSONB, default=list)
    institution_telephones = Column(JSONB, default=list)
    internet_access_descriptor = Column(String(50))
    
    # Relationships
    student_associations = relationship("StudentSchoolAssociation", back_populates="school")
    
    # Indexes
    __table_args__ = (
        Index('idx_schools_lea', 'local_education_agency_id'),
        Index('idx_schools_state_org', 'state_organization_id'),
        Index('idx_schools_operational_status', 'operational_status_descriptor'),
        Index('idx_schools_type', 'type_descriptor'),
    )

class Student(Base, TimestampMixin, EdFiTimestampMixin):
    """EdFi Students table"""
    __tablename__ = 'students'
    
    student_unique_id = Column(String(50), primary_key=True)
    student_usi = Column(Integer, unique=True, nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    middle_name = Column(String(100))
    generation_code_suffix = Column(String(10))
    maiden_name = Column(String(100))
    birth_date = Column(Date)
    birth_city = Column(String(100))
    birth_state_abbreviation_descriptor = Column(String(50))
    birth_country_descriptor = Column(String(50))
    date_entered_us = Column(Date)
    multiplebirth_status = Column(Boolean)
    birth_sex_descriptor = Column(String(50))
    hispanic_latino_ethnicity = Column(Boolean)
    races = Column(JSONB, default=list)
    person_id = Column(String(50))
    source_system_descriptor = Column(String(50))
    
    # Relationships
    school_associations = relationship("StudentSchoolAssociation", back_populates="student")
    
    # Indexes
    __table_args__ = (
        Index('idx_students_person', 'person_id'),
        Index('idx_students_birth_date', 'birth_date'),
        Index('idx_students_ethnicity', 'hispanic_latino_ethnicity'),
    )

class StudentSchoolAssociation(Base, TimestampMixin, EdFiTimestampMixin):
    """EdFi Student School Associations table"""
    __tablename__ = 'student_school_associations'
    
    student_unique_id = Column(String(50), ForeignKey('students.student_unique_id'), primary_key=True)
    school_id = Column(Integer, ForeignKey('schools.school_id'), primary_key=True)
    entry_date = Column(Date, primary_key=True, nullable=False)
    entry_grade_level_descriptor = Column(String(50))
    entry_grade_level_reason_descriptor = Column(String(50))
    entry_type_descriptor = Column(String(50))
    repeat_grade_indicator = Column(Boolean)
    school_choice_transfer = Column(Boolean)
    exit_withdraw_date = Column(Date)
    exit_withdraw_type_descriptor = Column(String(50))
    primary_school = Column(Boolean, default=True)
    class_of_school_year = Column(Integer)
    school_year = Column(Integer, nullable=False)
    graduation_plan_type_descriptor = Column(String(50))
    graduation_school_year = Column(Integer)
    calendar_code = Column(String(50))
    school_choice_basis_descriptor = Column(String(50))
    
    # Relationships
    student = relationship("Student", back_populates="school_associations")
    school = relationship("School", back_populates="student_associations")
    
    # Indexes
    __table_args__ = (
        Index('idx_student_school_student', 'student_unique_id'),
        Index('idx_student_school_school', 'school_id'),
        Index('idx_student_school_year', 'school_year'),
        Index('idx_student_school_grade', 'entry_grade_level_descriptor'),
        Index('idx_student_school_active', 'school_id', 'school_year', 
              postgresql_where=(exit_withdraw_date == None)),
    )

# OneRoster Models
class Organization(Base):
    """OneRoster Organizations table"""
    __tablename__ = 'organizations'
    
    sourced_id = Column(String(255), primary_key=True)
    status = Column(String(20), default='active')
    date_last_modified = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now())
    model_metadata = Column('metadata', JSONB)
    name = Column(String(255), nullable=False)
    type = Column(String(50), nullable=False)
    identifier = Column(String(255))
    parent_id = Column(String(255), ForeignKey('organizations.sourced_id'))
    
    # Self-referential relationship for hierarchy
    parent = relationship("Organization", remote_side=[sourced_id], backref="children")
    users = relationship("User", back_populates="organizations", secondary="user_organizations")
    
    # Indexes
    __table_args__ = (
        Index('idx_organizations_type', 'type'),
        Index('idx_organizations_parent', 'parent_id'),
        Index('idx_organizations_status', 'status'),
    )

class User(Base, TimestampMixin):
    """OneRoster Users table"""
    __tablename__ = 'users'
    
    sourced_id = Column(String(255), primary_key=True)
    status = Column(String(20), default='active')
    date_last_modified = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now())
    model_metadata = Column('metadata', JSONB)
    username = Column(String(255), unique=True)
    user_ids = Column(JSONB)
    enabled_user = Column(Boolean, default=True)
    given_name = Column(String(255))
    family_name = Column(String(255))
    middle_name = Column(String(255))
    role = Column(String(50), nullable=False)
    identifier = Column(String(255))
    email = Column(String(255))
    sms = Column(String(20))
    phone = Column(String(20))
    birth_date = Column(Date)
    agents = Column(JSONB)
    org_ids = Column(JSONB)
    grades = Column(JSONB)
    password = Column(String(255))
    profile_id = Column(String(255))  # Link back to DynamoDB
    
    # Many-to-many relationship with organizations
    organizations = relationship("Organization", back_populates="users", secondary="user_organizations")
    
    # Indexes
    __table_args__ = (
        Index('idx_users_role_org', 'role', func.jsonb_extract_path_text('org_ids', '0')),
        Index('idx_users_email', 'email'),
        Index('idx_users_status', 'status'),
        Index('idx_users_username', 'username'),
        Index('idx_users_identifier', 'identifier'),
        Index('idx_users_profile_id', 'profile_id'),
    )

# Association table for User-Organization many-to-many relationship
user_organizations = Table(
    'user_organizations',
    Base.metadata,
    Column('user_sourced_id', String(255), ForeignKey('users.sourced_id'), primary_key=True),
    Column('org_sourced_id', String(255), ForeignKey('organizations.sourced_id'), primary_key=True)
)

class ProfileSyncLog(Base, TimestampMixin):
    """Profile synchronization tracking"""
    __tablename__ = 'profile_sync_log'
    
    sync_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    profile_id = Column(String(255), nullable=False)
    user_sourced_id = Column(String(255), ForeignKey('users.sourced_id'))
    sync_type = Column(String(50), nullable=False)
    sync_status = Column(String(20), default='pending')
    sync_data = Column(JSONB)
    error_message = Column(Text)
    completed_at = Column(DateTime(timezone=True))
    
    # Relationship
    user = relationship("User")
    
    # Indexes
    __table_args__ = (
        Index('idx_profile_sync_status', 'sync_status'),
        Index('idx_profile_sync_profile', 'profile_id'),
    )

# Event listeners for automatic timestamp updates
@event.listens_for(School, 'before_update')
@event.listens_for(Student, 'before_update') 
@event.listens_for(StudentSchoolAssociation, 'before_update')
@event.listens_for(Organization, 'before_update')
@event.listens_for(User, 'before_update')
def update_timestamps(mapper, connection, target):
    """Automatically update timestamps on record updates"""
    target.date_last_modified = datetime.now(timezone.utc)
    if hasattr(target, 'updated_at'):
        target.updated_at = datetime.now(timezone.utc)


# ============================================================================
# TSA ADMISSIONS EXTENSIONS
# Extending existing EdFi/OneRoster models for admissions portal functionality
# ============================================================================

class TSAStudentExtension(Base, TimestampMixin, EdFiTimestampMixin):
    """TSA-specific student data extending EdFi Student model for admissions"""
    __tablename__ = 'tsa_student_extensions'
    
    # Primary key links to existing EdFi Student model
    student_unique_id = Column(String(50), ForeignKey('students.student_unique_id'), primary_key=True)
    
    # TSA-specific academic and sports information
    sport_interests = Column(JSONB, default=list, comment='Sports programs student is interested in')
    previous_sports_experience = Column(Text, comment='Description of previous sports experience')
    academic_goals = Column(Text, comment='Student academic goals and aspirations')
    special_needs = Column(Text, comment='Special accommodation needs or considerations')
    
    # Admissions process tracking
    enrollment_status = Column(String(50), default='pending', comment='Current enrollment status')
    shadow_day_completed = Column(Boolean, default=False, comment='Whether student completed shadow day')
    shadow_day_date = Column(Date, comment='Date of completed shadow day')
    shadow_day_notes = Column(Text, comment='Notes from shadow day experience')
    
    # Program assignment
    assigned_program_track = Column(String(100), comment='Assigned sports program track')
    grade_level_at_enrollment = Column(String(50), comment='Grade level when enrolled')
    expected_start_date = Column(Date, comment='Expected enrollment start date')
    
    # Parent engagement tracking
    parent_consultation_completed = Column(Boolean, default=False)
    parent_consultation_date = Column(DateTime(timezone=True))
    parent_consultation_notes = Column(Text)
    
    # Document completion tracking
    required_documents_complete = Column(Boolean, default=False)
    document_completion_date = Column(DateTime(timezone=True))
    missing_documents = Column(JSONB, default=list, comment='List of missing required documents')
    
    # Payment and enrollment completion
    deposit_paid = Column(Boolean, default=False)
    deposit_amount = Column(Integer, comment='Deposit amount in cents')
    deposit_paid_date = Column(DateTime(timezone=True))
    enrollment_completed_date = Column(DateTime(timezone=True))
    
    # Referral and source tracking
    referral_source = Column(String(100), comment='How family heard about TSA')
    referring_coach_id = Column(String(255), comment='Coach who referred this family')
    invitation_id = Column(String(255), comment='Original invitation ID from coach portal')
    
    # Custom fields for flexibility
    custom_data = Column(JSONB, default=dict, comment='Additional custom data as needed')
    
    # Relationships
    student = relationship("Student", backref="tsa_extension")
    
    # Indexes for common queries
    __table_args__ = (
        Index('idx_tsa_student_enrollment_status', 'enrollment_status'),
        Index('idx_tsa_student_shadow_day', 'shadow_day_completed', 'shadow_day_date'),
        Index('idx_tsa_student_coach_referral', 'referring_coach_id'),
        Index('idx_tsa_student_invitation', 'invitation_id'),
        Index('idx_tsa_student_deposit', 'deposit_paid', 'deposit_paid_date'),
        Index('idx_tsa_student_program', 'assigned_program_track'),
        Index('idx_tsa_student_start_date', 'expected_start_date'),
    )


class TSAUserExtension(Base, TimestampMixin):
    """TSA-specific parent/guardian data extending OneRoster User model"""
    __tablename__ = 'tsa_user_extensions'
    
    # Primary key links to existing OneRoster User model
    sourced_id = Column(String(255), ForeignKey('users.sourced_id'), primary_key=True)
    
    # Link to existing DynamoDB profile system
    profile_id = Column(String(255), comment='Links to DynamoDB profiles table')
    
    # Contact and relationship information
    emergency_contact = Column(Boolean, default=False, comment='Is this an emergency contact')
    primary_contact = Column(Boolean, default=False, comment='Is this the primary parent contact')
    relationship_to_student = Column(String(100), comment='Relationship to student (parent, guardian, etc.)')
    secondary_phone = Column(String(20), comment='Secondary phone number')
    work_phone = Column(String(20), comment='Work phone number')
    preferred_contact_method = Column(String(50), default='email', comment='Preferred contact method')
    
    # Communication preferences extending existing OneRoster user data
    communication_preferences = Column(JSONB, default=dict, comment='Communication preferences and settings')
    language_preference = Column(String(10), default='en', comment='Preferred language for communications')
    timezone_preference = Column(String(50), comment='Preferred timezone for scheduling')
    
    # Emergency and medical information
    emergency_contact_name = Column(String(255), comment='Emergency contact person name')
    emergency_contact_phone = Column(String(20), comment='Emergency contact phone number')
    emergency_contact_relationship = Column(String(100), comment='Emergency contact relationship')
    medical_insurance_provider = Column(String(255), comment='Medical insurance provider')
    medical_insurance_policy = Column(String(100), comment='Medical insurance policy number')
    
    # Financial and payment information
    financial_aid_applicant = Column(Boolean, default=False, comment='Applied for financial aid')
    financial_aid_approved = Column(Boolean, default=False, comment='Financial aid approved')
    financial_aid_amount = Column(Integer, comment='Financial aid amount in cents')
    payment_plan_preference = Column(String(50), comment='Preferred payment plan (monthly, quarterly, annual)')
    billing_address = Column(JSONB, comment='Billing address information')
    
    # Engagement and involvement tracking
    volunteer_interest = Column(Boolean, default=False, comment='Interested in volunteering')
    volunteer_skills = Column(JSONB, default=list, comment='Volunteer skills and interests')
    committee_interest = Column(JSONB, default=list, comment='Interested committees or roles')
    previous_tsa_experience = Column(Boolean, default=False, comment='Previous experience with TSA')
    
    # Marketing and consent tracking
    marketing_consent = Column(Boolean, default=False, comment='Consent to marketing communications')
    photo_consent = Column(Boolean, default=False, comment='Consent for student photos')
    data_sharing_consent = Column(Boolean, default=False, comment='Consent for data sharing with partners')
    consent_date = Column(DateTime(timezone=True), comment='Date consents were given')
    
    # Referral and source tracking
    referral_source = Column(String(100), comment='How family heard about TSA')
    referral_details = Column(Text, comment='Additional referral details')
    
    # Custom fields for flexibility
    custom_data = Column(JSONB, default=dict, comment='Additional custom data as needed')
    
    # Relationships
    user = relationship("User", backref="tsa_extension")
    
    # Indexes for common queries
    __table_args__ = (
        Index('idx_tsa_user_profile_id', 'profile_id'),
        Index('idx_tsa_user_primary_contact', 'primary_contact'),
        Index('idx_tsa_user_emergency_contact', 'emergency_contact'),
        Index('idx_tsa_user_financial_aid', 'financial_aid_applicant', 'financial_aid_approved'),
        Index('idx_tsa_user_communication_prefs', 'preferred_contact_method', 'language_preference'),
        Index('idx_tsa_user_volunteer', 'volunteer_interest'),
        Index('idx_tsa_user_consent', 'marketing_consent', 'photo_consent'),
    )


class EnrollmentDocuments(Base, TimestampMixin):
    """Track document submissions for enrollment process"""
    __tablename__ = 'enrollment_documents'
    
    document_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    enrollment_id = Column(String(255), nullable=False, comment='Links to enrollment record')
    student_unique_id = Column(String(50), ForeignKey('students.student_unique_id'), nullable=False)
    
    # Document metadata
    document_type = Column(String(100), nullable=False, comment='Type of document')
    document_name = Column(String(255), nullable=False, comment='Original filename')
    document_size = Column(Integer, comment='File size in bytes')
    content_type = Column(String(100), comment='MIME type')
    
    # Storage information
    s3_bucket = Column(String(255), comment='S3 bucket name')
    s3_key = Column(String(500), comment='S3 object key')
    s3_version_id = Column(String(255), comment='S3 object version for versioning')
    
    # Verification and approval
    verification_status = Column(String(50), default='pending', comment='Document verification status')
    verified_by = Column(String(255), comment='Staff member who verified document')
    verified_date = Column(DateTime(timezone=True), comment='Date document was verified')
    verification_notes = Column(Text, comment='Notes from document verification')
    
    # Document requirements
    is_required = Column(Boolean, default=True, comment='Whether this document is required')
    required_for_step = Column(Integer, comment='Enrollment step that requires this document')
    deadline_date = Column(Date, comment='Deadline for submitting this document')
    
    # Submission tracking
    submitted_by = Column(String(255), comment='Parent/guardian who submitted document')
    submission_method = Column(String(50), default='upload', comment='How document was submitted')
    resubmission_count = Column(Integer, default=0, comment='Number of times document was resubmitted')
    
    # Relationships
    student = relationship("Student")
    
    # Indexes
    __table_args__ = (
        Index('idx_enrollment_docs_enrollment', 'enrollment_id'),
        Index('idx_enrollment_docs_student', 'student_unique_id'),
        Index('idx_enrollment_docs_type', 'document_type'),
        Index('idx_enrollment_docs_status', 'verification_status'),
        Index('idx_enrollment_docs_required', 'is_required', 'required_for_step'),
        Index('idx_enrollment_docs_deadline', 'deadline_date'),
    )


class EnrollmentScheduling(Base, TimestampMixin):
    """Track scheduling for consultations and shadow days"""
    __tablename__ = 'enrollment_scheduling'
    
    scheduling_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    enrollment_id = Column(String(255), nullable=False, comment='Links to enrollment record')
    student_unique_id = Column(String(50), ForeignKey('students.student_unique_id'), nullable=False)
    
    # Scheduling details
    appointment_type = Column(String(100), nullable=False, comment='Type of appointment (consultation, shadow_day)')
    scheduled_date = Column(DateTime(timezone=True), nullable=False, comment='Scheduled appointment date and time')
    duration_minutes = Column(Integer, default=60, comment='Appointment duration in minutes')
    
    # Location and format
    location_type = Column(String(50), comment='In-person, virtual, or phone')
    location_details = Column(Text, comment='Specific location or meeting details')
    meeting_link = Column(String(500), comment='Video meeting link if virtual')
    
    # Staff assignment
    assigned_coach_id = Column(String(255), comment='Coach assigned to this appointment')
    assigned_staff_id = Column(String(255), comment='Additional staff assigned')
    
    # Appointment status
    status = Column(String(50), default='scheduled', comment='Appointment status')
    confirmation_sent = Column(Boolean, default=False, comment='Confirmation email sent')
    reminder_sent = Column(Boolean, default=False, comment='Reminder sent')
    completed = Column(Boolean, default=False, comment='Appointment completed')
    completed_date = Column(DateTime(timezone=True), comment='Date appointment was completed')
    
    # Cancellation and rescheduling
    cancelled = Column(Boolean, default=False, comment='Appointment cancelled')
    cancellation_reason = Column(Text, comment='Reason for cancellation')
    rescheduled_from = Column(UUID(as_uuid=True), ForeignKey('enrollment_scheduling.scheduling_id'), comment='Original appointment if rescheduled')
    rescheduled_to = Column(UUID(as_uuid=True), comment='New appointment if rescheduled')
    
    # Follow-up and notes
    appointment_notes = Column(Text, comment='Notes from the appointment')
    follow_up_required = Column(Boolean, default=False, comment='Follow-up required')
    follow_up_notes = Column(Text, comment='Follow-up notes or tasks')
    
    # Participant information
    attendees = Column(JSONB, default=list, comment='List of attendees with contact info')
    
    # Relationships
    student = relationship("Student")
    original_appointment = relationship("EnrollmentScheduling", remote_side=[scheduling_id], backref="rescheduled_appointments")
    
    # Indexes
    __table_args__ = (
        Index('idx_enrollment_scheduling_enrollment', 'enrollment_id'),
        Index('idx_enrollment_scheduling_student', 'student_unique_id'),
        Index('idx_enrollment_scheduling_date', 'scheduled_date'),
        Index('idx_enrollment_scheduling_type', 'appointment_type'),
        Index('idx_enrollment_scheduling_coach', 'assigned_coach_id'),
        Index('idx_enrollment_scheduling_status', 'status', 'completed'),
        Index('idx_enrollment_scheduling_reminders', 'reminder_sent', 'scheduled_date'),
    )


# Add event listeners for automatic timestamp updates on new models
@event.listens_for(TSAStudentExtension, 'before_update')
@event.listens_for(TSAUserExtension, 'before_update')
@event.listens_for(EnrollmentDocuments, 'before_update')
@event.listens_for(EnrollmentScheduling, 'before_update')
def update_admissions_timestamps(mapper, connection, target):
    """Automatically update timestamps on admissions model updates"""
    if hasattr(target, '_last_modified_date'):
        target._last_modified_date = datetime.now(timezone.utc)
    if hasattr(target, 'updated_at'):
        target.updated_at = datetime.now(timezone.utc) 