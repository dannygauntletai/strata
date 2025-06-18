from aws_cdk import aws_dynamodb as dynamodb
from constructs import Construct
from typing import Optional, Dict, Any
from aws_cdk import aws_ssm as ssm


def get_or_create_table(
    scope: Construct,
    construct_id: str,
    table_name: str,
    **table_props
) -> dynamodb.Table:
    """
    Import existing table or create new one if it doesn't exist.
    
    Args:
        scope: CDK construct scope
        construct_id: Unique identifier for this construct
        table_name: Name of the DynamoDB table
        **table_props: Additional properties for table creation (only used if creating)
    
    Returns:
        DynamoDB Table construct
    """
    try:
        # Try to import existing table first
        table = dynamodb.Table.from_table_name(
            scope, 
            construct_id,
            table_name=table_name
        )
        return table
        
    except Exception:
        # If import fails, create new table
        table_props['table_name'] = table_name
        table = dynamodb.Table(
            scope,
            construct_id,
            **table_props
        )
        return table


def get_standard_table_props(
    partition_key: str = 'id',
    partition_key_type: dynamodb.AttributeType = dynamodb.AttributeType.STRING,
    sort_key: Optional[str] = None,
    sort_key_type: dynamodb.AttributeType = dynamodb.AttributeType.STRING,
    billing_mode: dynamodb.BillingMode = dynamodb.BillingMode.PAY_PER_REQUEST,
    removal_policy: Optional[Any] = None
) -> Dict[str, Any]:
    """
    Get standard table properties for consistent table creation.
    
    Args:
        partition_key: Partition key attribute name
        partition_key_type: Partition key data type
        sort_key: Sort key attribute name (optional)
        sort_key_type: Sort key data type
        billing_mode: Table billing mode
        removal_policy: RemovalPolicy for the table
    
    Returns:
        Dictionary of table properties
    """
    props = {
        'partition_key': dynamodb.Attribute(
            name=partition_key,
            type=partition_key_type
        ),
        'billing_mode': billing_mode
    }
    
    if sort_key:
        props['sort_key'] = dynamodb.Attribute(
            name=sort_key,
            type=sort_key_type
        )
    
    if removal_policy:
        props['removal_policy'] = removal_policy
        
    return props 


def get_or_create_ssm_parameter(scope, construct_id: str, parameter_name: str, 
                               string_value: str, description: str = None) -> None:
    """
    Handle SSM parameter creation following architectural best practices.
    
    Based on ARCHITECTURAL_DEBUGGING_GUIDE.md SSM case study:
    - Don't use versioned construct IDs (creates orphaned resources)
    - Don't use random naming (breaks infrastructure-as-code)
    - Use external parameter management for conflict-prone resources
    
    Args:
        scope: CDK construct scope
        construct_id: Base construct ID (consistent, not versioned)
        parameter_name: SSM parameter name (e.g., "/tsa/dev/api-urls/auth")
        string_value: Parameter value
        description: Optional parameter description
    
    Returns:
        None - Parameter will be managed externally to avoid CloudFormation conflicts
    """
    # Following the architectural pattern from the guide:
    # "Some resources are better managed outside CloudFormation"
    
    print(f"⚠️  SSM parameter {parameter_name} will be managed externally")
    print(f"    Run: aws ssm put-parameter --name '{parameter_name}' --value '{string_value}' --type String --overwrite")
    
    # Don't create CloudFormation resource - let deployment scripts handle it
    # This prevents "parameter already exists" conflicts while maintaining deterministic infrastructure
    return None 