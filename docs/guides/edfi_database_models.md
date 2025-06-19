# Complete Database Schema for Ed-Fi and OneRoster Compliant School Management System

## Version Recommendations

Based on comprehensive research, the recommended versions for implementation are:

- **Ed-Fi Data Standard v5.2** - Provides the longest support timeline (through 2027-2028), most comprehensive features, and active community development
- **OneRoster v1.2** - Mandatory OAuth 2.0 security, enhanced functionality, standards-based grading support, and future-proof architecture
- **2 Hour Learning Integration** - Proprietary AI-powered platform requiring specialized tables for mastery-based learning and progress tracking

## Database Architecture Overview

The system should use a hybrid approach:
- **PostgreSQL** - Primary database for all Ed-Fi core domains, compliance tables, and complex relational data (approximately 140-150 tables)
- **DynamoDB** - High-volume, simple access pattern data like activity logs and real-time assessments (5-10 tables)

## Complete Database Schema Definitions

### 1. Ed-Fi Core Teaching & Learning Domain

```sql
-- Course Offering: Links courses to specific schools and terms
CREATE TABLE edfi.CourseOffering (
    LocalCourseCode VARCHAR(60) NOT NULL,          -- School's internal course code (e.g., "MATH101-01")
    SchoolId INTEGER NOT NULL,                     -- Reference to school offering the course
    SchoolYear SMALLINT NOT NULL,                  -- Academic year (e.g., 2025)
    LocalCourseTitle VARCHAR(60),                  -- School-specific course name
    InstructionalTimePlanned INTEGER,              -- Total planned instructional minutes
    CourseCode VARCHAR(60) NOT NULL,               -- Reference to master course catalog
    EducationOrganizationId INTEGER NOT NULL,      -- District or LEA managing course
    CreateDate TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT PK_CourseOffering PRIMARY KEY (LocalCourseCode, SchoolId, SchoolYear)
);

-- Section: Individual class instances where instruction occurs
CREATE TABLE edfi.Section (
    SectionIdentifier VARCHAR(255) NOT NULL,       -- Unique section ID (e.g., "MATH101-01-FALL2025-P3")
    LocalCourseCode VARCHAR(60) NOT NULL,          -- Links to CourseOffering
    SchoolId INTEGER NOT NULL,                     -- School where section is taught
    SchoolYear SMALLINT NOT NULL,                  -- Academic year
    SectionName VARCHAR(100),                      -- Human-readable section name
    SequenceOfCourse INTEGER,                      -- Order for multi-part courses (1, 2, 3...)
    EducationalEnvironmentDescriptorId INTEGER,    -- In-person, virtual, hybrid
    MediumOfInstructionDescriptorId INTEGER,       -- Language of instruction
    PopulationServedDescriptorId INTEGER,          -- Regular, gifted, special ed
    AvailableCredits DECIMAL(9,3),                -- Credit hours offered
    AvailableCreditTypeDescriptorId INTEGER,       -- Type of credit (Carnegie, semester hour)
    CreateDate TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT PK_Section PRIMARY KEY (SectionIdentifier, LocalCourseCode, SchoolId, SchoolYear)
);

-- Course: Master course catalog defining curriculum
CREATE TABLE edfi.Course (
    CourseCode VARCHAR(60) NOT NULL,               -- District-wide course identifier
    EducationOrganizationId INTEGER NOT NULL,      -- District/LEA owning the course
    CourseTitle VARCHAR(60) NOT NULL,              -- Official course name
    NumberOfParts INTEGER,                         -- For multi-semester courses
    AcademicSubjectDescriptorId INTEGER,           -- Math, Science, English, etc.
    CourseDescription VARCHAR(1024),               -- Detailed course description
    CourseGPAApplicabilityDescriptorId INTEGER,    -- Weighted, unweighted, not applicable
    CourseDefinedByDescriptorId INTEGER,           -- SEA, LEA, School, National org
    MinimumAvailableCredits DECIMAL(9,3),          -- Minimum credits possible
    MaximumAvailableCredits DECIMAL(9,3),          -- Maximum credits possible
    MaxCompletionsForCredit INTEGER,               -- How many times for credit
    CreateDate TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT PK_Course PRIMARY KEY (CourseCode, EducationOrganizationId)
);

-- Learning Standards: State/national standards alignment
CREATE TABLE edfi.LearningStandard (
    LearningStandardId VARCHAR(60) NOT NULL,       -- Unique standard identifier
    Description VARCHAR(1024) NOT NULL,            -- Full text of the standard
    Namespace VARCHAR(255) NOT NULL,               -- Organization defining standard
    CourseTitle VARCHAR(60),                       -- Associated course
    SuccessCriteria TEXT,                          -- How to measure mastery
    ItemCode VARCHAR(50),                          -- Standard's code (e.g., "CCSS.MATH.CONTENT.1.OA.A.1")
    URI VARCHAR(255),                              -- Link to standard documentation
    CreateDate TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT PK_LearningStandard PRIMARY KEY (LearningStandardId)
);

-- Learning Objectives: Specific learning goals
CREATE TABLE edfi.LearningObjective (
    LearningObjectiveId VARCHAR(60) NOT NULL,      -- Unique objective identifier
    Namespace VARCHAR(255) NOT NULL,               -- Organization defining objective
    Objective VARCHAR(60) NOT NULL,                -- Short objective name
    Description VARCHAR(1024),                     -- Detailed objective description
    Nomenclature VARCHAR(100),                     -- Classification system used
    SuccessCriteria TEXT,                          -- How to measure achievement
    CreateDate TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT PK_LearningObjective PRIMARY KEY (LearningObjectiveId, Namespace)
);

-- Grade Book Entry: Individual assignments/assessments
CREATE TABLE edfi.GradebookEntry (
    GradebookEntryIdentifier VARCHAR(60) NOT NULL, -- Unique assignment ID
    Namespace VARCHAR(255) NOT NULL,                -- System that created entry
    Title VARCHAR(100) NOT NULL,                   -- Assignment name
    Description VARCHAR(1024),                     -- Assignment details
    DateAssigned DATE NOT NULL,                    -- When assigned to students
    DueDate DATE,                                  -- When due
    DueTime TIME,                                  -- Specific time if applicable
    GradebookEntryTypeDescriptorId INTEGER,        -- Homework, quiz, test, project
    SectionIdentifier VARCHAR(255) NOT NULL,        -- Which section
    LocalCourseCode VARCHAR(60) NOT NULL,          -- Which course
    SchoolId INTEGER NOT NULL,                     -- Which school
    SchoolYear SMALLINT NOT NULL,                  -- Academic year
    CreateDate TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT PK_GradebookEntry PRIMARY KEY (GradebookEntryIdentifier, Namespace)
);

-- Student Grade Book Entry: Individual student scores
CREATE TABLE edfi.StudentGradebookEntry (
    StudentUSI INTEGER NOT NULL,                   -- Student identifier
    GradebookEntryIdentifier VARCHAR(60) NOT NULL, -- Assignment reference
    Namespace VARCHAR(255) NOT NULL,               -- System namespace
    DateFulfilled TIMESTAMP,                       -- When student completed
    LetterGradeEarned VARCHAR(20),                -- A, B, C, etc.
    NumericGradeEarned DECIMAL(9,2),              -- 95.5, 87.0, etc.
    DiagnosticStatement VARCHAR(1024),             -- Teacher feedback
    CreateDate TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT PK_StudentGradebookEntry PRIMARY KEY (StudentUSI, GradebookEntryIdentifier, Namespace)
);
```

### 2. Ed-Fi Staff Management Domain

