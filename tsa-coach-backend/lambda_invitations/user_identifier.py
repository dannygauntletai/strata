"""
User Identifier Utilities
Handles normalization of user identifiers (coach IDs, emails) for consistent database lookups
"""
import boto3
from typing import Union, Optional
from botocore.exceptions import ClientError


class UserIdentifier:
    """Handles user identifier normalization and validation"""
    
    @staticmethod
    def normalize_coach_id(identifier: Union[str, int], profiles_table) -> Optional[str]:
        """
        Normalize coach identifier - can be coach_id or email
        
        Args:
            identifier: Either a coach_id (int/str) or email address (str)
            profiles_table: DynamoDB table resource for coach profiles
            
        Returns:
            Normalized coach_id as string, or None if not found
        """
        try:
            # If identifier looks like an email (contains @)
            if isinstance(identifier, str) and '@' in identifier:
                return UserIdentifier._get_coach_id_by_email(identifier, profiles_table)
            
            # If identifier is numeric or numeric string, treat as coach_id
            try:
                coach_id = str(int(identifier))  # Convert to string representation of int
                return coach_id
            except (ValueError, TypeError):
                # If not numeric, try as direct lookup
                return str(identifier)
                
        except Exception as e:
            print(f"Error normalizing coach identifier '{identifier}': {e}")
            return None
    
    @staticmethod
    def _get_coach_id_by_email(email: str, profiles_table) -> Optional[str]:
        """
        Look up coach_id by email address
        
        Args:
            email: Email address to look up
            profiles_table: DynamoDB table resource
            
        Returns:
            Coach ID as string if found, None otherwise
        """
        try:
            # Scan table for matching email (assuming email is stored in the profile)
            response = profiles_table.scan(
                FilterExpression='email = :email',
                ExpressionAttributeValues={':email': email}
            )
            
            items = response.get('Items', [])
            if items:
                # Return the coach_id from the first matching record
                coach_id = items[0].get('coach_id')
                return str(coach_id) if coach_id is not None else None
            
            return None
            
        except ClientError as e:
            print(f"Error looking up coach by email '{email}': {e}")
            return None
        except Exception as e:
            print(f"Unexpected error looking up coach by email '{email}': {e}")
            return None 