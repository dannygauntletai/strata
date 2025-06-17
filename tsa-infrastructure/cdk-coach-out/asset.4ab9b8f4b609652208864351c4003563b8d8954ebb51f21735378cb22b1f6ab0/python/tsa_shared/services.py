"""
TSA Services Module
Centralized service access and factory functions
"""
import os
from typing import Optional

# Import from shared_utils where the actual implementation lives
import sys
sys.path.append('/opt/python')
from shared_utils.sendgrid_utils import SendGridEmailService as _SendGridEmailService


class SendGridEmailService:
    """Wrapper class to maintain API compatibility"""
    def __init__(self):
        self._service = _SendGridEmailService()
    
    def send_email(self, *args, **kwargs):
        return self._service.send_email(*args, **kwargs)
    
    def send_bulk_emails(self, *args, **kwargs):
        return self._service.send_bulk_emails(*args, **kwargs)
    
    def get_send_quota(self, *args, **kwargs):
        return self._service.get_send_quota(*args, **kwargs)


def get_email_service() -> SendGridEmailService:
    """Factory function to get email service instance"""
    return SendGridEmailService() 