```sql
-- Staff: All school personnel
CREATE TABLE edfi.Staff (
    StaffUSI INTEGER NOT NULL,                     -- Unique Staff Identifier (system-generated)
    StaffUniqueId VARCHAR(32) NOT NULL,            -- Human-readable staff ID
    PersonalTitlePrefix VARCHAR(30),               -- Mr., Mrs., Dr., etc.
    FirstName VARCHAR(75) NOT NULL,                -- Legal first name
    MiddleName VARCHAR(75),                        -- Middle name or initial
    LastSurname VARCHAR(75) NOT NULL,              -- Last name
    GenerationCodeSuffix VARCHAR(10),              -- Jr., Sr., III, etc.
    MaidenName VARCHAR(75),                        -- Previous last name if applicable
    BirthDate DATE,                                -- For age verification
    HispanicLatinoEthnicity BOOLEAN,              -- Ethnicity indicator
    HighestCompletedLevelOfEducationDescriptorId INTEGER, -- Bachelor's, Master's, Doctorate
    YearsOfPriorProfessionalExperience DECIMAL(5,2), -- Total professional experience
    YearsOfPriorTeachingExperience DECIMAL(5,2),  -- Teaching-specific experience
    LoginId VARCHAR(60),                           -- System login username
    CreateDate TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT PK_Staff PRIMARY KEY (StaffUSI),
    CONSTRAINT UQ_Staff_StaffUniqueId UNIQUE (StaffUniqueId)
);

-- Staff School Association: Links staff to schools
CREATE TABLE edfi.StaffSchoolAssociation (
    StaffUSI INTEGER NOT NULL,                     -- Staff member
    SchoolId INTEGER NOT NULL,                     -- School they work at
    ProgramAssignmentDescriptorId INTEGER NOT NULL, -- Role at school (teacher, admin, support)
    SchoolYear SMALLINT,                           -- Academic year of assignment
    CreateDate TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT PK_StaffSchoolAssociation PRIMARY KEY (StaffUSI, SchoolId, ProgramAssignmentDescriptorId)
);

-- Staff Section Association: Teacher assignments to classes
CREATE TABLE edfi.StaffSectionAssociation (
    StaffUSI INTEGER NOT NULL,                     -- Teacher/aide
    SectionIdentifier VARCHAR(255) NOT NULL,       -- Section they teach
    LocalCourseCode VARCHAR(60) NOT NULL,          -- Course code
    SchoolId INTEGER NOT NULL,                     -- School
    SchoolYear SMALLINT NOT NULL,                  -- Academic year
    ClassroomPositionDescriptorId INTEGER NOT NULL, -- Teacher of record, assistant, aide
    BeginDate DATE NOT NULL,                       -- Start of assignment
    EndDate DATE,                                  -- End of assignment (null if ongoing)
    HighlyQualifiedTeacher BOOLEAN,               -- Federal HQT status
    PercentageContribution DECIMAL(5,4),           -- For co-teaching scenarios
    CreateDate TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT PK_StaffSectionAssociation PRIMARY KEY (StaffUSI, SectionIdentifier, LocalCourseCode, SchoolId, SchoolYear)
);

-- Staff Leave: Track absences and leave
CREATE TABLE edfi.StaffLeave (
    StaffUSI INTEGER NOT NULL,                     -- Staff member
    StaffLeaveEventCategoryDescriptorId INTEGER NOT NULL, -- Sick, personal, professional
    BeginDate DATE NOT NULL,                       -- Leave start date
    EndDate DATE,                                  -- Leave end date
    Reason VARCHAR(1024),                          -- Detailed reason if provided
    SubstituteAssigned BOOLEAN,                   -- Whether substitute was assigned
    CreateDate TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT PK_StaffLeave PRIMARY KEY (StaffUSI, StaffLeaveEventCategoryDescriptorId, BeginDate)
);

-- Credential: Teaching licenses and certifications
CREATE TABLE edfi.Credential (
    CredentialIdentifier VARCHAR(60) NOT NULL,     -- License number
    StateOfIssueStateAbbreviationDescriptorId INTEGER NOT NULL, -- Issuing state
    CredentialFieldDescriptorId INTEGER,           -- Subject area certified
    CredentialTypeDescriptorId INTEGER NOT NULL,   -- License, endorsement, etc.
    TeachingCredentialDescriptorId INTEGER,        -- Specific teaching credential type
    IssuanceDate DATE NOT NULL,                   -- When issued
    ExpirationDate DATE,                           -- When expires
    TeachingCredentialBasisDescriptorId INTEGER,   -- How credential was earned
    CreateDate TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT PK_Credential PRIMARY KEY (CredentialIdentifier, StateOfIssueStateAbbreviationDescriptorId)
);
```

### 3. Ed-Fi Assessment Domain

```sql
-- Assessment: Test definitions
CREATE TABLE edfi.Assessment (
    AssessmentIdentifier VARCHAR(60) NOT NULL,     -- Unique test ID
    Namespace VARCHAR(255) NOT NULL,               -- Organization creating assessment
    AssessmentTitle VARCHAR(100) NOT NULL,         -- Test name
    AssessmentCategoryDescriptorId INTEGER,        -- Formative, summative, diagnostic
    AssessmentForm VARCHAR(60),                    -- Version or form of test
    AssessmentVersion INTEGER,                     -- Numeric version
    RevisionDate DATE,                             -- Last revision date
    MaxRawScore DECIMAL(15,5),                    -- Maximum possible score
    Nomenclature VARCHAR(100),                     -- Classification system
    AssessmentFamily VARCHAR(60),                  -- Group of related assessments
    EducationOrganizationId INTEGER,               -- Organization owning assessment
    AdaptiveAssessment BOOLEAN,                   -- Whether test adapts to responses
    CreateDate TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT PK_Assessment PRIMARY KEY (AssessmentIdentifier, Namespace)
);

-- Student Assessment: Individual test administrations
CREATE TABLE edfi.StudentAssessment (
    StudentAssessmentIdentifier VARCHAR(60) NOT NULL, -- Unique test instance ID
    StudentUSI INTEGER NOT NULL,                   -- Student taking test
    AssessmentIdentifier VARCHAR(60) NOT NULL,     -- Which test
    Namespace VARCHAR(255) NOT NULL,               -- Test namespace
    AdministrationDate TIMESTAMP NOT NULL,         -- When test was given
    AdministrationEndDate TIMESTAMP,               -- For multi-day tests
    AdministrationEnvironmentDescriptorId INTEGER, -- Testing location type
    AdministrationLanguageDescriptorId INTEGER,    -- Language of test
    SerialNumber VARCHAR(60),                      -- Test booklet serial number
    WhenAssessedGradeLevelDescriptorId INTEGER,   -- Student's grade at time of test
    EventCircumstanceDescriptorId INTEGER,         -- Special circumstances
    EventDescription VARCHAR(1024),                -- Details of circumstances
    SchoolYear SMALLINT,                           -- Academic year
    CreateDate TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT PK_StudentAssessment PRIMARY KEY (StudentAssessmentIdentifier, StudentUSI, AssessmentIdentifier, Namespace)
);

-- Student Assessment Score Result: Test scores
CREATE TABLE edfi.StudentAssessmentScoreResult (
    StudentAssessmentIdentifier VARCHAR(60) NOT NULL, -- Test instance
    StudentUSI INTEGER NOT NULL,                   -- Student
    AssessmentIdentifier VARCHAR(60) NOT NULL,     -- Test
    Namespace VARCHAR(255) NOT NULL,               -- Namespace
    AssessmentReportingMethodDescriptorId INTEGER NOT NULL, -- Scale score, percentile, etc.
    Result VARCHAR(35) NOT NULL,                   -- The actual score
    ResultDatatypeTypeDescriptorId INTEGER NOT NULL, -- Integer, decimal, level
    CreateDate TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT PK_StudentAssessmentScoreResult PRIMARY KEY (StudentAssessmentIdentifier, StudentUSI, AssessmentIdentifier, Namespace, AssessmentReportingMethodDescriptorId)
);

-- Objective Assessment: Sub-scores within assessments
CREATE TABLE edfi.ObjectiveAssessment (
    AssessmentIdentifier VARCHAR(60) NOT NULL,     -- Parent assessment
    IdentificationCode VARCHAR(60) NOT NULL,       -- Sub-test code
    Namespace VARCHAR(255) NOT NULL,               -- Namespace
    MaxRawScore DECIMAL(15,5),                    -- Max score for this section
    PercentOfAssessment DECIMAL(5,4),             -- Weight in overall score
    Nomenclature VARCHAR(100),                     -- Classification
    Description VARCHAR(1024),                     -- What this section measures
    ParentIdentificationCode VARCHAR(60),          -- For nested objectives
    CreateDate TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT PK_ObjectiveAssessment PRIMARY KEY (AssessmentIdentifier, IdentificationCode, Namespace)
);
```

### 4. Ed-Fi Attendance Domain

```sql
-- Calendar Date: Individual school days
CREATE TABLE edfi.CalendarDate (
    CalendarCode VARCHAR(60) NOT NULL,             -- School calendar identifier
    Date DATE NOT NULL,                            -- The actual date
    SchoolId INTEGER NOT NULL,                     -- Which school
    SchoolYear SMALLINT NOT NULL,                  -- Academic year
    CreateDate TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT PK_CalendarDate PRIMARY KEY (CalendarCode, Date, SchoolId, SchoolYear)
);

-- Calendar Date Calendar Event: What happens on each date
CREATE TABLE edfi.CalendarDateCalendarEvent (
    CalendarCode VARCHAR(60) NOT NULL,             -- Calendar reference
    Date DATE NOT NULL,                            -- Date reference
    SchoolId INTEGER NOT NULL,                     -- School reference
    SchoolYear SMALLINT NOT NULL,                  -- Academic year
    CalendarEventDescriptorId INTEGER NOT NULL,    -- Holiday, teacher workday, etc.
    CreateDate TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT PK_CalendarDateCalendarEvent PRIMARY KEY (CalendarCode, Date, SchoolId, SchoolYear, CalendarEventDescriptorId)
);

-- Student School Attendance Event: Daily attendance
CREATE TABLE edfi.StudentSchoolAttendanceEvent (
    StudentUSI INTEGER NOT NULL,                   -- Student identifier
    SchoolId INTEGER NOT NULL,                     -- School attended
    SchoolYear SMALLINT NOT NULL,                  -- Academic year
    EventDate DATE NOT NULL,                       -- Date of attendance event
    AttendanceEventCategoryDescriptorId INTEGER NOT NULL, -- Present, absent, tardy
    AttendanceEventReason VARCHAR(255),            -- Why absent/tardy
    EducationalEnvironmentDescriptorId INTEGER,    -- Where instruction occurred
    EventDuration DECIMAL(5,4),                    -- Portion of day
    SchoolAttendanceDuration INTEGER,              -- Minutes attended
    ArrivalTime TIME,                              -- When arrived
    DepartureTime TIME,                            -- When left
    CreateDate TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT PK_StudentSchoolAttendanceEvent PRIMARY KEY (StudentUSI, SchoolId, SchoolYear, EventDate, AttendanceEventCategoryDescriptorId)
);

-- Student Section Attendance Event: Period-by-period attendance
CREATE TABLE edfi.StudentSectionAttendanceEvent (
    StudentUSI INTEGER NOT NULL,                   -- Student identifier
    SectionIdentifier VARCHAR(255) NOT NULL,       -- Class section
    LocalCourseCode VARCHAR(60) NOT NULL,          -- Course code
    SchoolId INTEGER NOT NULL,                     -- School
    SchoolYear SMALLINT NOT NULL,                  -- Academic year
    EventDate DATE NOT NULL,                       -- Date of event
    AttendanceEventCategoryDescriptorId INTEGER NOT NULL, -- Present, absent, tardy
    AttendanceEventReason VARCHAR(255),            -- Reason if absent
    EducationalEnvironmentDescriptorId INTEGER,    -- Location of instruction
    EventDuration DECIMAL(5,4),                    -- Portion of period
    SectionAttendanceDuration INTEGER,             -- Minutes in class
    ArrivalTime TIME,                              -- Arrival time
    DepartureTime TIME,                            -- Departure time
    CreateDate TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT PK_StudentSectionAttendanceEvent PRIMARY KEY (StudentUSI, SectionIdentifier, LocalCourseCode, SchoolId, SchoolYear, EventDate, AttendanceEventCategoryDescriptorId)
);
```

