from setuptools import setup, find_packages

setup(
    name="tsa_shared",
    version="1.0.0",
    description="TSA Shared Utilities for Lambda Layer",
    packages=find_packages(),
    install_requires=[
        "boto3>=1.28.0",
        "botocore>=1.31.0",
        "pydantic>=2.0.0",
        "sendgrid>=6.10.0",
        "python-jose[cryptography]>=3.3.0",
        "email-validator>=2.0.0",
        "requests>=2.31.0",
    ],
    python_requires=">=3.9",
    author="TSA Development Team",
    author_email="dev@texassportsacademy.com",
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
    ],
) 