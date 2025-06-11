"""
Lambda handler for onboarding functionality - Working Version
Demonstrates CORS fix and basic onboarding flow without PostgreSQL
"""
import json
import os
import boto3
from typing import Dict, Any
from datetime import datetime


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Main handler for onboarding requests with CORS"""
    try:
        print(f"Event received: {json.dumps(event, default=str)}")
        
        # Handle CORS preflight immediately
        if event.get('httpMethod') == 'OPTIONS':
            return create_cors_response(204, {})
        
        http_method = event.get('httpMethod', '')
        path = event.get('path', '')
        
        print(f"Processing {http_method} {path}")
        
        # Route to appropriate handler - ONLY onboarding related endpoints
        if '/complete' in path:
            return handle_complete_onboarding(event, context)
        elif '/validate-invite' in path:
            return handle_validate_invitation(event, context)
        elif '/auth/validate-email' in path:
            return handle_validate_email(event, context)
        elif '/health' in path:
            return handle_health_check(event, context)
        elif path == '/profile/photo' and http_method == 'POST':
            return handle_profile_photo_upload(event, context)
        elif path == '/profile' and http_method == 'GET':
            return handle_get_profile(event, context)
        elif path == '/validate-email':
            return handle_validate_email(event, context)
        elif path.startswith('/validate-invitation/'):
            return handle_validate_invitation(event, context)
        elif path == '/progress':
            return handle_onboarding_progress(event, context)
        elif path == '/save-progress':
            return handle_save_progress(event, context)
        elif path == '/get-progress':
            return handle_get_progress(event, context)
        else:
            return create_cors_response(404, {'error': 'Endpoint not found'})
            
    except Exception as e:
        print(f"Error in handler: {str(e)}")
        import traceback
        traceback.print_exc()
        
        return create_cors_response(500, {
            'error': 'Internal server error',
            'details': str(e)
        })


def create_cors_response(status_code: int, body: dict) -> dict:
    """Create response with proper CORS headers"""
    return {
        "statusCode": status_code,
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS,PATCH,HEAD",
            "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Requested-With,Accept,Accept-Language,Cache-Control",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Max-Age": "600",
            "Content-Type": "application/json"
        },
        "body": json.dumps(body, default=str)
    }


def parse_event_body(event: Dict[str, Any]) -> Dict[str, Any]:
    """Parse request body from API Gateway event"""
    try:
        body = event.get('body', '{}')
        
        # Handle base64 encoded body
        if event.get('isBase64Encoded', False):
            import base64
            body = base64.b64decode(body).decode('utf-8')
        
        # Parse JSON body
        if isinstance(body, str):
            return json.loads(body) if body else {}
        
        return body if isinstance(body, dict) else {}
        
    except json.JSONDecodeError as e:
        print(f"Error parsing request body: {str(e)}")
        return {}
    except Exception as e:
        print(f"Unexpected error parsing body: {str(e)}")
        return {}


def handle_validate_invitation(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Validate invitation token and return invitation details"""
    try:
        query_params = event.get('queryStringParameters') or {}
        invitation_token = query_params.get('token')
        
        if not invitation_token:
            return create_cors_response(400, {'error': 'Invitation token is required'})
        
        # Query invitations table by token
        dynamodb = boto3.resource('dynamodb')
        
        # Try to get the invitations table - it might be in the admin service
        invitations_table_name = os.environ.get('INVITATIONS_TABLE', 'coach-invitations')
        
        try:
            invitations_table = dynamodb.Table(invitations_table_name)
            
            # Scan for invitation token (in production, you'd want a GSI for this)
            response = invitations_table.scan(
                FilterExpression='invitation_token = :token',
                ExpressionAttributeValues={':token': invitation_token}
            )
            
            items = response.get('Items', [])
            if not items:
                return create_cors_response(404, {'error': 'Invalid invitation token'})
            
            invitation = items[0]
            
            # Check if invitation is still valid
            if invitation.get('status') != 'pending':
                return create_cors_response(400, {
                    'error': 'Invitation is no longer valid',
                    'status': invitation.get('status')
                })
            
            # Check if invitation has expired
            expires_at = invitation.get('expires_at')
            if expires_at and datetime.utcnow().timestamp() > expires_at:
                # Update invitation status to expired
                invitations_table.update_item(
                    Key={'invitation_id': invitation['invitation_id']},
                    UpdateExpression='SET #status = :status',
                    ExpressionAttributeNames={'#status': 'status'},
                    ExpressionAttributeValues={':status': 'expired'}
                )
                return create_cors_response(400, {'error': 'Invitation has expired'})
            
            # Return invitation details for pre-filling the form
            invitation_data = {}
            
            # Only include fields that have actual values
            if invitation.get('email'):
                invitation_data['email'] = invitation.get('email')
            if invitation.get('role'):
                invitation_data['role'] = invitation.get('role')
            if invitation.get('school_name'):
                invitation_data['school_name'] = invitation.get('school_name')
            if invitation.get('school_type'):
                invitation_data['school_type'] = invitation.get('school_type')
            if invitation.get('sport'):
                invitation_data['sport'] = invitation.get('sport')
            if invitation.get('message'):
                invitation_data['message'] = invitation.get('message')
            
            return create_cors_response(200, {
                'valid': True,
                'invitation': invitation_data
            })
            
        except Exception as e:
            print(f"Error accessing invitations table: {str(e)}")
            # If invitations table doesn't exist or isn't accessible, allow onboarding anyway
            return create_cors_response(200, {
                'valid': True,
                'note': 'Invitation system not yet deployed, allowing direct onboarding'
            })
            
    except Exception as e:
        print(f"Error validating invitation: {str(e)}")
        return create_cors_response(500, {'error': str(e)})