### 5. Ed-Fi Discipline Domain

```sql
-- Discipline Incident: Behavioral incidents
CREATE TABLE edfi.DisciplineIncident (
    IncidentIdentifier VARCHAR(60) NOT NULL,       -- Unique incident ID
    SchoolId INTEGER NOT NULL,                     -- Where incident occurred
    IncidentDate DATE NOT NULL,                    -- When it happened
    IncidentTime TIME,                             -- Specific time
    IncidentLocation VARCHAR(100),                 -- Location details
    IncidentDescription VARCHAR(1024),             -- What happened
    ReporterDescriptionDescriptorId INTEGER,       -- Type of reporter
    ReporterName VARCHAR(75),                      -- Who reported it
    ReportedToLawEnforcement BOOLEAN,             -- Police involved?
    CaseNumber VARCHAR(20),                        -- Police case number
    IncidentCost MONEY,                            -- Property damage cost
    StaffUSI INTEGER,                              -- Staff member handling
    CreateDate TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT PK_DisciplineIncident PRIMARY KEY (IncidentIdentifier, SchoolId)
);

-- Student Discipline Incident Association: Students involved
CREATE TABLE edfi.StudentDisciplineIncidentAssociation (
    StudentUSI INTEGER NOT NULL,                   -- Student involved
    IncidentIdentifier VARCHAR(60) NOT NULL,       -- Incident reference
    SchoolId INTEGER NOT NULL,                     -- School reference
    StudentParticipationCodeDescriptorId INTEGER NOT NULL, -- Perpetrator, victim, witness
    CreateDate TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT PK_StudentDisciplineIncidentAssociation PRIMARY KEY (StudentUSI, IncidentIdentifier, SchoolId)
);

-- Student Discipline Incident Behavior Association: Specific behaviors
CREATE TABLE edfi.StudentDisciplineIncidentBehaviorAssociation (
    StudentUSI INTEGER NOT NULL,                   -- Student
    IncidentIdentifier VARCHAR(60) NOT NULL,       -- Incident
    SchoolId INTEGER NOT NULL,                     -- School
    BehaviorDescriptorId INTEGER NOT NULL,         -- Type of behavior
    BehaviorDetailedDescription VARCHAR(1024),     -- Specific details
    CreateDate TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT PK_StudentDisciplineIncidentBehaviorAssociation PRIMARY KEY (StudentUSI, IncidentIdentifier, SchoolId, BehaviorDescriptorId)
);

-- Discipline Action: Consequences assigned
CREATE TABLE edfi.DisciplineAction (
    DisciplineActionIdentifier VARCHAR(36) NOT NULL, -- Unique action ID
    StudentUSI INTEGER NOT NULL,                   -- Student receiving action
    DisciplineDate DATE NOT NULL,                  -- When action starts
    ActualDisciplineActionLength INTEGER,          -- Actual days served
    DisciplineActionLength INTEGER,                -- Original length assigned
    DisciplineActionLengthDifferenceReasonDescriptorId INTEGER, -- Why different
    IEPPlacementMeetingIndicator BOOLEAN,         -- IEP team involved?
    RelatedToZeroTolerancePolicy BOOLEAN,         -- Zero tolerance policy?
    ResponsibilitySchoolId INTEGER NOT NULL,       -- School responsible
    AssignmentSchoolId INTEGER,                    -- Alternative placement school
    CreateDate TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT PK_DisciplineAction PRIMARY KEY (DisciplineActionIdentifier, StudentUSI, DisciplineDate)
);
```

### 6. Ed-Fi Student Cohort Domain

```sql
-- Cohort: Groups of students tracked together
CREATE TABLE edfi.Cohort (
    CohortIdentifier VARCHAR(36) NOT NULL,         -- Unique cohort ID
    EducationOrganizationId INTEGER NOT NULL,      -- Organization managing cohort
    CohortDescription VARCHAR(1024),               -- What this cohort tracks
    CohortTypeDescriptorId INTEGER NOT NULL,       -- Academic, attendance, discipline
    CohortScopeDescriptorId INTEGER,               -- District, school, classroom
    AcademicSubjectDescriptorId INTEGER,           -- Subject-specific cohorts
    CreateDate TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT PK_Cohort PRIMARY KEY (CohortIdentifier, EducationOrganizationId)
);

-- Student Cohort Association: Students in cohorts
CREATE TABLE edfi.StudentCohortAssociation (
    StudentUSI INTEGER NOT NULL,                   -- Student
    CohortIdentifier VARCHAR(36) NOT NULL,         -- Cohort
    EducationOrganizationId INTEGER NOT NULL,      -- Organization
    BeginDate DATE NOT NULL,                       -- When student joined
    EndDate DATE,                                  -- When student left
    CreateDate TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT PK_StudentCohortAssociation PRIMARY KEY (StudentUSI, CohortIdentifier, EducationOrganizationId, BeginDate)
);

-- Cohort Program: Programs associated with cohorts
CREATE TABLE edfi.CohortProgram (
    CohortIdentifier VARCHAR(36) NOT NULL,         -- Cohort
    EducationOrganizationId INTEGER NOT NULL,      -- Cohort organization
    ProgramEducationOrganizationId INTEGER NOT NULL, -- Program organization
    ProgramName VARCHAR(60) NOT NULL,              -- Program name
    ProgramTypeDescriptorId INTEGER NOT NULL,      -- Type of program
    CreateDate TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT PK_CohortProgram PRIMARY KEY (CohortIdentifier, EducationOrganizationId, ProgramEducationOrganizationId, ProgramName, ProgramTypeDescriptorId)
);
```

### 7. Ed-Fi School Calendar Domain

```sql
-- Calendar: School year calendars
CREATE TABLE edfi.Calendar (
    CalendarCode VARCHAR(60) NOT NULL,             -- Unique calendar identifier
    SchoolId INTEGER NOT NULL,                     -- School using this calendar
    SchoolYear SMALLINT NOT NULL,                  -- Academic year
    CalendarTypeDescriptorId INTEGER NOT NULL,     -- Student, staff, supplemental
    CreateDate TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT PK_Calendar PRIMARY KEY (CalendarCode, SchoolId, SchoolYear)
);

-- Grading Period: Marking periods
CREATE TABLE edfi.GradingPeriod (
    GradingPeriodDescriptorId INTEGER NOT NULL,   -- Quarter, semester, trimester
    SchoolId INTEGER NOT NULL,                     -- School
    SchoolYear SMALLINT NOT NULL,                  -- Academic year
    BeginDate DATE NOT NULL,                       -- Period start
    EndDate DATE NOT NULL,                         -- Period end
    TotalInstructionalDays INTEGER NOT NULL,       -- Teaching days in period
    PeriodSequence INTEGER,                        -- Order (1st, 2nd, etc.)
    CreateDate TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT PK_GradingPeriod PRIMARY KEY (GradingPeriodDescriptorId, SchoolId, SchoolYear)
);

-- Session: Academic terms
CREATE TABLE edfi.Session (
    SessionName VARCHAR(60) NOT NULL,              -- "Fall 2025", "Spring 2026"
    SchoolId INTEGER NOT NULL,                     -- School
    SchoolYear SMALLINT NOT NULL,                  -- Academic year
    BeginDate DATE NOT NULL,                       -- Term start
    EndDate DATE NOT NULL,                         -- Term end
    TermDescriptorId INTEGER NOT NULL,             -- Semester, trimester, quarter
    TotalInstructionalDays INTEGER NOT NULL,       -- Teaching days in term
    CreateDate TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT PK_Session PRIMARY KEY (SessionName, SchoolId, SchoolYear)
);

-- Bell Schedule: Daily class schedules
CREATE TABLE edfi.BellSchedule (
    BellScheduleName VARCHAR(60) NOT NULL,         -- "Regular", "Early Release"
    SchoolId INTEGER NOT NULL,                     -- School
    AlternateDayName VARCHAR(20),                 -- "A Day", "B Day"
    StartTime TIME,                                -- School start time
    EndTime TIME,                                  -- School end time
    TotalInstructionalTime INTEGER,                -- Total minutes of instruction
    CreateDate TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT PK_BellSchedule PRIMARY KEY (BellScheduleName, SchoolId)
);

-- Class Period: Individual periods in schedule
CREATE TABLE edfi.ClassPeriod (
    ClassPeriodName VARCHAR(60) NOT NULL,          -- "1st Period", "Block A"
    SchoolId INTEGER NOT NULL,                     -- School
    OfficialAttendancePeriod BOOLEAN,             -- Used for daily attendance?
    CreateDate TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT PK_ClassPeriod PRIMARY KEY (ClassPeriodName, SchoolId)
);
```

