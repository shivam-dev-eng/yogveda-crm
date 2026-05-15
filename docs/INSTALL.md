# ================================================================
# YOGVEDA CRM — COMPLETE INSTALLATION GUIDE
# cPanel Linux Hosting + MySQL + Node.js + PM2
# ================================================================

## WHAT YOU GET AFTER INSTALLATION
- Full CRM running at:  https://crm.yourdomain.com (or subdomain)
- Backend API at:       https://crm.yourdomain.com/api
- Admin login:          admin@yogveda.com  /  Admin@123
- MySQL database:       yogveda_crm  (all 16 tables auto-created)

================================================================
## STEP 1 — Create MySQL Database in cPanel
================================================================

1. Login to cPanel → MySQL Databases
2. Create Database:     yogveda_crm
3. Create DB User:      yogveda_user  (strong password)
4. Add user to DB:      Give ALL PRIVILEGES
5. Note down:
   - DB_HOST:   localhost
   - DB_NAME:   cpanelusername_yogveda_crm  (cPanel prefixes your username)
   - DB_USER:   cpanelusername_yogveda_user
   - DB_PASS:   your_password

6. Open phpMyAdmin → select yogveda_crm
7. Click Import → select database/schema.sql → Go
   ✅ All 16 tables + seed data created

================================================================
## STEP 2 — Upload Backend to Your Server
================================================================

Option A — Using File Manager:
1. cPanel → File Manager → public_html (or subdomain folder)
2. Create folder:  /home/username/yogveda-crm/
3. Upload backend/ folder contents there
   (Recommended: use an addon domain like crm.yourdomain.com
    pointing to /home/username/yogveda-crm/backend/)

Option B — Using SSH (recommended):
  ssh username@yourdomain.com
  mkdir -p ~/yogveda-crm
  # Upload via SFTP/FileZilla to ~/yogveda-crm/backend/

================================================================
## STEP 3 — Install Node.js via cPanel
================================================================

1. cPanel → Software → Node.js Selector (or Setup Node.js App)
2. Create Application:
   - Node.js version:  18.x or 20.x
   - Application mode: Production
   - Application root: /home/username/yogveda-crm/backend
   - Application URL:  crm.yourdomain.com (or subdomain)
   - Application startup file: src/app.js
3. Click Create
4. Click "Run NPM Install" (installs all dependencies)

If Node.js Selector is NOT available — use SSH:
  cd ~/yogveda-crm/backend
  npm install --production
  npm install -g pm2

================================================================
## STEP 4 — Create .env File
================================================================

SSH into server or use File Manager:

  cd ~/yogveda-crm/backend
  cp .env.example .env
  nano .env  (or edit in File Manager)

Fill in these values:

  NODE_ENV=production
  PORT=5000
  FRONTEND_URL=https://crm.yourdomain.com
  API_BASE_URL=https://crm.yourdomain.com/api

  DB_HOST=localhost
  DB_PORT=3306
  DB_NAME=cpanelusername_yogveda_crm
  DB_USER=cpanelusername_yogveda_user
  DB_PASS=your_mysql_password

  # Generate these with:
  # node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
  JWT_SECRET=your_64_char_random_hex_here
  JWT_REFRESH_SECRET=another_64_char_random_hex_here
  JWT_EXPIRES_IN=15m

  # WhatsApp (fill later from Meta Business)
  WA_PHONE_NUMBER_ID=
  WA_ACCESS_TOKEN=

  # Shopify (fill later)
  SHOPIFY_STORE_DOMAIN=yourstore.myshopify.com
  SHOPIFY_WEBHOOK_SECRET=

Save and exit.

================================================================
## STEP 5 — Start the Backend with PM2
================================================================

SSH into server:

  cd ~/yogveda-crm/backend

  # Install PM2 globally (if not installed)
  npm install -g pm2

  # Start the CRM backend
  pm2 start src/app.js --name yogveda-crm --max-memory-restart 400M

  # Make PM2 start on server reboot
  pm2 save
  pm2 startup
  # Copy and run the command it gives you

  # Check it's running
  pm2 status
  pm2 logs yogveda-crm

================================================================
## STEP 6 — Setup Subdomain + Reverse Proxy in cPanel
================================================================

Create subdomain crm.yourdomain.com:
1. cPanel → Subdomains → Create "crm" subdomain
2. Document root: /home/username/public_html/crm  (or any folder)

Setup reverse proxy (Apache .htaccess):
1. cPanel → File Manager → go to subdomain document root
2. Create/edit .htaccess:

  RewriteEngine On
  RewriteRule ^api/(.*)$ http://localhost:5000/api/$1 [P,L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule ^(.*)$ http://localhost:3000/$1 [P,L]

