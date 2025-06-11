from typing import Dict, Any
import os
import asyncio
import traceback  # Import for detailed error logging
from playwright.async_api import async_playwright, Page
from browserbase import Browserbase
from dotenv import load_dotenv

# --- Configuration --- #
# Set to True to run with a local browser for debugging,
# False to use Browserbase.
DEBUG = False  # Default to True for local debugging as requested

load_dotenv()
# Load Browserbase API Key and Project ID from Lambda Environment Variables
BROWSERBASE_API_KEY = os.environ.get("BROWSERBASE_API_KEY")
BROWSERBASE_PROJECT_ID = os.environ.get("BROWSERBASE_PROJECT_ID")

# Initialize Browserbase client globally if API key is present and not in DEBUG
bb = None
if not DEBUG:
    if BROWSERBASE_API_KEY:
        bb = Browserbase(api_key=BROWSERBASE_API_KEY)
    else:
        print(
            "Warning: BROWSERBASE_API_KEY not found. "
            "Browserbase client not initialized (DEBUG is False)."
        )


async def perform_incorporation(
    page: Page,
    client_id: str,
    password: str,
    exp_month: str,
    exp_year: str,
    cvv: str,
    cc_number: str,
    company_name: str,
    address1: str,
    address2: str,
    city: str,
    state: str,
    zip_code: str,
    agent_last_name: str,
    agent_first_name: str,
    agent_address1: str,
    agent_address2: str,
    agent_city: str,
    agent_zip_code: str,
    business_purpose_name: str,
    business_address1: str,
    business_city: str,
    business_zip_code: str,
    org_applicant: str,
    org_applicant_address: str,
) -> None:
    """
    Perform the incorporation automation with the provided information
    using Playwright.
    """
    # Navigate to the login page
    await page.goto(
        "https://direct.sos.state.tx.us/acct/acct-login.asp?spage=login1"
    )

    # Wait for the login form to be present and fill it
    await page.locator("input[name='client_id']").fill(client_id)
    await page.locator("input[name='web_password']").fill(password)
    await page.locator("input[name='submit']").click()

    # Wait for the next page element and click
    await page.locator("input[name='has_s_info']").wait_for(timeout=60000)
    await page.locator("input[name='has_s_info']").click()
    await page.locator("input[name='Submit']").click()

    # Set initial payment information
    await page.locator(
        "select[name='expiration_month']"
    ).select_option(label=exp_month)
    await page.locator(
        "select[name='expiration_year']"
    ).select_option(label=exp_year)
    await page.locator("input[name='cvv2']").fill(cvv)
    print("Initial payment fields filled")

    # Handle credit card number entry within nested iframes
    print("Handling credit card field in nested iframes...")
    
    try:
        # Wait for page to be fully loaded
        await page.wait_for_load_state('domcontentloaded', timeout=30000)
        
        # Wait for the iframe to be attached to the DOM
        await page.wait_for_selector(
            "#tokenframe", 
            state="attached", 
            timeout=20000
        )
        
        # Use frame_locator to access the nested iframe structure
        outer_frame = page.frame_locator("#tokenframe")
        
        # Access the inner iframe within the outer iframe
        inner_frame = outer_frame.frame_locator("iframe[name=\"tokenframe\"]")
        
        # Find the credit card input field within the inner iframe
        cc_input = inner_frame.get_by_role(
            "textbox", 
            name="Credit Card Number"
        )
        
        # Wait for the credit card field to be visible
        await cc_input.wait_for(state="visible", timeout=20000)
        print("Found credit card input field, filling with card number...")
        
        # Fill the credit card number
        await cc_input.fill(cc_number)
        print("Successfully filled credit card number")
        
        # After filling credit card number, clear and re-enter CVV
        print("Clearing and re-entering CVV...")
        cvv_field = page.locator("input[name='cvv2']")
        await cvv_field.clear()
        await cvv_field.fill(cvv)
        print("Re-entered CVV successfully")
        
        # Add a wait for card processing
        print("Waiting 5 seconds for credit card processing...")
        await asyncio.sleep(5)
        print("Wait complete")
        
    except Exception as e:
        print(f"Error handling credit card iframe: {e}")
        print(traceback.format_exc())
        
        # Take a screenshot for debugging
        try:
            timestamp = int(asyncio.get_event_loop().time())
            screenshot_path = f"debug_cc_error_{timestamp}.png"
            await page.screenshot(path=screenshot_path)
            print(f"Screenshot saved to {screenshot_path}")
        except Exception as screenshot_err:
            print(f"Could not take screenshot: {screenshot_err}")

    # Select card type based on card number
    first_digit = cc_number[0]
    if first_digit == "4":
        card_type = "Visa"
    elif first_digit == "5":
        card_type = "MasterCard"
    elif first_digit == "6":
        card_type = "Discover"
    elif first_digit == "3":
        card_type = "American Express"
    else:
        card_type = "MasterCard"  # Default fallback

    await page.locator(
        "select[name='card_type_id']"
    ).select_option(label=card_type)

    # Submit the payment form using the Continue button
    print("Clicking the Continue button to submit the payment form...")
    
    # Use the locator for the continue button
    continue_button = page.locator("input[name='Submit']")
    
    # Wait for the button to be visible and enabled
    await continue_button.wait_for(state="visible", timeout=30000)
    
    # Check if button is visible and enabled
    is_visible = await continue_button.is_visible()
    is_enabled = await continue_button.is_enabled()
    
    if not is_visible or not is_enabled:
        print(f"Warning: Continue button visible: {is_visible}, "
              f"enabled: {is_enabled}")
        print("Taking screenshot of form before attempting to submit...")
        await page.screenshot(path="payment_form_pre_submit.png")
    
    # Click the continue button
    print("Clicking Continue button...")
    await continue_button.click()
    print("Continue button clicked")
    
    # Click second continue button on next page
    print("Waiting for second Continue button...")
    second_continue_button = page.locator("input[name='Submit']")
    await second_continue_button.wait_for(state="visible", timeout=30000)
    print("Clicking second Continue button...")
    await second_continue_button.click()
    print("Second Continue button clicked")
    
    # Wait for navigation to confirm this worked
    print("Waiting for page navigation after continue button click...")
    await page.wait_for_load_state('networkidle', timeout=30000)
    
    # Continue with the Business Organizations process
    try:
        print("Clicking Business Organizations link...")
        # Use role-based locator for more reliable targeting
        business_org_link = page.get_by_role("link", 
            name="Business Organizations")
        await business_org_link.wait_for(state="visible", timeout=30000)
        await business_org_link.click()
        
        # Take screenshot after navigation
        await page.screenshot(path="debug_business_org_page.png")
    except Exception as e:
        print(f"Error clicking Business Organizations: {e}")
        await page.screenshot(path="error_business_org.png")
        raise

    try:
        await asyncio.sleep(3)
        # Select company type using role-based selector
        print("Selecting company type: Domestic LLC...")
        
        # Select option "6" for the entity type dropdown
        await page.get_by_role("combobox").select_option("6")
        
        # Use the more precise role-based locator for the File Document button
        file_document_button = page.get_by_role("cell", 
            name="Reservation * Formation * Registration Documents   First select the type of entity for which you wish to submit a filing, and then click 'File Document' Domestic Limited Liability Company (LLC)     File Document", 
            exact=True).get_by_role("button")
        
        await file_document_button.click()
        
        # Take screenshot after selection
        await page.screenshot(path="debug_after_llc_select.png")
    except Exception as e:
        print(f"Error selecting LLC type: {e}")
        await page.screenshot(path="error_llc_select.png")
        raise

    try:
        await page.wait_for_url(
            "https://direct.sos.state.tx.us/corp_filing/corp_filing-formation.asp",
            timeout=30000
        )

        print("Waiting 5 seconds...")
        await asyncio.sleep(5)
        print("Wait complete")
        # Follow the exact manual flow for certificate selection
        print("Selecting Certificate of Formation...")
        
        # Select the option with value "10601" from the combobox
        await page.get_by_role("combobox").select_option("10601")
        
        # Click Continue button
        await page.get_by_role("button", name="Continue").click()
        
        # Fill company name using role-based selector
        print("Filling company name...")
        await page.get_by_role("textbox").click()
        await page.get_by_role("textbox").fill(company_name)
        
        # Click Continue button again
        await page.get_by_role("button", name="Continue").click()
        
        # Wait for page navigation
        await page.wait_for_url(
            "https://direct.sos.state.tx.us/corp_filing/corp_filing-formation.asp?pagefrom=NM",
            timeout=30000
        )
        
        # Fill company address
        print("Filling company address...")
        await page.locator("input[name=':Sinitial_address1IA']").click()
        await page.locator("input[name=':Sinitial_address1IA']").fill(address1)
        await page.locator("input[name=':Sinitial_address1IA']").press("Tab")
        await page.locator("input[name=':Sinitial_address2IA']").press("Tab")
        await page.locator("input[name=':Sinitial_cityIA']").fill(city)
        await page.locator("input[name=':Sinitial_cityIA']").press("Tab")
        await page.locator("input[name=':Sinitial_stateIA']").fill(state)
        await page.locator("input[name=':Sinitial_stateIA']").press("Tab")
        await page.locator("input[name=':Sinitial_zip_codeIA']").fill(zip_code)
        
        # Click Continue button after address
        await page.get_by_role("button", name="Continue").click()
        
        # Wait for page navigation
        await page.wait_for_url(
            "https://direct.sos.state.tx.us/corp_filing/corp_filing-formation.asp?pagefrom=IA",
            timeout=30000
        )
        
        # Take screenshot after company info submission
        await page.screenshot(path="debug_after_company_info.png")
    except Exception as e:
        print(f"Error with company information: {e}")
        await page.screenshot(path="error_company_info.png")
        raise

    try:
        # Fill agent information using the new flow
        print("Filling registered agent information...")
        await page.locator("input[name=':Saddress1']").click()
        await page.locator("input[name=':Saddress1']").fill(agent_address1)
        await page.locator("input[name=':Scity']").click()
        await page.locator("input[name=':Scity']").fill(agent_city)
        await page.locator("input[name=':Szip_code']").click()
        await page.locator("input[name=':Szip_code']").fill(agent_zip_code)
        await page.locator("input[name=':Slast_name']").click()
        await page.locator("input[name=':Slast_name']").fill(agent_last_name)
        await page.locator("input[name=':Sfirst_name']").click()
        await page.locator("input[name=':Sfirst_name']").fill(agent_first_name)
        
        # Click Continue button
        await page.get_by_role("button", name="Continue").click()
        
        # Wait for page navigation
        await page.wait_for_url(
            "https://direct.sos.state.tx.us/corp_filing/corp_filing-formation.asp?pagefrom=RA",
            timeout=30000
        )
        
        # Take screenshot after agent info submission
        await page.screenshot(path="debug_after_agent_info.png")
    except Exception as e:
        print(f"Error filling agent information: {e}")
        await page.screenshot(path="error_agent_info.png")
        raise

    try:
        # Add manager/member (this step was missing in the previous implementation)
        print("Adding manager/member...")
        await page.get_by_role("button", name="Add Manager/Member").click()
        
        # Wait for page navigation
        await page.wait_for_url(
            "https://direct.sos.state.tx.us/corp_filing/corp_filing-formation.asp?pagefrom=MO",
            timeout=30000
        )
        
        # Fill business purpose information
        print("Filling business purpose information...")
        await page.locator("input[name=':Sbusiness_name']").click()
        await page.locator("input[name=':Sbusiness_name']").fill(business_purpose_name)
        await page.locator("input[name=':Saddress1']").click()
        await page.locator("input[name=':Saddress1']").fill(business_address1)
        await page.locator("input[name=':Scity']").click()
        await page.locator("input[name=':Scity']").fill(business_city)
        await page.locator("input[name=':Scity']").press("Tab")
        await page.locator("input[name=':Sstate']").press("Tab")
        await page.locator("input[name=':Szip_code']").fill(business_zip_code)
        
        # Click Update button to confirm the manager/member
        await page.get_by_role("button", name="Update").click()
        
        # Click Continue button to proceed
        await page.get_by_role("button", name="Continue").click()
        
        # Take screenshot after business purpose submission
        await page.screenshot(path="debug_after_business_purpose.png")
    except Exception as e:
        print(f"Error filling business purpose information: {e}")
        await page.screenshot(path="error_business_purpose.png")
        raise

    try:
        # Continue to the next page
        print("Proceeding to organizer information...")
        await page.get_by_role("button", name="Continue").click()
        
        # Fill organizer information
        print("Filling organizer information...")
        await page.locator("input[name=':Sorg_applicant1']").click()
        await page.locator("input[name=':Sorg_applicant1']").fill(org_applicant)
        await page.locator("input[name=':Sorg_applicant_address1']").click()
        await page.locator("input[name=':Sorg_applicant_address1']").fill(
            org_applicant_address)
        
        # Click Continue button to finalize
        await page.get_by_role("button", name="Continue").click()
        
        # Take final screenshot
        await page.screenshot(path="debug_incorporation_complete.png")
        print(f"Completed incorporation process for {company_name}")
    except Exception as e:
        print(f"Error filling organizer information: {e}")
        await page.screenshot(path="error_organizer_info.png")
        raise