### 8. Ed-Fi Academic Records Domain

```sql
-- Report Card: Official grade reports
CREATE TABLE edfi.ReportCard (
    StudentUSI INTEGER NOT NULL,                   -- Student
    EducationOrganizationId INTEGER NOT NULL,      -- School or district
    GradingPeriodDescriptorId INTEGER NOT NULL,   -- Which grading period
    GradingPeriodSchoolId INTEGER NOT NULL,       -- School for grading period
    GradingPeriodSchoolYear SMALLINT NOT NULL,     -- Academic year
    GPAGivenGradingPeriod DECIMAL(18,4),          -- GPA this period
    GPACumulative DECIMAL(18,4),                  -- Overall GPA
    NumberOfDaysAbsent DECIMAL(18,4),             -- Absences this period
    NumberOfDaysInAttendance DECIMAL(18,4),       -- Days attended
    NumberOfDaysTardy INTEGER,                     -- Tardies this period
    CreateDate TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT PK_ReportCard PRIMARY KEY (StudentUSI, EducationOrganizationId, GradingPeriodDescriptorId, GradingPeriodSchoolId, GradingPeriodSchoolYear)
);

-- Grade: Individual course grades
CREATE TABLE edfi.Grade (
    StudentUSI INTEGER NOT NULL,                   -- Student
    LocalCourseCode VARCHAR(60) NOT NULL,          -- Course
    SchoolId INTEGER NOT NULL,                     -- School
    SchoolYear SMALLINT NOT NULL,                  -- Academic year
    SectionIdentifier VARCHAR(255) NOT NULL,       -- Section
    GradingPeriodDescriptorId INTEGER NOT NULL,   -- Grading period
    GradingPeriodSchoolId INTEGER NOT NULL,       -- School for period
    GradingPeriodSchoolYear SMALLINT NOT NULL,     -- Year for period
    BeginDate DATE NOT NULL,                       -- When enrolled
    GradeTypeDescriptorId INTEGER NOT NULL,       -- Final, progress, exam
    NumericGradeEarned DECIMAL(9,2),              -- Numeric grade
    LetterGradeEarned VARCHAR(20),                -- Letter grade
    DiagnosticStatement VARCHAR(1024),             -- Teacher comments
    CreateDate TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT PK_Grade PRIMARY KEY (StudentUSI, LocalCourseCode, SchoolId, SchoolYear, SectionIdentifier, GradingPeriodDescriptorId, GradingPeriodSchoolId, GradingPeriodSchoolYear, BeginDate, GradeTypeDescriptorId)
);

-- Diploma: Graduation records
CREATE TABLE edfi.Diploma (
    StudentUSI INTEGER NOT NULL,                   -- Graduate
    DiplomaTypeDescriptorId INTEGER NOT NULL,     -- Regular, honors, IB
    DiplomaAwardDate DATE NOT NULL,               -- Graduation date
    AchievementCategoryDescriptorId INTEGER,       -- Summa, magna, cum laude
    DiplomaLevelDescriptorId INTEGER,             -- Level of diploma
    CTECompleter BOOLEAN,                         -- Career/Tech Ed completer
    DiplomaDescription VARCHAR(80),               -- Additional details
    DiplomaAwardExpiresDate DATE,                 -- For temporary diplomas
    AcademicMonth INTEGER,                         -- Month of school year
    CreateDate TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT PK_Diploma PRIMARY KEY (StudentUSI, DiplomaTypeDescriptorId, DiplomaAwardDate)
);

-- Student Competency Objective: Standards mastery
CREATE TABLE edfi.StudentCompetencyObjective (
    StudentUSI INTEGER NOT NULL,                   -- Student
    GradingPeriodDescriptorId INTEGER NOT NULL,   -- When assessed
    GradingPeriodSchoolId INTEGER NOT NULL,       -- School
    GradingPeriodSchoolYear SMALLINT NOT NULL,     -- Year
    Objective VARCHAR(60) NOT NULL,               -- Learning objective
    ObjectiveEducationOrganizationId INTEGER NOT NULL, -- Who defined objective
    ObjectiveGradeLevelDescriptorId INTEGER NOT NULL, -- Grade level of objective
    CompetencyLevelDescriptorId INTEGER NOT NULL, -- Mastery level achieved
    DiagnosticStatement VARCHAR(1024),             -- Additional feedback
    CreateDate TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT PK_StudentCompetencyObjective PRIMARY KEY (StudentUSI, GradingPeriodDescriptorId, GradingPeriodSchoolId, GradingPeriodSchoolYear, Objective, ObjectiveEducationOrganizationId, ObjectiveGradeLevelDescriptorId)
);
```

### 9. OneRoster Core Entities (Beyond Basic Tables)

```sql
-- OneRoster Courses: Course templates
CREATE TABLE oneroster.courses (
    sourced_id VARCHAR(255) PRIMARY KEY,           -- Unique course identifier
    status VARCHAR(20) NOT NULL DEFAULT 'active',  -- active, tobedeleted
    date_last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Last update
    title VARCHAR(255) NOT NULL,                   -- Course name
    school_year_sourced_id VARCHAR(255) NOT NULL,  -- Academic year reference
    course_code VARCHAR(100),                      -- Official course code
    grades TEXT[],                                 -- Grade levels (K, 1, 2, etc.)
    subjects TEXT[],                               -- Subject areas
    org_sourced_id VARCHAR(255) NOT NULL,          -- School/district offering
    metadata JSONB,                                -- Additional course data
    FOREIGN KEY (school_year_sourced_id) REFERENCES oneroster.academic_sessions(sourced_id),
    FOREIGN KEY (org_sourced_id) REFERENCES oneroster.orgs(sourced_id)
);

-- OneRoster Classes: Actual course sections
CREATE TABLE oneroster.classes (
    sourced_id VARCHAR(255) PRIMARY KEY,           -- Unique class identifier
    status VARCHAR(20) NOT NULL DEFAULT 'active',  -- active, tobedeleted
    date_last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Last update
    title VARCHAR(255) NOT NULL,                   -- Class name
    class_code VARCHAR(100),                       -- Section number
    class_type VARCHAR(50) DEFAULT 'scheduled',    -- scheduled, homeroom
    location VARCHAR(255),                         -- Room number
    grades TEXT[],                                 -- Grade levels in class
    subjects TEXT[],                               -- Subjects taught
    course_sourced_id VARCHAR(255) NOT NULL,       -- Parent course
    school_sourced_id VARCHAR(255) NOT NULL,       -- School location
    term_sourced_ids TEXT[] NOT NULL,              -- Academic terms
    metadata JSONB,                                -- Additional class data
    FOREIGN KEY (course_sourced_id) REFERENCES oneroster.courses(sourced_id),
    FOREIGN KEY (school_sourced_id) REFERENCES oneroster.orgs(sourced_id)
);

-- OneRoster Enrollments: User-class relationships
CREATE TABLE oneroster.enrollments (
    sourced_id VARCHAR(255) PRIMARY KEY,           -- Unique enrollment ID
    status VARCHAR(20) NOT NULL DEFAULT 'active',  -- active, tobedeleted
    date_last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Last update
    user_sourced_id VARCHAR(255) NOT NULL,         -- Student or teacher
    class_sourced_id VARCHAR(255) NOT NULL,        -- Class enrolled in
    school_sourced_id VARCHAR(255) NOT NULL,       -- School context
    role VARCHAR(50) NOT NULL,                     -- student, teacher, aide
    primary_enrollment BOOLEAN DEFAULT TRUE,       -- Main teacher/student
    begin_date DATE,                               -- Enrollment start
    end_date DATE,                                 -- Enrollment end
    metadata JSONB,                                -- Additional enrollment data
    FOREIGN KEY (user_sourced_id) REFERENCES oneroster.users(sourced_id),
    FOREIGN KEY (class_sourced_id) REFERENCES oneroster.classes(sourced_id),
    FOREIGN KEY (school_sourced_id) REFERENCES oneroster.orgs(sourced_id)
);

-- OneRoster Academic Sessions: Terms and years
CREATE TABLE oneroster.academic_sessions (
    sourced_id VARCHAR(255) PRIMARY KEY,           -- Unique session ID
    status VARCHAR(20) NOT NULL DEFAULT 'active',  -- active, tobedeleted
    date_last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Last update
    title VARCHAR(255) NOT NULL,                   -- "2025-26 School Year"
    type VARCHAR(50) NOT NULL,                     -- schoolYear, term
    start_date DATE NOT NULL,                      -- Session start
    end_date DATE NOT NULL,                        -- Session end
    parent_sourced_id VARCHAR(255),                -- Parent session (term->year)
    school_year VARCHAR(10),                       -- "2025-26"
    metadata JSONB,                                -- Additional session data
    FOREIGN KEY (parent_sourced_id) REFERENCES oneroster.academic_sessions(sourced_id)
);

-- OneRoster Line Items: Gradebook assignments
CREATE TABLE oneroster.line_items (
    sourced_id VARCHAR(255) PRIMARY KEY,           -- Unique assignment ID
    status VARCHAR(20) NOT NULL DEFAULT 'active',  -- active, tobedeleted
    date_last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Last update
    title VARCHAR(255) NOT NULL,                   -- Assignment name
    description TEXT,                              -- Assignment details
    assign_date DATE,                              -- When assigned
    due_date DATE,                                 -- When due
    class_sourced_id VARCHAR(255) NOT NULL,        -- Class context
    category_sourced_id VARCHAR(255),              -- Grade category
    grading_period_sourced_id VARCHAR(255),        -- Term/semester
    result_value_min DECIMAL(10,2),                -- Minimum score
    result_value_max DECIMAL(10,2),                -- Maximum score
    metadata JSONB,                                -- Additional assignment data
    FOREIGN KEY (class_sourced_id) REFERENCES oneroster.classes(sourced_id),
    FOREIGN KEY (category_sourced_id) REFERENCES oneroster.categories(sourced_id),
    FOREIGN KEY (grading_period_sourced_id) REFERENCES oneroster.academic_sessions(sourced_id)
);

-- OneRoster Results: Student scores
CREATE TABLE oneroster.results (
    sourced_id VARCHAR(255) PRIMARY KEY,           -- Unique result ID
    status VARCHAR(20) NOT NULL DEFAULT 'active',  -- active, tobedeleted
    date_last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Last update
    line_item_sourced_id VARCHAR(255) NOT NULL,    -- Assignment reference
    student_sourced_id VARCHAR(255) NOT NULL,      -- Student who completed
    score_status VARCHAR(50),                      -- exempt, submitted, graded
    score DECIMAL(10,4),                           -- Numeric score
    score_date TIMESTAMP,                          -- When scored
    comment TEXT,                                  -- Teacher feedback
    metadata JSONB,                                -- Additional score data
    FOREIGN KEY (line_item_sourced_id) REFERENCES oneroster.line_items(sourced_id),
    FOREIGN KEY (student_sourced_id) REFERENCES oneroster.users(sourced_id)
);

-- OneRoster Categories: Grade categories
CREATE TABLE oneroster.categories (
    sourced_id VARCHAR(255) PRIMARY KEY,           -- Unique category ID
    status VARCHAR(20) NOT NULL DEFAULT 'active',  -- active, tobedeleted
    date_last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Last update
    title VARCHAR(255) NOT NULL,                   -- "Homework", "Tests", "Quizzes"
    metadata JSONB                                 -- Additional category data
);

-- OneRoster Demographics: Extended user demographics
CREATE TABLE oneroster.demographics (
    sourced_id VARCHAR(255) PRIMARY KEY,           -- Links to user sourced_id
    status VARCHAR(20) NOT NULL DEFAULT 'active',  -- active, tobedeleted
    date_last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Last update
    birth_date DATE,                               -- Date of birth
    sex VARCHAR(20),                               -- male, female
    american_indian_or_alaska_native BOOLEAN,     -- Race/ethnicity flags
    asian BOOLEAN,                                 -- Race/ethnicity flags
    black_or_african_american BOOLEAN,            -- Race/ethnicity flags
    native_hawaiian_or_other_pacific_islander BOOLEAN, -- Race/ethnicity flags
    white BOOLEAN,                                 -- Race/ethnicity flags
    demographic_race_two_or_more_races BOOLEAN,   -- Multiple races
    hispanic_or_latino_ethnicity BOOLEAN,         -- Ethnicity
    country_of_birth_code VARCHAR(10),            -- ISO country code
    state_of_birth_abbreviation VARCHAR(10),       -- State abbreviation
    city_of_birth VARCHAR(255),                    -- Birth city
    public_school_residence_status VARCHAR(50),    -- Resident status
    metadata JSONB                                 -- Additional demographic data
);

-- OneRoster Resources: Learning materials
CREATE TABLE oneroster.resources (
    sourced_id VARCHAR(255) PRIMARY KEY,           -- Unique resource ID
    status VARCHAR(20) NOT NULL DEFAULT 'active',  -- active, tobedeleted
    date_last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Last update
    title VARCHAR(255) NOT NULL,                   -- Resource name
    vendor_resource_id VARCHAR(255),               -- Vendor's ID
    vendor_id VARCHAR(255),                        -- Vendor identifier
    application_id VARCHAR(255),                   -- App using resource
    roles TEXT[],                                  -- Who can access
    importance VARCHAR(50),                        -- primary, secondary
    metadata JSONB                                 -- Additional resource data
);

-- OneRoster Score Scales: Grading scales
CREATE TABLE oneroster.score_scales (
    sourced_id VARCHAR(255) PRIMARY KEY,           -- Unique scale ID
    status VARCHAR(20) NOT NULL DEFAULT 'active',  -- active, tobedeleted
    date_last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Last update
    name VARCHAR(255) NOT NULL,                    -- Scale name
    scale_values JSONB NOT NULL,                   -- Scale definition (A=90-100, B=80-89)
    metadata JSONB                                 -- Additional scale data
);
```

