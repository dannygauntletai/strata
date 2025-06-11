# Based on Matt Steele's approach
FROM mcr.microsoft.com/playwright:v1.40.0-focal

# Install AWS Lambda Runtime Interface Client
RUN npm install aws-lambda-ric

# Set working directory
WORKDIR /var/task

# Copy package.json and install dependencies
COPY package.json ./
RUN npm install

# Copy function code
COPY lambda-handler.js ./

# Set Lambda-specific environment variables
ENV HOME=/tmp

# Set the CMD to Lambda Runtime Interface Client
ENTRYPOINT ["/usr/local/bin/npx", "aws-lambda-ric"]
CMD ["lambda-handler.handler"]
