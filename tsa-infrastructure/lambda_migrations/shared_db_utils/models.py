from sqlalchemy import (
    create_engine, Column, String, DateTime, func, Integer, Boolean, Date, Text, ForeignKey, JSON, Index, event, Table
)
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime, timezone
import uuid

Base = declarative_base()

class User(Base):
    __tablename__ = 'users'
    user_id = Column(String, primary_key=True)
    sourced_id = Column(String, unique=True, nullable=False, default=lambda: str(uuid.uuid4()))
    status = Column(String(20), default='active')
    date_last_modified = Column(DateTime(timezone=True), default=datetime.now(timezone.utc), onupdate=datetime.now(timezone.utc))
    username = Column(String, unique=True)
    email = Column(String, unique=True)
    given_name = Column(String)
    family_name = Column(String)
    role = Column(String(50), nullable=False)


class Organization(Base):
    __tablename__ = 'organizations'
    org_id = Column(String, primary_key=True)
    sourced_id = Column(String, unique=True, nullable=False, default=lambda: str(uuid.uuid4()))
    status = Column(String(20), default='active')
    name = Column(String, nullable=False)
    type = Column(String(50), nullable=False)
    parent_id = Column(String, ForeignKey('organizations.sourced_id'))
    date_last_modified = Column(DateTime(timezone=True), default=datetime.now(timezone.utc), onupdate=datetime.now(timezone.utc))


# Placeholder classes for other models to avoid import errors
class School(Base):
    __tablename__ = 'schools'
    school_id = Column(Integer, primary_key=True)
    name_of_institution = Column(String)

class Student(Base):
    __tablename__ = 'students'
    student_unique_id = Column(String, primary_key=True)
    first_name = Column(String)
    last_name = Column(String)
    
class StudentSchoolAssociation(Base):
    __tablename__ = 'student_school_associations'
    student_school_association_id = Column(Integer, primary_key=True)
    student_unique_id = Column(String, ForeignKey('students.student_unique_id'))
    school_id = Column(Integer, ForeignKey('schools.school_id'))

class ProfileSyncLog(Base):
    __tablename__ = 'profile_sync_logs'
    log_id = Column(Integer, primary_key=True)
    profile_id = Column(String)
    status = Column(String) 