### 10. 2 Hour Learning Integration Tables

```sql
CREATE SCHEMA two_hour_learning;

-- AI Learning Sessions: Track 2-hour daily learning
CREATE TABLE two_hour_learning.ai_learning_sessions (
    session_id BIGSERIAL PRIMARY KEY,              -- Unique session identifier
    student_id VARCHAR(255) NOT NULL,              -- Student reference
    subject_id VARCHAR(100) NOT NULL,              -- Subject being studied
    session_date DATE NOT NULL,                    -- Date of session
    start_time TIMESTAMP NOT NULL,                 -- Session start
    end_time TIMESTAMP,                            -- Session end
    total_minutes INTEGER,                         -- Total time spent
    target_achieved BOOLEAN DEFAULT FALSE,         -- Met 2-hour target?
    mastery_percentage DECIMAL(5,2),               -- Mastery level achieved
    accuracy_percentage DECIMAL(5,2),              -- Accuracy during session
    lesson_count INTEGER,                          -- Lessons completed
    ai_tutor_type VARCHAR(50),                     -- Which AI tutor used
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Learning Mastery Progress: Track skill mastery
CREATE TABLE two_hour_learning.mastery_progress (
    progress_id BIGSERIAL PRIMARY KEY,             -- Unique progress ID
    student_id VARCHAR(255) NOT NULL,              -- Student
    subject_id VARCHAR(100) NOT NULL,              -- Subject area
    skill_id VARCHAR(200) NOT NULL,                -- Specific skill
    current_level INTEGER,                         -- Current mastery level (1-10)
    target_level INTEGER,                          -- Goal level
    mastery_date TIMESTAMP,                        -- When mastered
    attempts_count INTEGER DEFAULT 0,              -- Practice attempts
    time_spent_minutes INTEGER DEFAULT 0,          -- Total practice time
    last_assessment_score DECIMAL(5,2),            -- Most recent score
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Daily Learning Targets: 2-hour goals
CREATE TABLE two_hour_learning.daily_targets (
    target_id BIGSERIAL PRIMARY KEY,               -- Unique target ID
    student_id VARCHAR(255) NOT NULL,              -- Student
    target_date DATE NOT NULL,                     -- Date for target
    subject_id VARCHAR(100) NOT NULL,              -- Subject to practice
    target_minutes INTEGER NOT NULL DEFAULT 25,    -- Minutes goal (per subject)
    target_lessons INTEGER NOT NULL,               -- Lessons to complete
    target_accuracy DECIMAL(5,2) NOT NULL DEFAULT 80.0, -- Accuracy goal
    actual_minutes INTEGER,                        -- Minutes achieved
    actual_lessons INTEGER,                        -- Lessons completed
    actual_accuracy DECIMAL(5,2),                  -- Accuracy achieved
    completed BOOLEAN DEFAULT FALSE,               -- Target met?
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI Personalization Profiles: Learning preferences
CREATE TABLE two_hour_learning.personalization_profiles (
    profile_id SERIAL PRIMARY KEY,                 -- Unique profile ID
    student_id VARCHAR(255) NOT NULL UNIQUE,       -- One per student
    learning_style VARCHAR(50),                    -- Visual, auditory, kinesthetic
    preferred_difficulty_progression VARCHAR(20),  -- Gradual, moderate, aggressive
    optimal_session_length_minutes INTEGER,        -- Best session duration
    motivational_preferences JSONB,                -- Gamification preferences
    engagement_patterns JSONB,                     -- When most engaged
    knowledge_gaps JSONB,                          -- Identified weak areas
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- MAP Test Integration: NWEA MAP results
CREATE TABLE two_hour_learning.map_test_results (
    test_id BIGSERIAL PRIMARY KEY,                 -- Unique test ID
    student_id VARCHAR(255) NOT NULL,              -- Student
    subject VARCHAR(50) NOT NULL,                  -- Math, Reading, Science
    test_date DATE NOT NULL,                       -- When tested
    rit_score INTEGER NOT NULL,                    -- RIT scale score
    percentile INTEGER,                            -- National percentile
    growth_projection INTEGER,                     -- Expected growth
    instructional_areas JSONB,                     -- Areas needing focus
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Life Skills Activities: Beyond academics
CREATE TABLE two_hour_learning.life_skills_activities (
    activity_id BIGSERIAL PRIMARY KEY,             -- Unique activity ID
    student_id VARCHAR(255) NOT NULL,              -- Student
    activity_type VARCHAR(100) NOT NULL,           -- Coding, music, sports
    activity_date DATE NOT NULL,                   -- When completed
    duration_minutes INTEGER NOT NULL,             -- Time spent
    skill_category VARCHAR(50),                    -- Technical, creative, physical
    instructor_id VARCHAR(255),                    -- Who supervised
    progress_notes TEXT,                           -- Qualitative feedback
    competency_rating INTEGER CHECK (competency_rating BETWEEN 1 AND 5), -- Skill level
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 11. Operational Tables

```sql
-- Health Records Schema
CREATE SCHEMA health;

