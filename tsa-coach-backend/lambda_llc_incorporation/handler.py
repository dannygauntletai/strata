# Main handler that redirects to Docker implementation
# This ensures backwards compatibility while using the new Docker approach

from docker_handler import lambda_handler

# Export the lambda_handler for AWS Lambda
__all__ = ['lambda_handler'] 