OR use .htaccess for API-only (if frontend is separate):

  RewriteEngine On
  RewriteRule ^(.*)$ http://localhost:5000/$1 [P,L]

================================================================
## STEP 7 — Deploy Frontend (Next.js Static Export)
================================================================

ON YOUR LOCAL MACHINE (not server):

  cd yogveda-crm/frontend

  # Create .env.local
  echo "NEXT_PUBLIC_API_URL=https://crm.yourdomain.com/api" > .env.local

  # Install and build
  npm install
  npm run build

  # This creates an 'out/' folder with static HTML/JS/CSS

  # Upload the 'out/' folder contents to your subdomain's document root
  # Use FileZilla or cPanel File Manager

Then set the .htaccess in the subdomain root:

  # For static Next.js export — route all paths to index.html
  RewriteEngine On
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteRule . /index.html [L]

================================================================
## STEP 8 — Test Your Installation
================================================================

  # Test backend is running
  curl https://crm.yourdomain.com/health
  # Expected: {"status":"ok","ts":"..."}

  # Test login API
  curl -X POST https://crm.yourdomain.com/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@yogveda.com","password":"Admin@123"}'
  # Expected: {"success":true,"accessToken":"..."}

  # Open browser
  https://crm.yourdomain.com
  # Login: admin@yogveda.com / Admin@123

================================================================
## STEP 9 — WhatsApp API Setup
================================================================

1. Go to https://developers.facebook.com
2. My Apps → Create App → Business
3. Add WhatsApp product
4. WhatsApp → Getting Started:
   - Copy "Phone number ID"
   - Create a System User in Meta Business Manager
   - Generate Permanent Access Token with whatsapp_business_messaging permission
5. In CRM → Settings → Integrations:
   - Enter Phone Number ID
   - Enter Access Token
   - Click Save
6. Test: CRM will now auto-send WhatsApp on new Meta leads

================================================================
## STEP 10 — Make.com Setup (Meta Ads → CRM)
================================================================

1. Login to make.com → Create new scenario
2. Add trigger: "Facebook Lead Ads" → Watch Lead Ads
   - Connect your Facebook Ad Account
   - Select your Page and Lead Form
3. Add module: "HTTP" → Make a Request
   - URL: https://crm.yourdomain.com/api/webhooks/meta-leads
   - Method: POST
   - Headers: Content-Type: application/json
   - Body type: Raw → JSON
   - Body:
     {
       "name": "{{fullname}}",
       "phone": "{{phone_number}}",
       "email": "{{email}}",
       "city": "{{city}}",
       "category": "Kidney Stone Treatment",
       "campaign_id": "{{campaign_id}}"
     }
   (Map fields from your Meta lead form)
4. Save and Activate scenario
5. Test: Submit a test lead in Meta → check CRM Leads page

================================================================
## STEP 11 — Shopify Webhook Setup
================================================================

1. Shopify Admin → Settings → Notifications → Webhooks
2. Create webhook:
   - Event: Order payment
   - Format: JSON
   - URL: https://crm.yourdomain.com/api/webhooks/shopify/orders
3. Copy the "Signing secret" shown after creation
4. In CRM → Settings → Integrations:
   - Enter Shopify store domain
   - Enter Webhook secret
   - Save
5. Every paid Shopify order now auto-creates/updates customer in CRM

================================================================
## USEFUL PM2 COMMANDS
================================================================

  pm2 status               # Check if running
  pm2 logs yogveda-crm     # View live logs
  pm2 restart yogveda-crm  # Restart after .env changes
  pm2 stop yogveda-crm     # Stop the CRM
  pm2 monit                # Live CPU/memory monitor

================================================================
## CHANGE ADMIN PASSWORD
================================================================

After first login → click your name (top right) → Settings → Security
Enter current password (Admin@123) and set a new one.

================================================================
## TROUBLESHOOTING
================================================================

Problem: "Cannot connect to MySQL"
  Fix: Check DB_NAME/DB_USER/DB_PASS in .env
       Remember cPanel adds username prefix: cpaneluser_dbname

Problem: "Port 5000 not accessible"
  Fix: Some cPanel hosts block custom ports
       Ask hosting support to open port 5000, OR
       Use the Node.js App selector (it handles port routing)

Problem: "PM2 not found after reboot"
  Fix: Run: pm2 startup → copy & run the given command → pm2 save

Problem: "WhatsApp not sending"
  Fix: Check WA_PHONE_NUMBER_ID and WA_ACCESS_TOKEN in Settings
       Make sure it's a Permanent token (not temporary 24hr token)
       Phone number must be verified in Meta Business

Problem: "Frontend shows blank page"
  Fix: Check NEXT_PUBLIC_API_URL in frontend .env.local
       Make sure it points to your actual domain, not localhost