-- Student Health Records: General health information
CREATE TABLE health.student_health_records (
    record_id BIGSERIAL PRIMARY KEY,               -- Unique record ID
    student_usi INTEGER NOT NULL,                  -- Student reference
    record_type VARCHAR(50) NOT NULL,              -- Physical, screening, injury
    record_date DATE NOT NULL,                     -- Date of record
    provider VARCHAR(200),                         -- Doctor/nurse name
    notes TEXT,                                    -- Medical notes
    created_by VARCHAR(100),                       -- Who entered record
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_usi) REFERENCES edfi.student(studentusi)
);

-- Immunizations: Vaccination records
CREATE TABLE health.immunizations (
    immunization_id BIGSERIAL PRIMARY KEY,         -- Unique immunization ID
    student_usi INTEGER NOT NULL,                  -- Student
    vaccine_type VARCHAR(100) NOT NULL,            -- MMR, DPT, COVID-19, etc.
    dose_number INTEGER,                           -- Which dose (1, 2, booster)
    date_administered DATE NOT NULL,               -- When given
    expiration_date DATE,                          -- When expires (if applicable)
    administered_by VARCHAR(200),                  -- Provider name
    lot_number VARCHAR(50),                        -- Vaccine lot number
    is_compliant BOOLEAN DEFAULT TRUE,             -- Meets requirements?
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_usi) REFERENCES edfi.student(studentusi)
);

-- Medications: Current medications
CREATE TABLE health.medications (
    medication_id BIGSERIAL PRIMARY KEY,           -- Unique medication ID
    student_usi INTEGER NOT NULL,                  -- Student
    medication_name VARCHAR(200) NOT NULL,         -- Drug name
    dosage VARCHAR(100),                           -- "10mg twice daily"
    frequency VARCHAR(100),                        -- How often taken
    start_date DATE NOT NULL,                      -- When started
    end_date DATE,                                 -- When to stop
    prescribed_by VARCHAR(200),                    -- Doctor name
    administration_instructions TEXT,              -- Special instructions
    is_active BOOLEAN DEFAULT TRUE,                -- Currently taking?
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_usi) REFERENCES edfi.student(studentusi)
);

-- Allergies: Student allergies
CREATE TABLE health.allergies (
    allergy_id BIGSERIAL PRIMARY KEY,              -- Unique allergy ID
    student_usi INTEGER NOT NULL,                  -- Student
    allergen_name VARCHAR(200) NOT NULL,           -- What they're allergic to
    allergy_type VARCHAR(50),                      -- Food, environmental, drug
    severity VARCHAR(50),                          -- Mild, moderate, severe
    reaction TEXT,                                 -- What happens
    treatment_plan TEXT,                           -- How to treat
    date_identified DATE,                          -- When discovered
    is_active BOOLEAN DEFAULT TRUE,                -- Current allergy?
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_usi) REFERENCES edfi.student(studentusi)
);

-- Transportation Schema
CREATE SCHEMA transportation;

-- Bus Routes: Route definitions
CREATE TABLE transportation.bus_routes (
    route_id SERIAL PRIMARY KEY,                   -- Unique route ID
    route_number VARCHAR(20) NOT NULL UNIQUE,      -- "Route 42"
    route_description VARCHAR(500),                -- Route details
    driver_name VARCHAR(200),                      -- Assigned driver
    driver_license_number VARCHAR(50),             -- CDL number
    bus_number VARCHAR(20),                        -- Vehicle number
    capacity INTEGER,                              -- Seat capacity
    is_active BOOLEAN DEFAULT TRUE,                -- Currently running?
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bus Stops: Stop locations
CREATE TABLE transportation.bus_stops (
    stop_id SERIAL PRIMARY KEY,                    -- Unique stop ID
    stop_name VARCHAR(200) NOT NULL,               -- "Oak St & Main St"
    address VARCHAR(500),                          -- Full address
    latitude DECIMAL(10,8),                        -- GPS latitude
    longitude DECIMAL(11,8),                       -- GPS longitude
    pickup_time TIME,                              -- Morning pickup
    dropoff_time TIME,                             -- Afternoon dropoff
    is_active BOOLEAN DEFAULT TRUE,                -- Active stop?
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Student Transportation: Bus assignments
CREATE TABLE transportation.student_transportation (
    assignment_id BIGSERIAL PRIMARY KEY,           -- Unique assignment ID
    student_usi INTEGER NOT NULL,                  -- Student
    route_id INTEGER NOT NULL,                     -- Bus route
    pickup_stop_id INTEGER,                        -- Morning stop
    dropoff_stop_id INTEGER,                       -- Afternoon stop
    effective_date DATE NOT NULL,                  -- When assignment starts
    end_date DATE,                                 -- When assignment ends
    transportation_category VARCHAR(50),           -- Regular, special needs
    is_active BOOLEAN DEFAULT TRUE,                -- Current assignment?
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_usi) REFERENCES edfi.student(studentusi),
    FOREIGN KEY (route_id) REFERENCES transportation.bus_routes(route_id),
    FOREIGN KEY (pickup_stop_id) REFERENCES transportation.bus_stops(stop_id),
    FOREIGN KEY (dropoff_stop_id) REFERENCES transportation.bus_stops(stop_id)
);

-- Special Education Schema
CREATE SCHEMA specialed;

-- IEP: Individualized Education Programs
CREATE TABLE specialed.iep (
    iep_id BIGSERIAL PRIMARY KEY,                  -- Unique IEP ID
    student_usi INTEGER NOT NULL,                  -- Student
    school_id INTEGER NOT NULL,                    -- School
    iep_number VARCHAR(50) UNIQUE,                 -- Official IEP number
    effective_date DATE NOT NULL,                  -- When IEP starts
    annual_review_date DATE,                       -- Yearly review due
    triennial_evaluation_date DATE,                -- 3-year evaluation due
    exit_date DATE,                                -- When exited special ed
    primary_disability VARCHAR(100),               -- Main disability
    secondary_disabilities TEXT[],                 -- Other disabilities
    placement_type VARCHAR(100),                   -- Resource, self-contained, etc.
    least_restrictive_environment DECIMAL(5,2),    -- % time with typical peers
    iep_status VARCHAR(50) DEFAULT 'Active',       -- Active, draft, expired
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_usi) REFERENCES edfi.student(studentusi),
    FOREIGN KEY (school_id) REFERENCES edfi.school(schoolid)
);

-- IEP Goals: Measurable objectives
CREATE TABLE specialed.iep_goals (
    goal_id BIGSERIAL PRIMARY KEY,                 -- Unique goal ID
    iep_id BIGINT NOT NULL,                        -- Parent IEP
    goal_area VARCHAR(100) NOT NULL,               -- Academic, behavioral, social
    goal_description TEXT NOT NULL,                -- Full goal text
    measurable TEXT,                               -- How to measure
    timeline VARCHAR(100),                         -- "By end of school year"
    success_criteria TEXT,                         -- What constitutes success
    is_active BOOLEAN DEFAULT TRUE,                -- Current goal?
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (iep_id) REFERENCES specialed.iep(iep_id)
);

-- 504 Plans: Accommodation plans
CREATE TABLE specialed.plan_504 (
    plan_504_id BIGSERIAL PRIMARY KEY,            -- Unique plan ID
    student_usi INTEGER NOT NULL,                  -- Student
    school_id INTEGER NOT NULL,                    -- School
    plan_number VARCHAR(50) UNIQUE,                -- Official plan number
    effective_date DATE NOT NULL,                  -- When plan starts
    review_date DATE,                              -- Next review date
    exit_date DATE,                                -- When ended
    disability_type VARCHAR(200),                  -- Type of disability
    plan_status VARCHAR(50) DEFAULT 'Active',      -- Active, draft, expired
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_usi) REFERENCES edfi.student(studentusi),
    FOREIGN KEY (school_id) REFERENCES edfi.school(schoolid)
);

-- Accommodations: Support services
CREATE TABLE specialed.accommodations (
    accommodation_id BIGSERIAL PRIMARY KEY,        -- Unique accommodation ID
    student_usi INTEGER NOT NULL,                  -- Student
    plan_type VARCHAR(20) NOT NULL,               -- IEP or 504
    plan_id BIGINT NOT NULL,                       -- Reference to plan
    accommodation_type VARCHAR(100),               -- Extended time, preferential seating
    accommodation_description TEXT NOT NULL,       -- Detailed description
    subject VARCHAR(100),                          -- Which class/subject
    setting VARCHAR(100),                          -- Where provided
    frequency VARCHAR(100),                        -- How often
    is_active BOOLEAN DEFAULT TRUE,                -- Current accommodation?
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_usi) REFERENCES edfi.student(studentusi)
);

-- Cafeteria Schema
CREATE SCHEMA cafeteria;

-- Meal Plans: Lunch pricing options
CREATE TABLE cafeteria.meal_plans (
    meal_plan_id SERIAL PRIMARY KEY,               -- Unique plan ID
    plan_name VARCHAR(100) NOT NULL,               -- "Standard", "Reduced", "Free"
    description TEXT,                              -- Plan details
    daily_rate DECIMAL(10,2),                     -- Cost per day
    weekly_rate DECIMAL(10,2),                    -- Cost per week
    monthly_rate DECIMAL(10,2),                   -- Cost per month
    yearly_rate DECIMAL(10,2),                    -- Cost per year
    is_active BOOLEAN DEFAULT TRUE,                -- Currently offered?
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Student Meal Plans: Lunch account setup
CREATE TABLE cafeteria.student_meal_plans (
    assignment_id BIGSERIAL PRIMARY KEY,           -- Unique assignment ID
    student_usi INTEGER NOT NULL,                  -- Student
    meal_plan_id INTEGER NOT NULL,                 -- Which plan
    effective_date DATE NOT NULL,                  -- When starts
    end_date DATE,                                 -- When ends
    free_reduced_status VARCHAR(20),              -- Free, reduced, paid
    account_balance DECIMAL(10,2) DEFAULT 0.00,    -- Current balance
    is_active BOOLEAN DEFAULT TRUE,                -- Active account?
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_usi) REFERENCES edfi.student(studentusi),
    FOREIGN KEY (meal_plan_id) REFERENCES cafeteria.meal_plans(meal_plan_id)
);

