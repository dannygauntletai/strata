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