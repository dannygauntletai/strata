# =================================================================
# EVENTBRITE INTEGRATION MODELS
# =================================================================

class EventbriteOAuthStatus(str, Enum):
    """Eventbrite OAuth connection status"""
    NOT_CONNECTED = "not_connected"
    CONNECTED = "connected"
    EXPIRED = "expired"
    ERROR = "error"


class EventbriteConfig(BaseModel):
    """Eventbrite OAuth configuration table (DynamoDB)"""
    coach_id: str = Field(..., description="Partition key")
    oauth_status: EventbriteOAuthStatus = Field(default=EventbriteOAuthStatus.NOT_CONNECTED)
    access_token: Optional[str] = Field(None, description="Encrypted OAuth access token")
    refresh_token: Optional[str] = Field(None, description="Encrypted OAuth refresh token")
    token_expires_at: Optional[str] = Field(None, description="ISO timestamp when token expires")
    eventbrite_user_id: Optional[str] = Field(None, description="Eventbrite user ID")
    eventbrite_organization_id: Optional[str] = Field(None, description="Eventbrite organization ID")
    organization_name: Optional[str] = Field(None, description="Eventbrite organization name")
    last_sync: Optional[str] = Field(None, description="ISO timestamp of last sync")
    created_at: str = Field(..., description="ISO timestamp when created")
    updated_at: str = Field(..., description="ISO timestamp when last updated")

    def dict(self) -> Dict[str, Any]:
        """Convert to DynamoDB-compatible dict"""
        data = super().dict()
        # Remove None values for DynamoDB
        return {k: v for k, v in data.items() if v is not None}


# =================================================================
# DYNAMODB TABLE SCHEMA DEFINITIONS
# ================================================================= 