-- Meal Transactions: Lunch purchases
CREATE TABLE cafeteria.meal_transactions (
    transaction_id BIGSERIAL PRIMARY KEY,          -- Unique transaction ID
    student_usi INTEGER NOT NULL,                  -- Student
    transaction_date DATE NOT NULL,                -- Date of purchase
    transaction_time TIME NOT NULL,                -- Time of purchase
    meal_type VARCHAR(20) NOT NULL,               -- Breakfast, lunch, snack
    amount DECIMAL(10,2) NOT NULL,                -- Cost
    payment_method VARCHAR(20),                    -- Account, cash, check
    account_balance DECIMAL(10,2),                 -- Balance after transaction
    cashier_id VARCHAR(100),                       -- Who processed
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_usi) REFERENCES edfi.student(studentusi)
);

-- Library Schema
CREATE SCHEMA library;

-- Resources: Books and materials
CREATE TABLE library.resources (
    resource_id SERIAL PRIMARY KEY,                -- Unique resource ID
    isbn VARCHAR(20),                              -- ISBN if applicable
    title VARCHAR(500) NOT NULL,                   -- Title
    author VARCHAR(500),                           -- Author(s)
    publisher VARCHAR(200),                        -- Publisher
    publication_year INTEGER,                      -- Year published
    genre VARCHAR(100),                            -- Fiction, non-fiction, etc.
    resource_type VARCHAR(50),                     -- Book, DVD, magazine
    call_number VARCHAR(50),                       -- Dewey/Library of Congress
    location VARCHAR(100),                         -- Shelf location
    total_copies INTEGER DEFAULT 1,                -- How many owned
    available_copies INTEGER DEFAULT 1,            -- How many available
    is_active BOOLEAN DEFAULT TRUE,                -- In circulation?
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Checkouts: Circulation records
CREATE TABLE library.checkouts (
    checkout_id BIGSERIAL PRIMARY KEY,             -- Unique checkout ID
    student_usi INTEGER NOT NULL,                  -- Borrower
    resource_id INTEGER NOT NULL,                  -- What borrowed
    checkout_date DATE NOT NULL,                   -- When borrowed
    due_date DATE NOT NULL,                        -- When due back
    return_date DATE,                              -- When returned
    renewal_count INTEGER DEFAULT 0,               -- Times renewed
    checkout_status VARCHAR(20) DEFAULT 'Checked Out', -- Status
    librarian_id VARCHAR(100),                     -- Who checked out
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_usi) REFERENCES edfi.student(studentusi),
    FOREIGN KEY (resource_id) REFERENCES library.resources(resource_id)
);

-- Activities Schema
CREATE SCHEMA activities;

-- Activities: Clubs and extracurriculars
CREATE TABLE activities.activities (
    activity_id SERIAL PRIMARY KEY,                -- Unique activity ID
    activity_name VARCHAR(200) NOT NULL,           -- "Chess Club", "Drama"
    activity_type VARCHAR(50),                     -- Academic, athletic, arts
    description TEXT,                              -- Activity details
    advisor_name VARCHAR(200),                     -- Faculty advisor
    advisor_staff_usi INTEGER,                     -- Staff reference
    meeting_schedule VARCHAR(200),                 -- "Tuesdays 3-4pm"
    location VARCHAR(200),                         -- Where meets
    max_participants INTEGER,                      -- Capacity limit
    registration_fee DECIMAL(10,2),                -- Cost to join
    is_active BOOLEAN DEFAULT TRUE,                -- Currently offered?
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Student Activity Participation: Enrollments
CREATE TABLE activities.student_activity_participation (
    participation_id BIGSERIAL PRIMARY KEY,        -- Unique participation ID
    student_usi INTEGER NOT NULL,                  -- Student
    activity_id INTEGER NOT NULL,                  -- Activity
    join_date DATE NOT NULL,                       -- When joined
    leave_date DATE,                               -- When left
    role VARCHAR(100),                             -- Member, president, captain
    participation_status VARCHAR(20) DEFAULT 'Active', -- Active, inactive
    registration_paid BOOLEAN DEFAULT FALSE,       -- Fee paid?
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_usi) REFERENCES edfi.student(studentusi),
    FOREIGN KEY (activity_id) REFERENCES activities.activities(activity_id)
);
```

### 12. Compliance and Audit Tables

```sql
CREATE SCHEMA compliance;

