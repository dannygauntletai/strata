"""
SQLAlchemy models for EdFi and OneRoster compliant database schema
Aligned with database.md specifications for production use
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, JSON, Text, ForeignKey, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker
from sqlalchemy import create_engine, MetaData
from datetime import datetime
from typing import Optional, Dict, Any, List
import os
import json

Base = declarative_base()

class School(Base):
    """EdFi compliant schools table (per database.md)"""
    __tablename__ = 'schools'
    
    school_id = Column(Integer, primary_key=True)
    state_organization_id = Column(String(50), nullable=False)
    name_of_institution = Column(String(255), nullable=False)
    type_descriptor = Column(String(100), nullable=False)
    addresses = Column(JSON, nullable=True)  # EdFi address structure
    telephones = Column(JSON, nullable=True)  # EdFi telephone structure  
    school_categories = Column(JSON, nullable=True)  # EdFi school categories
    grade_levels = Column(JSON, nullable=True)  # EdFi grade level descriptors
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Student(Base):
    """EdFi compliant students table (per database.md)"""
    __tablename__ = 'students'
    
    student_unique_id = Column(String(32), primary_key=True)
    student_usi = Column(Integer, unique=True, nullable=False)
    first_name = Column(String(75), nullable=False)
    middle_name = Column(String(75), nullable=True)
    last_name = Column(String(75), nullable=False)
    generation_code_suffix = Column(String(10), nullable=True)
    maiden_name = Column(String(75), nullable=True)
    birth_date = Column(String(10), nullable=False)  # YYYY-MM-DD format
    birth_city = Column(String(30), nullable=True)
    birth_country_descriptor = Column(String(50), nullable=True)
    birth_state_abbreviation_descriptor = Column(String(50), nullable=True)
    birth_sex_descriptor = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class StudentSchoolAssociation(Base):
    """EdFi compliant student-school associations table (per database.md)"""
    __tablename__ = 'student_school_associations'
    
    student_usi = Column(Integer, ForeignKey('students.student_usi'), primary_key=True)
    school_id = Column(Integer, ForeignKey('schools.school_id'), primary_key=True)
    entry_date = Column(String(10), primary_key=True)  # YYYY-MM-DD format
    entry_grade_level_descriptor = Column(String(50), nullable=False)
    entry_type_descriptor = Column(String(50), nullable=True)
    repeat_grade_indicator = Column(Boolean, nullable=True)
    school_year = Column(Integer, nullable=False)
    school_choice_transfer = Column(Boolean, nullable=True)
    exit_withdraw_date = Column(String(10), nullable=True)  # YYYY-MM-DD format
    exit_withdraw_type_descriptor = Column(String(50), nullable=True)
    residency_status_descriptor = Column(String(50), nullable=True)
    primary_school = Column(Boolean, nullable=True)
    employed_while_enrolled = Column(Boolean, nullable=True)
    class_of_school_year = Column(Integer, nullable=True)
    education_organization_id = Column(Integer, nullable=True)
    calendar_code = Column(String(60), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    student = relationship("Student", backref="school_associations")
    school = relationship("School", backref="student_associations")

class Organization(Base):
    """OneRoster compliant organizations table (per database.md)"""
    __tablename__ = 'organizations'
    
    sourced_id = Column(String(255), primary_key=True)
    status = Column(String(20), default='active')
    date_last_modified = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    name = Column(String(255), nullable=False)
    type = Column(String(50), nullable=False)  # 'school', 'district', 'local', 'state', 'national'
    identifier = Column(String(255), nullable=True)
    parent_sourced_id = Column(String(255), nullable=True)
    model_metadata = Column('metadata', JSON, nullable=True)  # Additional OneRoster metadata

class User(Base):
    """OneRoster compliant users table (per database.md)"""
    __tablename__ = 'users'
    
    sourced_id = Column(String(255), primary_key=True)
    status = Column(String(20), default='active')
    date_last_modified = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    username = Column(String(255), unique=True, nullable=False)
    enabled_user = Column(Boolean, default=True)
    given_name = Column(String(255), nullable=False)
    family_name = Column(String(255), nullable=False)
    middle_name = Column(String(255), nullable=True)
    role = Column(String(50), nullable=False)  # 'administrator', 'aide', 'guardian', 'parent', 'proctor', 'relative', 'student', 'teacher'
    identifier = Column(String(255), nullable=True)
    email = Column(String(255), nullable=True)
    sms = Column(String(255), nullable=True)
    phone = Column(String(255), nullable=True)
    agent_sourced_ids = Column(JSON, nullable=True)  # Array of sourced_id values
    org_ids = Column(JSON, nullable=True)  # Array of organization sourced_id values
    model_metadata = Column('metadata', JSON, nullable=True)  # Additional OneRoster metadata


class DatabaseManager:
    """SQLAlchemy database manager for EdFi/OneRoster operations"""
    
    def __init__(self):
        self.engine = None
        self.Session = None
        self._initialize_connection()
    
    def _initialize_connection(self):
        """Initialize SQLAlchemy connection using AWS Secrets Manager"""
        try:
            # Direct import to avoid circular dependency
            from .shared_utils import get_database_secret
            
            print("🔧 Initializing SQLAlchemy database connection...")
            
            # Test asyncpg import first
            try:
                print("📦 Testing asyncpg import...")
                import asyncpg
                print(f"✅ asyncpg version: {asyncpg.__version__}")
                print("✅ asyncpg import successful")
            except ImportError as import_error:
                print(f"❌ asyncpg import failed: {str(import_error)}")
                raise Exception(f"asyncpg not available: {str(import_error)}")
            except Exception as asyncpg_error:
                print(f"❌ asyncpg error: {str(asyncpg_error)}")
                raise Exception(f"asyncpg issue: {str(asyncpg_error)}")
            
            # Get database credentials
            try:
                print("🔐 Attempting to get database secret from AWS Secrets Manager...")
                db_secret = get_database_secret()
                username = db_secret['username']
                password = db_secret['password']
                print("✅ Successfully retrieved database credentials from Secrets Manager")
            except Exception as e:
                print(f"⚠️ Error getting secrets, using env vars: {str(e)}")
                username = os.environ.get('DB_USER', 'postgres')
                password = os.environ.get('DB_PASSWORD', '')
                print("📝 Using environment variables for database credentials")
            
            # Build connection URL
            host = os.environ.get('DB_HOST')
            database = os.environ.get('DB_NAME', 'tsa_coach')
            port = os.environ.get('DB_PORT', '5432')
            
            print(f"🌐 Connecting to PostgreSQL: host={host}, database={database}, port={port}")
            connection_url = f"postgresql://{username}:{password}@{host}:{port}/{database}"
            
            # Create engine with connection pooling optimized for Lambda
            print("🏗️ Creating SQLAlchemy engine...")
            self.engine = create_engine(
                connection_url,
                pool_pre_ping=True,  # Validate connections before use
                pool_recycle=300,    # Recycle connections every 5 minutes
                echo=False,         # Disable SQL logging for cleaner output
                connect_args={
                    "connect_timeout": 10,
                    "application_name": "tsa_coach_lambda"
                }
            )
            
            # Test the connection
            print("🧪 Testing database connection...")
            with self.engine.connect() as conn:
                result = conn.execute(text("SELECT 1 as test"))
                test_value = result.fetchone()[0]
                print(f"✅ Database connection test successful: {test_value}")
            
            # Create session factory
            self.Session = sessionmaker(bind=self.engine)
            print("🎉 SQLAlchemy database connection initialized successfully")
            
        except Exception as e:
            print(f"💥 Error initializing database connection: {str(e)}")
            import traceback
            print(f"📋 Full traceback: {traceback.format_exc()}")
            self.engine = None
            self.Session = None
            
            # Set a flag to indicate PostgreSQL is unavailable
            print("⚠️ PostgreSQL integration disabled due to connection issues")
            print("📝 Will use DynamoDB fallback for profile creation")
    
    def get_session(self):
        """Get a new database session"""
        if self.Session is None:
            raise Exception("Database not initialized")
        return self.Session()
    
    def create_edfi_school(self, school_data: Dict[str, Any]) -> Optional[int]:
        """Create EdFi compliant school record"""
        session = self.get_session()
        try:
            # Generate school_id
            school_identifier = f"{school_data['school_name']}_{school_data.get('school_state', 'TX')}"
            school_id = abs(hash(school_identifier)) % 1000000
            
            # Create EdFi compliant address structure
            addresses = [{
                "addressTypeDescriptor": "Physical",
                "streetNumberName": school_data.get('school_street', ''),
                "city": school_data.get('school_city', ''),
                "stateAbbreviationDescriptor": school_data.get('school_state', 'TX'),
                "postalCode": school_data.get('school_zip', ''),
                "nameOfCounty": ""
            }]
            
            # Create telephone structure
            telephones = []
            if school_data.get('school_phone'):
                telephones.append({
                    "telephoneNumberTypeDescriptor": "Main",
                    "telephoneNumber": school_data['school_phone']
                })
            
            # Map school type to EdFi descriptor
            type_mapping = {
                'elementary': 'Elementary School',
                'middle': 'Middle School',
                'high': 'High School',
                'combined': 'Combined',
                'k-12': 'Combined'
            }
            
            # Map grade levels to EdFi descriptors
            grade_mapping = {
                'K': 'Kindergarten', '1': 'First grade', '2': 'Second grade',
                '3': 'Third grade', '4': 'Fourth grade', '5': 'Fifth grade',
                '6': 'Sixth grade', '7': 'Seventh grade', '8': 'Eighth grade',
                '9': 'Ninth grade', '10': 'Tenth grade', '11': 'Eleventh grade',
                '12': 'Twelfth grade'
            }
            
            grade_levels = [grade_mapping.get(g, g) for g in school_data.get('grade_levels_served', [])]
            school_categories = [type_mapping.get(school_data.get('school_type', ''), 'Other')]
            
            # Check if school exists, update or create
            existing_school = session.query(School).filter_by(school_id=school_id).first()
            
            if existing_school:
                # Update existing school
                existing_school.name_of_institution = school_data['school_name']
                existing_school.addresses = addresses
                existing_school.telephones = telephones
                existing_school.updated_at = datetime.utcnow()
            else:
                # Create new school
                school = School(
                    school_id=school_id,
                    state_organization_id=f"TX-{school_id}",
                    name_of_institution=school_data['school_name'],
                    type_descriptor=type_mapping.get(school_data.get('school_type', ''), 'Other'),
                    addresses=addresses,
                    telephones=telephones,
                    school_categories=school_categories,
                    grade_levels=grade_levels
                )
                session.add(school)
            
            session.commit()
            print(f"EdFi school created/updated successfully: {school_id}")
            return school_id
            
        except Exception as e:
            session.rollback()
            print(f"Error creating EdFi school: {str(e)}")
            return None
        finally:
            session.close()
    
    def create_oneroster_organization(self, school_data: Dict[str, Any], school_id: int) -> Optional[str]:
        """Create OneRoster compliant organization record"""
        session = self.get_session()
        try:
            sourced_id = f"org_{school_id}"
            
            metadata = {
                "school_type": school_data.get('school_type', ''),
                "grade_levels": school_data.get('grade_levels_served', []),
                "academic_year": school_data.get('academic_year', '')
            }
            
            # Check if organization exists, update or create
            existing_org = session.query(Organization).filter_by(sourced_id=sourced_id).first()
            
            if existing_org:
                # Update existing organization
                existing_org.name = school_data['school_name']
                existing_org.model_metadata = metadata
                existing_org.date_last_modified = datetime.utcnow()
            else:
                # Create new organization
                organization = Organization(
                    sourced_id=sourced_id,
                    name=school_data['school_name'],
                    type='school',
                    identifier=str(school_id),
                    model_metadata=metadata
                )
                session.add(organization)
            
            session.commit()
            print(f"OneRoster organization created/updated successfully: {sourced_id}")
            return sourced_id
            
        except Exception as e:
            session.rollback()
            print(f"Error creating OneRoster organization: {str(e)}")
            return None
        finally:
            session.close()
    
    def create_oneroster_user(self, coach_data: Dict[str, Any], org_id: str) -> Optional[str]:
        """Create OneRoster compliant user record"""
        session = self.get_session()
        try:
            candidate_info = coach_data.get('candidate_info', {})
            if isinstance(candidate_info, str):
                candidate_info = json.loads(candidate_info)
            
            sourced_id = f"user_{abs(hash(coach_data['email']))}_{int(datetime.utcnow().timestamp())}"
            
            metadata = {
                "role_type": coach_data.get('role_type', ''),
                "years_experience": coach_data.get('years_experience', ''),
                "certification_level": coach_data.get('certification_level', ''),
                "specializations": coach_data.get('specializations', [])
            }
            
            # Check if user exists, update or create
            existing_user = session.query(User).filter_by(username=coach_data['email']).first()
            
            if existing_user:
                # Update existing user
                existing_user.email = coach_data['email']
                existing_user.phone = candidate_info.get('phone', '')
                existing_user.model_metadata = metadata
                existing_user.date_last_modified = datetime.utcnow()
                sourced_id = existing_user.sourced_id
            else:
                # Create new user
                user = User(
                    sourced_id=sourced_id,
                    username=coach_data['email'],
                    enabled_user=True,
                    given_name=candidate_info.get('firstName', ''),
                    family_name=candidate_info.get('lastName', ''),
                    middle_name=candidate_info.get('middleName', ''),
                    role='teacher',  # OneRoster role mapping
                    identifier=coach_data['email'],
                    email=coach_data['email'],
                    phone=candidate_info.get('phone', ''),
                    org_ids=[org_id],
                    model_metadata=metadata
                )
                session.add(user)
            
            session.commit()
            print(f"OneRoster user created/updated successfully: {sourced_id}")
            return sourced_id
            
        except Exception as e:
            session.rollback()
            print(f"Error creating OneRoster user: {str(e)}")
            return None
        finally:
            session.close()


# Global database manager instance
db_manager = DatabaseManager() 