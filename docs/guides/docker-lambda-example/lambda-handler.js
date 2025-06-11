const { chromium } = require('playwright');

exports.handler = async (event) => {
    console.log('🚀 Starting LLC incorporation with Docker + Playwright');
    
    try {
        // Launch browser with Lambda-optimized settings
        const browser = await chromium.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--single-process',
                '--disable-gpu'
            ]
        });
        
        const page = await browser.newPage();
        
        // Navigate to Texas SOS
        await page.goto('https://direct.sos.state.tx.us/acct/acct-login.asp?spage=login1');
        
        // Fill login form
        await page.fill("input[name='client_id']", event.client_id);
        await page.fill("input[name='web_password']", event.password);
        await page.click("input[name='submit']");
        
        // Wait for response
        await page.waitForLoadState('networkidle');
        
        const title = await page.title();
        console.log('✅ Successfully navigated. Page title:', title);
        
        await browser.close();
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                message: 'LLC incorporation automation started successfully',
                pageTitle: title
            })
        };
        
    } catch (error) {
        console.error('❌ Error in LLC incorporation:', error);
        
        return {
            statusCode: 500,
            body: JSON.stringify({
                success: false,
                error: error.message
            })
        };
    }
};