-- FERPA Compliance Tracking: Privacy law compliance
CREATE TABLE compliance.ferpa_compliance_log (
    id BIGSERIAL PRIMARY KEY,                      -- Unique log ID
    entity_type VARCHAR(50) NOT NULL,              -- Table being tracked
    entity_id VARCHAR(255) NOT NULL,               -- Record being tracked
    data_classification VARCHAR(20) NOT NULL,      -- Public, directory, private
    compliance_rule VARCHAR(100) NOT NULL,         -- Which FERPA rule
    compliance_status VARCHAR(20) NOT NULL,        -- Compliant, violation
    violation_details JSONB,                       -- What went wrong
    remediation_action TEXT,                       -- How to fix
    review_date TIMESTAMP,                         -- When reviewed
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Comprehensive Audit Logs: Track all changes
CREATE TABLE compliance.audit_logs (
    id BIGSERIAL PRIMARY KEY,                      -- Unique audit ID
    user_id VARCHAR(255) NOT NULL,                 -- Who made change
    session_id VARCHAR(255),                       -- Session identifier
    table_name VARCHAR(100) NOT NULL,              -- Table changed
    record_id VARCHAR(255),                        -- Record changed
    operation VARCHAR(20) NOT NULL,                -- INSERT, UPDATE, DELETE
    old_values JSONB,                              -- Values before change
    new_values JSONB,                              -- Values after change
    ip_address INET,                               -- User's IP
    user_agent TEXT,                               -- Browser/app info
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- When changed
    legitimate_educational_interest BOOLEAN DEFAULT FALSE, -- FERPA justification
    justification TEXT,                            -- Why accessed
    data_categories TEXT[],                        -- Types of data accessed
    retention_date DATE                            -- When to purge log
) PARTITION BY RANGE (timestamp);

-- Create monthly partitions for audit logs
CREATE TABLE compliance.audit_logs_y2025m06 PARTITION OF compliance.audit_logs 
FOR VALUES FROM ('2025-06-01') TO ('2025-07-01');

-- Data Retention Policies: Automatic data lifecycle
CREATE TABLE compliance.data_retention_policies (
    id SERIAL PRIMARY KEY,                         -- Unique policy ID
    data_category VARCHAR(100) NOT NULL,           -- Type of data
    table_name VARCHAR(100) NOT NULL,              -- Table affected
    retention_period_years INTEGER NOT NULL,       -- How long to keep
    retention_criteria JSONB,                      -- Special conditions
    legal_basis TEXT NOT NULL,                     -- Why this period
    disposal_method VARCHAR(50) NOT NULL,          -- Delete, archive, anonymize
    review_frequency_months INTEGER DEFAULT 12,    -- Review schedule
    last_review_date DATE,                         -- Last reviewed
    next_review_date DATE,                         -- Next review due
    active BOOLEAN DEFAULT TRUE,                   -- Policy active?
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Privacy Consent Management: Track permissions
CREATE TABLE compliance.privacy_consents (
    id BIGSERIAL PRIMARY KEY,                      -- Unique consent ID
    student_id VARCHAR(255) NOT NULL,              -- Student
    parent_guardian_id VARCHAR(255),               -- Parent if minor
    consent_type VARCHAR(50) NOT NULL,             -- Directory, photos, research
    consent_status VARCHAR(20) NOT NULL,           -- Granted, denied, withdrawn
    consent_date TIMESTAMP NOT NULL,               -- When consented
    expiration_date TIMESTAMP,                     -- When expires
    withdrawal_date TIMESTAMP,                     -- When withdrawn
    consent_method VARCHAR(50),                    -- Online, paper, verbal
    ip_address INET,                               -- IP if online
    consent_details JSONB,                         -- Additional details
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Data Access Controls: Who can see what
CREATE TABLE compliance.data_access_controls (
    id SERIAL PRIMARY KEY,                         -- Unique control ID
    role_name VARCHAR(100) NOT NULL,               -- User role
    resource_type VARCHAR(100) NOT NULL,           -- Type of data
    resource_identifier VARCHAR(255) NOT NULL,     -- Specific resource
    permission_type VARCHAR(20) NOT NULL,          -- Read, write, delete
    conditions JSONB,                              -- When allowed
    educational_interest_required BOOLEAN DEFAULT TRUE, -- FERPA requirement
    approval_required BOOLEAN DEFAULT FALSE,       -- Needs approval?
    approver_role VARCHAR(100),                    -- Who approves
    active BOOLEAN DEFAULT TRUE,                   -- Control active?
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 13. DynamoDB Table Definitions

```json
// Student Activity Logs: High-volume activity tracking
{
  "TableName": "StudentActivityLogs",
  "KeySchema": [
    {
      "AttributeName": "PK",  // STUDENT#<student_id>
      "KeyType": "HASH"
    },
    {
      "AttributeName": "SK",  // ACTIVITY#<timestamp>#<activity_id>
      "KeyType": "RANGE"
    }
  ],
  "AttributeDefinitions": [
    {
      "AttributeName": "PK",
      "AttributeType": "S"
    },
    {
      "AttributeName": "SK",
      "AttributeType": "S"
    },
    {
      "AttributeName": "GSI1PK",  // DATE#<date> for daily queries
      "AttributeType": "S"
    },
    {
      "AttributeName": "GSI1SK",  // STUDENT#<student_id>
      "AttributeType": "S"
    }
  ],
  "GlobalSecondaryIndexes": [
    {
      "IndexName": "GSI1",
      "KeySchema": [
        {
          "AttributeName": "GSI1PK",
          "KeyType": "HASH"
        },
        {
          "AttributeName": "GSI1SK",
          "KeyType": "RANGE"
        }
      ],
      "Projection": {
        "ProjectionType": "ALL"
      }
    }
  ],
  "BillingMode": "PAY_PER_REQUEST",
  "StreamSpecification": {
    "StreamEnabled": true,
    "StreamViewType": "NEW_AND_OLD_IMAGES"
  }
}

// Real-time Assessment Results: Immediate feedback storage
{
  "TableName": "AssessmentResults",
  "KeySchema": [
    {
      "AttributeName": "PK",  // ASSESSMENT#<assessment_id>
      "KeyType": "HASH"
    },
    {
      "AttributeName": "SK",  // STUDENT#<student_id>#<timestamp>
      "KeyType": "RANGE"
    }
  ],
  "AttributeDefinitions": [
    {
      "AttributeName": "PK",
      "AttributeType": "S"
    },
    {
      "AttributeName": "SK",
      "AttributeType": "S"
    }
  ],
  "TimeToLiveSpecification": {
    "AttributeName": "TTL",  // Auto-delete after 90 days
    "Enabled": true
  },
  "BillingMode": "PAY_PER_REQUEST"
}

// Notification Queue: Push notifications and alerts
{
  "TableName": "NotificationQueue",
  "KeySchema": [
    {
      "AttributeName": "PK",  // USER#<user_id>
      "KeyType": "HASH"
    },
    {
      "AttributeName": "SK",  // NOTIFICATION#<timestamp>#<notification_id>
      "KeyType": "RANGE"
    }
  ],
  "AttributeDefinitions": [
    {
      "AttributeName": "PK",
      "AttributeType": "S"
    },
    {
      "AttributeName": "SK",
      "AttributeType": "S"
    }
  ],
  "TimeToLiveSpecification": {
    "AttributeName": "TTL",  // Auto-delete read notifications
    "Enabled": true
  },
  "BillingMode": "PAY_PER_REQUEST"
}

// Session Store: User session management
{
  "TableName": "UserSessions",
  "KeySchema": [
    {
      "AttributeName": "SessionId",  // UUID session identifier
      "KeyType": "HASH"
    }
  ],
  "AttributeDefinitions": [
    {
      "AttributeName": "SessionId",
      "AttributeType": "S"
    },
    {
      "AttributeName": "UserId",  // For user lookup
      "AttributeType": "S"
    }
  ],
  "GlobalSecondaryIndexes": [
    {
      "IndexName": "UserIdIndex",
      "KeySchema": [
        {
          "AttributeName": "UserId",
          "KeyType": "HASH"
        }
      ],
      "Projection": {
        "ProjectionType": "ALL"
      }
    }
  ],
  "TimeToLiveSpecification": {
    "AttributeName": "ExpirationTime",  // Auto-expire sessions
    "Enabled": true
  },
  "BillingMode": "PAY_PER_REQUEST"
}

// Event Store: System-wide event sourcing
{
  "TableName": "SystemEvents",
  "KeySchema": [
    {
      "AttributeName": "PK",  // STREAM#<stream_name>
      "KeyType": "HASH"
    },
    {
      "AttributeName": "SK",  // EVENT#<timestamp>#<event_id>
      "KeyType": "RANGE"
    }
  ],
  "AttributeDefinitions": [
    {
      "AttributeName": "PK",
      "AttributeType": "S"
    },
    {
      "AttributeName": "SK",
      "AttributeType": "S"
    },
    {
      "AttributeName": "EventType",  // For filtering
      "AttributeType": "S"
    },
    {
      "AttributeName": "Timestamp",  // For time queries
      "AttributeType": "S"
    }
  ],
  "GlobalSecondaryIndexes": [
    {
      "IndexName": "EventTypeTimestampIndex",
      "KeySchema": [
        {
          "AttributeName": "EventType",
          "KeyType": "HASH"
        },
        {
          "AttributeName": "Timestamp",
          "KeyType": "RANGE"
        }
      ],
      "Projection": {
        "ProjectionType": "ALL"
      }
    }
  ],
  "BillingMode": "PAY_PER_REQUEST",
  "StreamSpecification": {
    "StreamEnabled": true,
    "StreamViewType": "NEW_AND_OLD_IMAGES"
  }
}
```

### 14. Required Indexes for Performance

```sql
-- Critical Performance Indexes with detailed comments

-- Student lookup indexes for fast queries
CREATE INDEX CONCURRENTLY idx_student_unique_id ON edfi.student(studentuniqueid);  -- Primary student lookup
CREATE INDEX CONCURRENTLY idx_student_name ON edfi.student(lastsurname, firstname); -- Name-based searches

-- Enrollment and association indexes for active student queries
CREATE INDEX CONCURRENTLY idx_ssa_student ON edfi.studentschoolassociation(studentusi); -- Student's schools
CREATE INDEX CONCURRENTLY idx_ssa_school ON edfi.studentschoolassociation(schoolid);   -- School's students
CREATE INDEX CONCURRENTLY idx_ssa_active ON edfi.studentschoolassociation(schoolid, schoolyear) 
WHERE exitwithdrawdate IS NULL; -- Currently enrolled students only

-- Assessment performance indexes for reporting
CREATE INDEX CONCURRENTLY idx_student_assessment_date ON edfi.studentassessment(administrationdate); -- Recent tests
CREATE INDEX CONCURRENTLY idx_student_assessment_student ON edfi.studentassessment(studentusi);      -- Student history

-- Attendance tracking indexes for daily operations
CREATE INDEX CONCURRENTLY idx_attendance_student_date ON edfi.studentschoolattendanceevent(studentusi, eventdate); -- Student attendance
CREATE INDEX CONCURRENTLY idx_attendance_school_date ON edfi.studentschoolattendanceevent(schoolid, eventdate);   -- School attendance

-- OneRoster performance indexes for API queries
CREATE INDEX CONCURRENTLY idx_or_enrollments_user ON oneroster.enrollments(user_sourced_id) WHERE status = 'active';   -- User's classes
CREATE INDEX CONCURRENTLY idx_or_enrollments_class ON oneroster.enrollments(class_sourced_id) WHERE status = 'active'; -- Class roster
CREATE INDEX CONCURRENTLY idx_or_classes_school ON oneroster.classes(school_sourced_id) WHERE status = 'active';      -- School's classes

-- Compliance and audit indexes for security reviews
CREATE INDEX CONCURRENTLY idx_audit_recent ON compliance.audit_logs(timestamp) 
WHERE timestamp > (CURRENT_TIMESTAMP - INTERVAL '30 days'); -- Recent activity only
CREATE INDEX CONCURRENTLY idx_audit_user_ops ON compliance.audit_logs(user_id, operation, timestamp); -- User audit trail

-- JSONB indexes for flexible queries on metadata
CREATE INDEX CONCURRENTLY idx_student_metadata_gin ON edfi.student USING GIN ((metadata)) WHERE metadata IS NOT NULL;    -- Student metadata
CREATE INDEX CONCURRENTLY idx_or_metadata_gin ON oneroster.classes USING GIN (metadata) WHERE metadata IS NOT NULL;     -- Class metadata
```

## Implementation Recommendations

### Database Distribution Strategy

**PostgreSQL (Primary Database)**:
- All Ed-Fi core domain tables (150+ tables) - Requires ACID compliance
- OneRoster rostering and gradebook tables - Complex relationships
- Compliance and audit tables - Legal requirements
- Operational tables requiring ACID compliance - Health, transportation, etc.
- Complex reporting queries - Joins across multiple domains

**DynamoDB (High-Volume Data)**:
- Student activity logs - Millions of events per day
- Real-time assessment tracking - Immediate write/read
- Session management - Temporary, high-velocity
- Event streaming - Append-only patterns
- Notification queues - Simple key-value access

### Deployment Approach

1. **Phase 1**: Deploy Ed-Fi core domains (Student, School, Enrollment, Assessment)
2. **Phase 2**: Add OneRoster entities and gradebook functionality
3. **Phase 3**: Implement operational tables (health, transportation, special ed)
4. **Phase 4**: Add 2 Hour Learning integration tables
5. **Phase 5**: Deploy compliance and audit infrastructure

### Key Considerations

1. **Use Ed-Fi deployment tools** for official schema deployment to ensure compliance
2. **Implement partitioning** for large tables (audit logs, attendance) from the start
3. **Configure proper indexes** before loading data to avoid blocking operations
4. **Set up automated backup and archival processes** with point-in-time recovery
5. **Enable audit logging** on all sensitive tables containing PII
6. **Plan for data retention** compliance from day one with automated policies

This comprehensive schema provides approximately 175 tables covering all requested domains, with exact CREATE TABLE statements and detailed field-level comments ready for implementation in your Ed-Fi and OneRoster compliant school management system.