async def lambda_handler(
    event: Dict[str, Any], context: Any
) -> Dict[str, Any]:
    # Only check for bb if not in DEBUG mode
    if not DEBUG and not bb:
        return {
            "statusCode": 500,
            "body": (
                "Browserbase client not initialized. "
                "Check BROWSERBASE_API_KEY (DEBUG is False)."
            ),
        }

    # Parameter extraction
    try:
        client_id = event["client_id"]
        password = event["password"]
        exp_month = event["exp_month"]
        exp_year = event["exp_year"]
        cvv = event["cvv"]
        cc_number = event["cc_number"]
        company_name = event["company_name"]
        address1 = event["address1"]
        address2 = event.get("address2", "")
        city = event["city"]
        state = event.get("state", "TX")
        zip_code = event["zip_code"]
        agent_last_name = event["agent_last_name"]
        agent_first_name = event["agent_first_name"]
        agent_address1 = event["agent_address1"]
        agent_address2 = event.get("agent_address2", "")
        agent_city = event["agent_city"]
        agent_zip_code = event["agent_zip_code"]
        business_purpose_name = event["business_purpose_name"]
        business_address1 = event["business_address1"]
        business_city = event["business_city"]
        business_zip_code = event["business_zip_code"]
        org_applicant = event["org_applicant"]
        org_applicant_address = event["org_applicant_address"]
    except KeyError as e:
        error_message = f"Missing required parameter in event: {str(e)}"
        print(error_message)
        return {"statusCode": 400, "body": error_message}

    browser = None
    page = None
    playwright_context = None  # For managing context, especially for local

    async with async_playwright() as p:
        try:
            if DEBUG:
                print("DEBUG mode enabled: Launching local browser.")
                browser = await p.chromium.launch(headless=False, slow_mo=50)
                playwright_context = await browser.new_context()
                page = await playwright_context.new_page()
                print("Local browser launched and page created.")
            else:  # Browserbase path
                print("DEBUG mode disabled: Using Browserbase.")
                if not BROWSERBASE_API_KEY or not BROWSERBASE_PROJECT_ID:
                    error_message = (
                        "Error: Browserbase API Key or Project ID not "
                        "configured for Browserbase mode."
                    )
                    print(error_message)
                    return {"statusCode": 500, "body": error_message}

                print(
                    f"Attempting to create Browserbase session for project "
                    f"{BROWSERBASE_PROJECT_ID}"
                )
                session = bb.sessions.create(
                    project_id=BROWSERBASE_PROJECT_ID
                )
                print(
                    f"Browserbase session created. ID: {session.id}, "
                    f"Connect URL: {session.connect_url}"
                )

                print(
                    "Connecting to Playwright browser via CDP: "
                    f"{session.connect_url}"
                )
                browser = await p.chromium.connect_over_cdp(
                    session.connect_url, timeout=90000
                )
                print("Connected to Browserbase CDP.")

                contexts = browser.contexts
                if not contexts:
                    print(
                        "No existing contexts in Browserbase session, "
                        "creating new one."
                    )
                    playwright_context = await browser.new_context()
                    page = await playwright_context.new_page()
                else:
                    playwright_context = contexts[0]
                    print("Using existing context from Browserbase session.")
                    if not playwright_context.pages:
                        print(
                            "No existing pages in context, "
                            "creating new one."
                        )
                        page = await playwright_context.new_page()
                    else:
                        page = playwright_context.pages[0]
                        print("Using existing page from Browserbase context.")

                print(
                    "Successfully connected to page in Browserbase session."
                )

            if not page:
                error_msg = "Page object not initialized after setup."
                print(error_msg)
                return {"statusCode": 500, "body": error_msg}

            await perform_incorporation(
                page,
                client_id, password, exp_month, exp_year, cvv, cc_number,
                company_name, address1, address2, city, state, zip_code,
                agent_last_name, agent_first_name, agent_address1,
                agent_address2, agent_city, agent_zip_code,
                business_purpose_name, business_address1, business_city,
                business_zip_code, org_applicant, org_applicant_address,
            )
            success_body = (
                f"Incorporation process completed successfully for "
                f"{company_name}"
            )
            return {"statusCode": 200, "body": success_body}
        except Exception as e:
            error_body = (
                f"Error during Playwright incorporation process: {str(e)}"
            )
            print(error_body)
            print(traceback.format_exc())  # Print full stack trace
            if page and DEBUG:  # Take screenshot on error in DEBUG mode
                try:
                    await page.screenshot(path="error_screenshot.png")
                    print(
                        "Screenshot 'error_screenshot.png' taken on error."
                    )
                except Exception as se:
                    print(f"Could not take screenshot on error: {se}")
            return {"statusCode": 500, "body": error_body}
        finally:
            if browser:
                print("Closing browser connection/instance.")
                await browser.close()
            # For non-debug, Browserbase session is implicitly managed by
            # the platform, but closing the CDP connection is good practice.
            print("Playwright Lambda handler finished.")


