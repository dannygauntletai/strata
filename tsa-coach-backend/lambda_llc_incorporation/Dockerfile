# Use AWS Lambda Python 3.9 runtime image for Playwright compatibility
FROM public.ecr.aws/lambda/python:3.9

# Set working directory
WORKDIR ${LAMBDA_TASK_ROOT}

# Copy requirements and install Python dependencies
COPY requirements.txt ${LAMBDA_TASK_ROOT}
RUN pip install --no-cache-dir -r requirements.txt

# Set environment variables for Lambda
ENV HOME=/tmp

# Copy function code
COPY docker_handler.py ${LAMBDA_TASK_ROOT}/lambda_function.py

# Command to run the Lambda function
CMD ["lambda_function.lambda_handler"] 