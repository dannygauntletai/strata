from aws_cdk import Stack, Duration, CfnOutput
from aws_cdk import aws_lambda as _lambda
from aws_cdk import aws_iam as iam
from aws_cdk import aws_apigateway as apigateway
from constructs import Construct


class ComputeStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)
        
        # Import resources from other stacks
        # Note: In production, you'd get these from stack outputs/exports
        
        # Create shared layer for common dependencies
        shared_layer = _lambda.LayerVersion(
            self, "SharedLayer",
            code=_lambda.Code.from_asset("../tsa-coach-backend/shared_layer"),
            compatible_runtimes=[_lambda.Runtime.PYTHON_3_9],
            description="Shared utilities and dependencies for TSA Coach"
        )
        
        # Lambda execution role
        lambda_role = iam.Role(
            self, "LambdaExecutionRole",
            assumed_by=iam.ServicePrincipal("lambda.amazonaws.com"),
            managed_policies=[
                iam.ManagedPolicy.from_aws_managed_policy_name(
                    "service-role/AWSLambdaVPCAccessExecutionRole"
                ),
                iam.ManagedPolicy.from_aws_managed_policy_name(
                    "AWSXRayDaemonWriteAccess"
                )
            ],
            inline_policies={
                "DynamoDBAccess": iam.PolicyDocument(
                    statements=[
                        iam.PolicyStatement(
                            effect=iam.Effect.ALLOW,
                            actions=[
                                "dynamodb:GetItem",
                                "dynamodb:PutItem",
                                "dynamodb:UpdateItem",
                                "dynamodb:DeleteItem",
                                "dynamodb:Query",
                                "dynamodb:Scan"
                            ],
                            resources=["arn:aws:dynamodb:*:*:table/*"]
                        )
                    ]
                ),
                "SESAccess": iam.PolicyDocument(
                    statements=[
                        iam.PolicyStatement(
                            effect=iam.Effect.ALLOW,
                            actions=[
                                "ses:SendEmail",
                                "ses:SendRawEmail"
                            ],
                            resources=["*"]
                        )
                    ]
                )
            }
        )
        
        # Common environment variables
        common_env = {
            "FROM_EMAIL": "noreply@texassportsacademy.com",
            "FRONTEND_URL": "https://app.texassportsacademy.com",
            "COACHES_TABLE": "coaches",
            "INVITATIONS_TABLE": "coach-invitations",
            "WIZARD_DATA_TABLE": "onboarding-wizard",
            "QUIZZES_TABLE": "quizzes",
            "QUESTIONS_TABLE": "quiz-questions",
            "ATTEMPTS_TABLE": "quiz-attempts",
            "EVENTS_TABLE": "events",
            "EVENT_REGISTRATIONS_TABLE": "event-registrations",
            "EVENT_INVITATIONS_TABLE": "event-invitations"
        }
        
        # =================================================================
        # ONBOARDING LAMBDAS
        # =================================================================
        
        lambda_onboard = _lambda.Function(
            self, "LambdaOnboard",
            runtime=_lambda.Runtime.PYTHON_3_9,
            code=_lambda.Code.from_asset(
                "../tsa-coach-backend/lambda_onboard"
            ),
            handler="handler.lambda_handler",
            environment=common_env,
            role=lambda_role,
            layers=[shared_layer],
            timeout=Duration.seconds(30),
            memory_size=256,
            tracing=_lambda.Tracing.ACTIVE
        )
        
        # =================================================================
        # QUIZ LAMBDAS
        # =================================================================
        
        # Quiz Management
        lambda_quiz_handler = _lambda.Function(
            self, "LambdaQuizHandler",
            runtime=_lambda.Runtime.PYTHON_3_9,
            code=_lambda.Code.from_asset(
                "../tsa-coach-backend/lambda_quizzes"
            ),
            handler="quiz_handler.lambda_handler",
            environment=common_env,
            role=lambda_role,
            layers=[shared_layer],
            timeout=Duration.seconds(30),
            memory_size=256,
            tracing=_lambda.Tracing.ACTIVE
        )
        
        # Questions Management
        lambda_questions_handler = _lambda.Function(
            self, "LambdaQuestionsHandler",
            runtime=_lambda.Runtime.PYTHON_3_9,
            code=_lambda.Code.from_asset(
                "../tsa-coach-backend/lambda_quizzes"
            ),
            handler="questions_handler.lambda_handler",
            environment=common_env,
            role=lambda_role,
            layers=[shared_layer],
            timeout=Duration.seconds(30),
            memory_size=256,
            tracing=_lambda.Tracing.ACTIVE
        )
        
        # Quiz Attempts Management
        lambda_attempts_handler = _lambda.Function(
            self, "LambdaAttemptsHandler",
            runtime=_lambda.Runtime.PYTHON_3_9,
            code=_lambda.Code.from_asset(
                "../tsa-coach-backend/lambda_quizzes"
            ),
            handler="attempts_handler.lambda_handler",
            environment=common_env,
            role=lambda_role,
            layers=[shared_layer],
            timeout=Duration.seconds(30),
            memory_size=512,  # Higher memory for scoring operations
            tracing=_lambda.Tracing.ACTIVE
        )
        
        # =================================================================
        # EVENT LAMBDAS
        # =================================================================
        
        lambda_events_handler = _lambda.Function(
            self, "LambdaEventsHandler",
            runtime=_lambda.Runtime.PYTHON_3_9,
            code=_lambda.Code.from_asset(
                "../tsa-coach-backend/lambda_events"
            ),
            handler="events_handler.lambda_handler",
            environment=common_env,
            role=lambda_role,
            layers=[shared_layer],
            timeout=Duration.seconds(30),
            memory_size=256,
            tracing=_lambda.Tracing.ACTIVE
        )
        
        # =================================================================
        # EVENT INVITATION LAMBDAS
        # =================================================================
        
        lambda_invitations_handler = _lambda.Function(
            self, "LambdaInvitationsHandler",
            runtime=_lambda.Runtime.PYTHON_3_9,
            code=_lambda.Code.from_asset(
                "../tsa-coach-backend/lambda_invitations"
            ),
            handler="invitations_handler.lambda_handler",
            environment=common_env,
            role=lambda_role,
            layers=[shared_layer],
            timeout=Duration.seconds(30),
            memory_size=256,
            tracing=_lambda.Tracing.ACTIVE
        )
        
        # =================================================================
        # API GATEWAY SETUP
        # =================================================================
        
        # Create the REST API
        api = apigateway.RestApi(
            self, "TsaCoachApi",
            rest_api_name="TSA Coach Service",
            description="API for TSA Coach platform",
            deploy_options=apigateway.StageOptions(
                stage_name="prod", 
                tracing_enabled=True
            ),
            default_cors_preflight_options=apigateway.CorsOptions(
                allow_origins=apigateway.Cors.ALL_ORIGINS,
                allow_methods=apigateway.Cors.ALL_METHODS,
                allow_headers=[
                    "Content-Type", 
                    "Authorization", 
                    "X-Amz-Date",
                    "X-Api-Key", 
                    "X-Amz-Security-Token"
                ]
            )
        )
        
        # =================================================================
        # ONBOARDING ROUTES
        # =================================================================
        
        onboard_resource = api.root.add_resource("onboarding")
        
        # POST /onboarding/invitation
        invitation_resource = onboard_resource.add_resource("invitation")
        invitation_resource.add_method(
            "POST", 
            apigateway.LambdaIntegration(lambda_onboard)
        )
        
        # POST /onboarding/wizard
        wizard_resource = onboard_resource.add_resource("wizard")
        wizard_resource.add_method(
            "POST", 
            apigateway.LambdaIntegration(lambda_onboard)
        )
        
        # POST /onboarding/complete
        complete_resource = onboard_resource.add_resource("complete")
        complete_resource.add_method(
            "POST", 
            apigateway.LambdaIntegration(lambda_onboard)
        )
        
        # =================================================================
        # QUIZ ROUTES
        # =================================================================
        
        quizzes_resource = api.root.add_resource("quizzes")
        
        # GET/POST /quizzes
        quizzes_resource.add_method(
            "GET", 
            apigateway.LambdaIntegration(lambda_quiz_handler)
        )
        quizzes_resource.add_method(
            "POST", 
            apigateway.LambdaIntegration(lambda_quiz_handler)
        )
        
        # GET/PUT/DELETE /quizzes/{quiz_id}
        quiz_by_id = quizzes_resource.add_resource("{quiz_id}")
        quiz_by_id.add_method(
            "GET", 
            apigateway.LambdaIntegration(lambda_quiz_handler)
        )
        quiz_by_id.add_method(
            "PUT", 
            apigateway.LambdaIntegration(lambda_quiz_handler)
        )
        quiz_by_id.add_method(
            "DELETE", 
            apigateway.LambdaIntegration(lambda_quiz_handler)
        )
        
        # =================================================================
        # QUESTIONS ROUTES
        # =================================================================
        
        questions_resource = api.root.add_resource("questions")
        
        # GET/POST /questions
        questions_resource.add_method(
            "GET", 
            apigateway.LambdaIntegration(lambda_questions_handler)
        )
        questions_resource.add_method(
            "POST", 
            apigateway.LambdaIntegration(lambda_questions_handler)
        )
        
        # GET/PUT/DELETE /questions/{question_id}
        question_by_id = questions_resource.add_resource("{question_id}")
        question_by_id.add_method(
            "GET", 
            apigateway.LambdaIntegration(lambda_questions_handler)
        )
        question_by_id.add_method(
            "PUT", 
            apigateway.LambdaIntegration(lambda_questions_handler)
        )
        question_by_id.add_method(
            "DELETE", 
            apigateway.LambdaIntegration(lambda_questions_handler)
        )
        
        # =================================================================
        # QUIZ ATTEMPTS ROUTES
        # =================================================================
        
        attempts_resource = api.root.add_resource("attempts")
        
        # GET /attempts
        attempts_resource.add_method(
            "GET", 
            apigateway.LambdaIntegration(lambda_attempts_handler)
        )
        
        # POST /attempts/start
        start_resource = attempts_resource.add_resource("start")
        start_resource.add_method(
            "POST", 
            apigateway.LambdaIntegration(lambda_attempts_handler)
        )
        
        # POST /attempts/submit
        submit_resource = attempts_resource.add_resource("submit")
        submit_resource.add_method(
            "POST", 
            apigateway.LambdaIntegration(lambda_attempts_handler)
        )
        
        # GET/PUT /attempts/{attempt_id}
        attempt_by_id = attempts_resource.add_resource("{attempt_id}")
        attempt_by_id.add_method(
            "GET", 
            apigateway.LambdaIntegration(lambda_attempts_handler)
        )
        attempt_by_id.add_method(
            "PUT", 
            apigateway.LambdaIntegration(lambda_attempts_handler)
        )
        
        # =================================================================
        # EVENTS ROUTES
        # =================================================================
        
        events_resource = api.root.add_resource("events")
        
        # GET/POST /events
        events_resource.add_method(
            "GET", 
            apigateway.LambdaIntegration(lambda_events_handler)
        )
        events_resource.add_method(
            "POST", 
            apigateway.LambdaIntegration(lambda_events_handler)
        )
        
        # GET/PUT/DELETE /events/{event_id}
        event_by_id = events_resource.add_resource("{event_id}")
        event_by_id.add_method(
            "GET", 
            apigateway.LambdaIntegration(lambda_events_handler)
        )
        event_by_id.add_method(
            "PUT", 
            apigateway.LambdaIntegration(lambda_events_handler)
        )
        event_by_id.add_method(
            "DELETE", 
            apigateway.LambdaIntegration(lambda_events_handler)
        )
        
        # POST /events/register
        register_resource = events_resource.add_resource("register")
        register_resource.add_method(
            "POST", 
            apigateway.LambdaIntegration(lambda_events_handler)
        )
        
        # =================================================================
        # EVENT INVITATIONS ROUTES
        # =================================================================
        
        invitations_resource = api.root.add_resource("invitations")
        
        # GET/POST /invitations
        invitations_resource.add_method(
            "GET", 
            apigateway.LambdaIntegration(lambda_invitations_handler)
        )
        invitations_resource.add_method(
            "POST", 
            apigateway.LambdaIntegration(lambda_invitations_handler)
        )
        
        # POST /invitations/send
        send_resource = invitations_resource.add_resource("send")
        send_resource.add_method(
            "POST", 
            apigateway.LambdaIntegration(lambda_invitations_handler)
        )
        
        # POST /invitations/bulk
        bulk_resource = invitations_resource.add_resource("bulk")
        bulk_resource.add_method(
            "POST", 
            apigateway.LambdaIntegration(lambda_invitations_handler)
        )
        
        # GET/PUT/DELETE /invitations/{invitation_id}
        invitation_by_id = invitations_resource.add_resource(
            "{invitation_id}"
        )
        invitation_by_id.add_method(
            "GET", 
            apigateway.LambdaIntegration(lambda_invitations_handler)
        )
        invitation_by_id.add_method(
            "PUT", 
            apigateway.LambdaIntegration(lambda_invitations_handler)
        )
        invitation_by_id.add_method(
            "DELETE", 
            apigateway.LambdaIntegration(lambda_invitations_handler)
        )
        
        # PUT /invitations/{invitation_id}/respond
        respond_resource = invitation_by_id.add_resource("respond")
        respond_resource.add_method(
            "PUT", 
            apigateway.LambdaIntegration(lambda_invitations_handler)
        )
        
        # =================================================================
        # OUTPUTS
        # =================================================================
        
        # Output the API endpoint
        CfnOutput(
            self, "TsaCoachApiEndpoint", 
            value=api.url,
            description="Texas Sports Academy Coach API Gateway endpoint",
            export_name="TsaCoachApiEndpoint"
        )
        # Store Lambda function references for other stacks
        self.lambda_functions = {
            "onboard": lambda_onboard,
            "quiz_handler": lambda_quiz_handler,
            "questions_handler": lambda_questions_handler,
            "attempts_handler": lambda_attempts_handler,
            "events_handler": lambda_events_handler,
            "invitations_handler": lambda_invitations_handler
        }
        
        # Store API reference for other stacks
        self.api = api 