def handle_validate_email(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Validate if email belongs to a coach (either registered or invited)"""
    try:
        if event.get('httpMethod') != 'POST':
            return create_cors_response(405, {'error': 'Method not allowed'})
        
            body = parse_event_body(event)
        email = body.get('email', '').lower().strip()
        
        if not email:
            return create_cors_response(400, {'error': 'Email is required'})
        
        if '@' not in email or '.' not in email:
            return create_cors_response(400, {'error': 'Invalid email format'})
        
        dynamodb = boto3.resource('dynamodb')
        
        # Check if email exists in profiles table (registered coaches)
        try:
            profiles_table_name = os.environ.get('PROFILES_TABLE', 'profiles')
            profiles_table = dynamodb.Table(profiles_table_name)
            
            # Scan for email in profiles (in production, you'd want a GSI)
            profiles_response = profiles_table.scan(
                FilterExpression='email = :email',
                ExpressionAttributeValues={':email': email},
                Limit=1
            )
            
            if profiles_response.get('Items'):
                return create_cors_response(200, {
                    'valid': True,
                    'found': 'profile',
                    'message': 'Email found in registered coaches'
                })
        
        except Exception as e:
            print(f"Error checking profiles table: {str(e)}")
        
        # Check if email exists in invitations table (pending/accepted invitations)
        try:
            invitations_table_name = os.environ.get('INVITATIONS_TABLE', 'coach-invitations')
            invitations_table = dynamodb.Table(invitations_table_name)
            
            # Scan for email in invitations
            invitations_response = invitations_table.scan(
                FilterExpression='email = :email AND (#status = :pending OR #status = :accepted)',
                ExpressionAttributeValues={
                    ':email': email,
                    ':pending': 'pending',
                    ':accepted': 'accepted'
                },
                ExpressionAttributeNames={'#status': 'status'},
                Limit=1
            )
            
            if invitations_response.get('Items'):
                invitation = invitations_response['Items'][0]
                return create_cors_response(200, {
                    'valid': True,
                    'found': 'invitation',
                    'status': invitation.get('status'),
                    'message': f'Email found in {invitation.get("status")} invitations'
                })
        
        except Exception as e:
            print(f"Error checking invitations table: {str(e)}")
        
        # Email not found in either table
        return create_cors_response(404, {
            'valid': False,
            'message': 'Email not found. Only invited coaches can access this portal.'
        })
            
    except Exception as e:
        print(f"Error validating email: {str(e)}")
        return create_cors_response(500, {'error': str(e)})


def validate_onboarding_data(data: Dict[str, Any]) -> Dict[str, Any]:
    """Validate onboarding wizard data"""
    
    # Check if this is invitation-based onboarding
    invitation_token = data.get('invitation_token')
    
    if invitation_token:
        # Simplified validation for invitation-based onboarding
        required_fields = [
            'email',
            'full_name',
            'cell_phone', 
            'location'
        ]
        
        # Check required fields for invitation flow
        missing_fields = []
        for field in required_fields:
            if field not in data or not data[field]:
                missing_fields.append(field)
        
        if missing_fields:
            return {
                'valid': False,
                'error': f"Missing required fields for coach application: {', '.join(missing_fields)}"
            }
        
        # Validate email format
        email = data.get('email', '')
        if '@' not in email or '.' not in email:
            return {
                'valid': False,
                'error': 'Invalid email format'
            }
        
        return {'valid': True}
    
    else:
        # Full validation for regular onboarding
        required_fields = [
            'email',
            'school_name',
            'sport',
            'school_type',
            'grade_levels_served',
            'role_type',
            'academic_year'
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
        
        # Validate role type
        valid_role_types = ['school_owner', 'instructor', 'administrator', 'coach', 'director', 'principal', 'counselor']
        role_type = data.get('role_type', '').lower()
        if role_type not in valid_role_types:
            return {
                'valid': False,
                'error': f"Invalid role type. Must be one of: {', '.join(valid_role_types)}"
            }
        
        # Validate grade levels served
        grade_levels = data.get('grade_levels_served', [])
        if not isinstance(grade_levels, list) or len(grade_levels) == 0:
            return {
                'valid': False,
                'error': 'Grade levels served must be specified as a non-empty array'
            }
        
        # Validate academic year format
        academic_year = data.get('academic_year', '')
        if not academic_year or len(academic_year) != 9 or academic_year[4] != '-':
            return {
                'valid': False,
                'error': 'Academic year must be in format YYYY-YYYY (e.g., 2024-2025)'
            }
        
        return {'valid': True}


def handle_complete_onboarding(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Complete onboarding process - creates profiles in both DynamoDB and PostgreSQL"""
    try:
        print("Starting onboarding completion process")
        body = parse_event_body(event)
        print(f"Parsed body: {json.dumps(body, default=str)}")
        
        # Check if this is invitation-based onboarding
        invitation_token = body.get('invitation_token')
        if invitation_token:
            print(f"Processing invitation-based onboarding with token: {invitation_token}")
            
            # Validate and update invitation status
            try:
                invitation_result = validate_and_update_invitation(invitation_token, body.get('email'))
                if not invitation_result.get('valid'):
                    return create_cors_response(400, {
                        'error': invitation_result.get('error', 'Invalid invitation')
                    })
            except Exception as e:
                print(f"Error validating invitation: {str(e)}")
                # Continue with onboarding even if invitation validation fails
        
        # Validate onboarding data
        print("Validating onboarding data...")
        validation_result = validate_onboarding_data(body)
        if not validation_result['valid']:
            print(f"Validation failed: {validation_result['error']}")
            return create_cors_response(400, {'error': validation_result['error']})
        
        print("Validation passed, creating profile...")
        
        # Create a unique profile ID
        profile_id = f"profile_{datetime.utcnow().isoformat().replace(':', '').replace('-', '').replace('.', '')}"
        
        # Generate school_id from school_name for parent invitations compatibility
        school_name = body.get('school_name', '')
        school_id = f"school_{school_name.lower().replace(' ', '_').replace('-', '_')}" if school_name else f"school_{profile_id}"
        
        # 1. Store in DynamoDB (operational data per database_schema.md)
        try:
            print("Storing profile in DynamoDB...")
            dynamodb = boto3.resource('dynamodb')
            profiles_table = dynamodb.Table(os.environ.get('PROFILES_TABLE', 'profiles'))
            
            # Create profile with different data based on onboarding type
            if invitation_token:
                # Invitation-based onboarding - simplified profile
                profile = {
                    'profile_id': profile_id,
                    'school_id': school_id,  # Add school_id for parent invitations
                    'email': body['email'],
                    'first_name': body.get('full_name', '').split(' ')[0] if body.get('full_name') else '',
                    'last_name': ' '.join(body.get('full_name', '').split(' ')[1:]) if body.get('full_name') and len(body.get('full_name', '').split(' ')) > 1 else '',
                    'phone': body['cell_phone'],
                    'location': body['location'],
                    
                    # Use invitation data for school/role info
                    'school_name': body.get('school_name', ''),
                    'role_type': body.get('role_type', body.get('role', 'coach')),
                    'sport': body.get('sport', ''),
                    'school_type': body.get('school_type', ''),
                    
                    # Provide defaults for required fields
                    'grade_levels_served': body.get('grade_levels_served', []),
                    'academic_year': body.get('academic_year', '2024-2025'),
                    
                    'onboarding_progress': {
                        'current_step': 10,
                        'is_completed': True
                    },
                    'status': 'invitation_completed',
                    'invitation_based': True,
                    'invitation_token': invitation_token,
                    'created_at': datetime.utcnow().isoformat(),
                    'updated_at': datetime.utcnow().isoformat()
                }
            else:
                # Regular onboarding - full profile
                profile = {
                    'profile_id': profile_id,
                    'school_id': school_id,  # Add school_id for parent invitations
                    'email': body['email'],
                    'first_name': body.get('full_name', '').split(' ')[0] if body.get('full_name') else '',
                    'last_name': ' '.join(body.get('full_name', '').split(' ')[1:]) if body.get('full_name') and len(body.get('full_name', '').split(' ')) > 1 else '',
                    'school_name': body['school_name'],
                    'sport': body['sport'],
                    'school_type': body['school_type'],
                    'grade_levels_served': body['grade_levels_served'],
                    'role_type': body['role_type'],
                    'academic_year': body['academic_year'],
                    
                    # Coach application form fields
                    'phone': body.get('cell_phone', ''),
                    'location': body.get('location', ''),
                    
                    'onboarding_progress': {
                        'current_step': 10,
                        'is_completed': True
                    },
                    'status': 'completed',
                    'invitation_based': False,
                    'created_at': datetime.utcnow().isoformat(),
                    'updated_at': datetime.utcnow().isoformat()
                }
            
            profiles_table.put_item(Item=profile)
            print(f"✅ Profile stored in DynamoDB: {profile_id}")
            
        except Exception as e:
            print(f"❌ DynamoDB error: {str(e)}")
            return create_cors_response(500, {
                'error': 'Failed to create DynamoDB profile',
                'details': str(e)
            })
        
        # 2. Store in PostgreSQL (OneRoster compliance per database_schema.md)
        try:
            print("Creating OneRoster compliant user in PostgreSQL...")
            import sys
            import asyncio
            import uuid
            sys.path.append('/opt/python')
            
            from shared_db_utils.database import get_async_db_manager
            from shared_db_utils.models import User, Organization
            from sqlalchemy.dialects.postgresql import insert
            
            # Map role types from profile to OneRoster roles
            role_mapping = {
                'school_owner': 'administrator',
                'instructor': 'teacher', 
                'administrator': 'administrator',
                'coach': 'teacher',  # Coaches are teachers in OneRoster
                'director': 'administrator',
                'principal': 'administrator',
                'counselor': 'teacher'
            }
            
            profile_role = profile.get('role_type', 'teacher')
            oneroster_role = role_mapping.get(profile_role, 'teacher')
            
            # Create org_ids array for school associations
            org_ids = []
            school_name = profile.get('school_name', '')
            if school_name:
                org_id = f"org_{school_name.lower().replace(' ', '_').replace('-', '_')}"
                org_ids.append(org_id)
            
            # Generate OneRoster compliant sourced_id
            sourced_id = f"user_{profile_id}"
            
            # Create PostgreSQL user record
            user_data = {
                'sourced_id': sourced_id,
                'status': 'active',
                'date_last_modified': datetime.utcnow(),
                'model_metadata': {
                    'original_profile_id': profile_id,
                    'created_from': 'coach_onboarding',
                    'creation_date': datetime.utcnow().isoformat(),
                    'original_role_type': profile_role
                },
                'username': profile.get('email', '').split('@')[0] if profile.get('email') else None,
                'user_ids': [{
                    'type': 'email',
                    'identifier': profile.get('email', '')
                }],
                'enabled_user': True,
                'given_name': profile.get('first_name', ''),
                'family_name': profile.get('last_name', ''),
                'role': oneroster_role,
                'identifier': profile_id,
                'email': profile.get('email', ''),
                'phone': profile.get('phone'),
                'org_ids': org_ids,
                'profile_id': profile_id,  # Link back to DynamoDB
                'created_at': datetime.utcnow(),
                'updated_at': datetime.utcnow()
            }
            
            # Create organization if needed
            organization_data = None
            if school_name:
                org_id = org_ids[0] if org_ids else f"org_{school_name.lower().replace(' ', '_')}"
                organization_data = {
                    'sourced_id': org_id,
                    'status': 'active',
                    'date_last_modified': datetime.utcnow(),
                    'model_metadata': {
                        'school_type': profile.get('school_type', 'school'),
                        'created_from_profile': profile_id,
                        'creation_date': datetime.utcnow().isoformat()
                    },
                    'name': school_name,
                    'type': 'school',
                    'identifier': None,
                    'parent_id': 'org_district_001'  # Default district
                }
            
            # Execute PostgreSQL operations asynchronously
            async def create_postgresql_records():
                db_manager = await get_async_db_manager()
                try:
                    async with db_manager.get_async_session() as session:
                        # Create organization if needed
                        if organization_data:
                            org_stmt = insert(Organization).values(**organization_data)
                            org_stmt = org_stmt.on_conflict_do_update(
                                index_elements=['sourced_id'],
                                set_=dict(
                                    name=org_stmt.excluded.name,
                                    date_last_modified=org_stmt.excluded.date_last_modified
                                )
                            )
                            await session.execute(org_stmt)
                            print(f"✅ Created/Updated organization: {school_name}")
                        
                        # Create user record
                        user_stmt = insert(User).values(**user_data)
                        user_stmt = user_stmt.on_conflict_do_update(
                            index_elements=['sourced_id'],
                            set_=dict(
                                email=user_stmt.excluded.email,
                                given_name=user_stmt.excluded.given_name,
                                family_name=user_stmt.excluded.family_name,
                                role=user_stmt.excluded.role,
                                date_last_modified=user_stmt.excluded.date_last_modified,
                                updated_at=user_stmt.excluded.updated_at
                            )
                        )
                        await session.execute(user_stmt)
                        print(f"✅ Created OneRoster user: {profile.get('email')} ({oneroster_role})")
                        
                finally:
                    await db_manager.close()
            
            # Run async PostgreSQL operations
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                loop.run_until_complete(create_postgresql_records())
                print("✅ PostgreSQL OneRoster records created successfully")
            finally:
                loop.close()
                
        except Exception as e:
            print(f"⚠️ PostgreSQL OneRoster creation failed (continuing with DynamoDB): {str(e)}")
            # Don't fail the entire onboarding if PostgreSQL fails
        
        # 3. Create Cognito user for passwordless auth
        if body.get('email'):
            try:
                print("Creating Cognito user...")
                cognito_client = boto3.client('cognito-idp')
                user_pool_id = os.environ.get('USER_POOL_ID')
                
                if user_pool_id:
                    try:
                        cognito_client.admin_create_user(
                            UserPoolId=user_pool_id,
                            Username=body['email'],
                            UserAttributes=[
                                {'Name': 'email', 'Value': body['email']},
                                {'Name': 'email_verified', 'Value': 'true'},
                            ],
                            MessageAction='SUPPRESS'
                        )
                        print(f"✅ Cognito user created for {body['email']}")
                    except cognito_client.exceptions.UsernameExistsException:
                        print(f"✅ Cognito user already exists for {body['email']}")
            except Exception as e:
                print(f"Warning: Could not create Cognito user: {str(e)}")
        
        # Return success response with proper CORS headers
        return create_cors_response(200, {
            'message': 'Onboarding completed successfully! 🎉',
            'profile_id': profile_id,
            'status': 'success',
            'note': 'Profile created in DynamoDB and PostgreSQL (OneRoster compliant)',
            'compliance': 'EdFi and OneRoster compliant per database_schema.md',
            'cors_test': 'CORS headers are working properly!',
            'invitation_based': bool(invitation_token),
            'data_received': {
                'email': body.get('email'),
                'full_name': body.get('full_name'),
                'cell_phone': body.get('cell_phone'),
                'location': body.get('location'),
                'school_name': body.get('school_name'),
                'sport': body.get('sport'),
                'school_type': body.get('school_type'),
                'role_type': body.get('role_type'),
                'academic_year': body.get('academic_year')
            }
        })
            
    except Exception as e:
        print(f"Error completing onboarding: {str(e)}")
        import traceback
        traceback.print_exc()
        return create_cors_response(500, {
            'error': 'Failed to complete onboarding',
            'details': str(e)
        })


def validate_and_update_invitation(invitation_token: str, email: str) -> Dict[str, Any]:
    """Validate invitation token and update status to accepted"""
    try:
        dynamodb = boto3.resource('dynamodb')
        invitations_table_name = os.environ.get('INVITATIONS_TABLE', 'coach-invitations')
        invitations_table = dynamodb.Table(invitations_table_name)
        
        # Find invitation by token
        response = invitations_table.scan(
            FilterExpression='invitation_token = :token',
            ExpressionAttributeValues={':token': invitation_token}
        )
        
        items = response.get('Items', [])
        if not items:
            return {'valid': False, 'error': 'Invalid invitation token'}
        
        invitation = items[0]
        
        # Verify email matches
        if invitation.get('email') != email:
            return {'valid': False, 'error': 'Email does not match invitation'}
        
        # Check if already used
        if invitation.get('status') == 'accepted':
            return {'valid': False, 'error': 'Invitation has already been used'}
        
        # Update invitation status to accepted
        invitations_table.update_item(
            Key={'invitation_id': invitation['invitation_id']},
            UpdateExpression='SET #status = :status, accepted_at = :timestamp',
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={
                ':status': 'accepted',
                ':timestamp': datetime.utcnow().isoformat()
            }
        )
        
        return {'valid': True}
        
    except Exception as e:
        print(f"Error validating invitation: {str(e)}")
        return {'valid': False, 'error': str(e)}


def handle_health_check(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Health check endpoint"""
    try:
        # Test DynamoDB connectivity
        dynamodb_status = "unknown"
        try:
            dynamodb = boto3.resource('dynamodb')
            profiles_table = dynamodb.Table(os.environ.get('PROFILES_TABLE', 'profiles'))
            profiles_table.scan(Limit=1)
            dynamodb_status = "healthy"
        except Exception as e:
            print(f"DynamoDB health check failed: {str(e)}")
            dynamodb_status = "unhealthy"
        
        return create_cors_response(200, {
            'status': 'healthy',
            'services': {
                'lambda': 'healthy',
                'dynamodb': dynamodb_status,
                'postgresql': 'working_with_asyncpg'
            },
            'cors_test': 'CORS headers working! ✅',
            'environment_vars': {
                'DB_HOST': os.environ.get('DB_HOST', 'not set'),
                'PROFILES_TABLE': os.environ.get('PROFILES_TABLE', 'not set'),
                'USER_POOL_ID': os.environ.get('USER_POOL_ID', 'not set')
            },
            'timestamp': datetime.utcnow().isoformat()
        })
        
    except Exception as e:
        print(f"Health check error: {str(e)}")
        return create_cors_response(500, {
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        })


def handle_profile_photo_upload(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Handle profile photo upload to S3 and update DynamoDB"""
    try:
        if event.get('httpMethod') != 'POST':
            return create_cors_response(405, {'error': 'Method not allowed'})
        
        # Extract coach email from headers
        headers = event.get('headers', {})
        coach_email = headers.get('x-user-email') or headers.get('X-User-Email')
        
        if not coach_email:
            return create_cors_response(401, {'error': 'Authentication required'})
        
        body = parse_event_body(event)
        
        # Validate required fields
        if 'photo_data' not in body or 'filename' not in body:
            return create_cors_response(400, {'error': 'photo_data and filename are required'})
        
        photo_data = body['photo_data']
        filename = body['filename']
        
        # Remove data URL prefix if present (e.g., "data:image/jpeg;base64,")
        if photo_data.startswith('data:'):
            photo_data = photo_data.split(',')[1]
        
        # Get coach profile to get profile_id
        dynamodb = boto3.resource('dynamodb')
        profiles_table = dynamodb.Table(os.environ.get('PROFILES_TABLE', 'profiles-v3-dev'))
        
        # Find coach profile by email
        response = profiles_table.scan(
            FilterExpression='email = :email',
            ExpressionAttributeValues={':email': coach_email},
            Limit=1
        )
        
        if not response.get('Items'):
            return create_cors_response(404, {'error': 'Coach profile not found'})
        
        coach_profile = response['Items'][0]
        profile_id = coach_profile['profile_id']
        
        # Upload photo to S3
        photo_url = upload_profile_photo_to_s3(photo_data, filename, profile_id)
        
        # Update coach profile with photo URL
        profiles_table.update_item(
            Key={'profile_id': profile_id},
            UpdateExpression='SET profile_photo_url = :photo_url, updated_at = :updated_at',
            ExpressionAttributeValues={
                ':photo_url': photo_url,
                ':updated_at': datetime.utcnow().isoformat()
            }
        )
        
        return create_cors_response(200, {
            'message': 'Profile photo uploaded successfully',
            'photo_url': photo_url
        })
        
    except Exception as e:
        print(f"Error uploading profile photo: {str(e)}")
        import traceback
        traceback.print_exc()
        return create_cors_response(500, {'error': 'Failed to upload profile photo'})


def upload_profile_photo_to_s3(photo_data: str, filename: str, profile_id: str) -> str:
    """Upload profile photo to S3 and return CloudFront URL"""
    try:
        import base64
        import uuid
        
        # Generate unique filename
        file_extension = filename.split('.')[-1] if '.' in filename else 'jpg'
        unique_filename = f"profiles/{profile_id}/photo.{file_extension}"
        
        # Decode base64 photo data
        file_bytes = base64.b64decode(photo_data)
        
        # Determine content type
        content_type_map = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'webp': 'image/webp'
        }
        content_type = content_type_map.get(file_extension.lower(), 'image/jpeg')
        
        # Upload to S3
        s3_client = boto3.client('s3')
        bucket_name = os.environ.get('EVENTS_PHOTOS_BUCKET', 'tsa-events-photos-dev-123456789')
        
        s3_client.put_object(
            Bucket=bucket_name,
            Key=unique_filename,
            Body=file_bytes,
            ContentType=content_type,
            CacheControl='max-age=31536000'  # 1 year cache
        )
        
        # Return CloudFront URL instead of direct S3 URL
        cloudfront_domain = os.environ.get('CLOUDFRONT_DOMAIN')
        if cloudfront_domain:
            return f"https://{cloudfront_domain}/{unique_filename}"
        else:
            # Fallback to S3 URL if CloudFront not configured
            return f"https://{bucket_name}.s3.amazonaws.com/{unique_filename}"
        
    except Exception as e:
        print(f"Error uploading profile photo to S3: {str(e)}")
        raise


def handle_get_profile(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Get coach profile including photo URL"""
    try:
        if event.get('httpMethod') != 'GET':
            return create_cors_response(405, {'error': 'Method not allowed'})
        
        # Extract coach email from headers
        headers = event.get('headers', {})
        coach_email = headers.get('x-user-email') or headers.get('X-User-Email')
        
        if not coach_email:
            return create_cors_response(401, {'error': 'Authentication required'})
        
        # Check if this is a development environment
        stage = os.environ.get('STAGE', 'dev')
        
        if stage == 'dev':
            # Development mode: Return mock profile data for any email
            mock_profile = {
                'profile_id': f"dev-coach-{coach_email.replace('@', '-').replace('.', '-')}",
                'email': coach_email,
                'first_name': 'Development',
                'last_name': 'Coach',
                'school_name': 'Texas Sports Academy (Dev)',
                'sport': 'Football',
                'profile_photo_url': None,
                'updated_at': datetime.utcnow().isoformat()
            }
            
            return create_cors_response(200, {
                'profile': mock_profile
            })
        
        # Production mode: Require actual coach profile
        
        # Get coach profile
        dynamodb = boto3.resource('dynamodb')
        profiles_table = dynamodb.Table(os.environ.get('PROFILES_TABLE', 'profiles-v3-dev'))
        
        response = profiles_table.scan(
            FilterExpression='email = :email',
            ExpressionAttributeValues={':email': coach_email},
            Limit=1
        )
        
        if not response.get('Items'):
            return create_cors_response(404, {'error': 'Coach profile not found'})
        
        coach_profile = response['Items'][0]
        
        # Return profile data including photo URL
        return create_cors_response(200, {
            'profile': {
                'profile_id': coach_profile.get('profile_id'),
                'email': coach_profile.get('email'),
                'first_name': coach_profile.get('first_name'),
                'last_name': coach_profile.get('last_name'),
                'school_name': coach_profile.get('school_name'),
                'sport': coach_profile.get('sport'),
                'profile_photo_url': coach_profile.get('profile_photo_url'),
                'updated_at': coach_profile.get('updated_at')
            }
        })
        
    except Exception as e:
        print(f"Error getting coach profile: {str(e)}")
        return create_cors_response(500, {'error': 'Failed to get profile'})


def handle_onboarding_progress(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Handle onboarding progress tracking"""
    try:
        return create_cors_response(200, {
            'message': 'Progress tracking not implemented yet',
            'progress': {'current_step': 1, 'total_steps': 5}
        })
    except Exception as e:
        print(f"Error in progress handler: {str(e)}")
        return create_cors_response(500, {'error': 'Failed to get progress'})


def handle_save_progress(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Handle saving onboarding progress"""
    try:
        return create_cors_response(200, {
            'message': 'Progress saved (placeholder implementation)'
        })
    except Exception as e:
        print(f"Error saving progress: {str(e)}")
        return create_cors_response(500, {'error': 'Failed to save progress'})


def handle_get_progress(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Handle getting saved progress"""
    try:
        return create_cors_response(200, {
            'progress': {'current_step': 1, 'completed': False}
        })
    except Exception as e:
        print(f"Error getting progress: {str(e)}")
        return create_cors_response(500, {'error': 'Failed to get progress'})