# Example of how you might test locally
if __name__ == "__main__":
    # Ensure .env file is present and load_dotenv() at the top of the script
    # has loaded BROWSERBASE_API_KEY and BROWSERBASE_PROJECT_ID
    # if DEBUG is False.

    sample_event = {
        "client_id": "1065052110",
        "password": "gartez712!!",
        "exp_month": "5",
        "exp_year": "2031",
        "cvv": "995",
        "cc_number": "5439300651668869",
        "company_name": "Blackbird Systems Test LLC",
        "address1": "600 Guadalupe St",
        "address2": "Apt 5703",
        "city": "Austin",
        "state": "TX",
        "zip_code": "78701",
        "agent_last_name": "Mota",
        "agent_first_name": "Danny",
        "agent_address1": "600 Guadalupe St",
        "agent_address2": "Apt 5703",
        "agent_city": "Austin",
        "agent_zip_code": "78701",
        "business_purpose_name": "Texas Sports Academy",
        "business_address1": "4402 Hudson Bend Rd",
        "business_city": "Austin",
        "business_zip_code": "78734",
        "org_applicant": "Strata Schools Test LLC",
        "org_applicant_address": "1705 Guadalupe St, Austin, TX, 78701"
    }

    print("Running local Playwright test...")
    response = asyncio.run(lambda_handler(sample_event, None))
    print("Local Playwright test response:")
    print(response) 