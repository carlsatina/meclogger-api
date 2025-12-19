## For Takoyaki


### Requirements

The following must be installed on your machine:
* `postgresql` 
* `nodejs` 
* `vue-cli`

### File Structure

|─ **backend** \
│   |─ apis \
│   |─ lib  \
│   |─ prisma\
│   |─ src\
|─ **frontend**\
|   |─ android\
|   |─ src

**`backend`** folder contains the source code for the webapi and also the prisma orm database as well. It uses `nodejs` and `express` framework.

### How to compile backend
You must be in the root folder of the `backend` directory.

```
npm install 
```
#### Run the build the Prisma
```
npx prisma migrate dev
npx prisma db push
npx prisma generate
```

### How to compile frontend
You must be in the root folder of the `frontend` directory.
```
npm install
npm run serve
```

### Environment Variables
For directories `backend`, `prisma` and `frontend` and a `.env` variable has to be created.

#### For `backend`
The `.env` file must be in the root folder and the variables are the following:
```
PORT=9000
ACCESS_TOKEN_SECRET="xxxxx"
API_DOC_URL='http://localhost'
CORS_ALLOWED_ORIGINS="https://meclogger.com,https://www.meclogger.com,https://api.meclogger.com"
CORS_ALLOWED_SUFFIXES=".meclogger.com"
# Set to true to reflect any origin (useful while debugging infra/proxy CORS issues)
# CORS_ALLOW_ALL=true
# Optional overrides for upload/payload limits
# MEDICAL_RECORD_MAX_FILE_MB=10
# MEDICAL_RECORD_MAX_TOTAL_MB=50
# MEDICAL_RECORD_MAX_FILES=5
# REQUEST_BODY_LIMIT="50mb"
# Optional: enable Vercel Blob for media uploads
# VERCEL_BLOB_READ_WRITE_TOKEN="<your-vercel-blob-token>"
# Database TLS (preferred secure setup)
# Option A: Place your provider root CA at backend/certs/db-ca.crt (or set DB_SSL_CA_PATH to a custom path)
# DB_SSL_CA_PATH="certs/db-ca.crt"
# Option B: Inline the CA via env (PEM text or base64)
# DB_SSL_CA="-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----\n"
# DB_SSL_CA_B64="BASE64ENCODEDPEM"
# Optional overrides:
# DB_SSL_SERVERNAME="your.db.host"        # if certificate CN doesn't match the host in DATABASE_URL
# DB_SSL_REJECT_UNAUTHORIZED="false"      # only for dev/emergency; disables verification
# DB_SSL_DISABLE="true"                    # disable TLS entirely (e.g., local Postgres without SSL)
```

#### For `prisma`
The .env file must be in the root folder and the variables are the following:
```
DATABASE_URL="postgresql://<user>:<password>@<host>:<port>/<dbname>"
```

#### For `frontend`

The .env file must be in the root folder and the variables are the following:
```
VUE_APP_BACKEND_API=http://localhost:9000

VUE_APP_FACEBOOK_ID=301496872638701
VUE_APP_FACEBOOK_SECRET=df7f981cd3796d2fe206e749e1a047cd

VUE_APP_GOOGLE_CLIENT_ID=1030438905076-4pgaqbi73u4sarm2c9o365g39s39tknm.apps.googleusercontent.com
VUE_APP_GOOGLE_CLIENT_ID_ANDROID=1030438905076-karhs0snjpfemb3o08bkkerndmtn719m.apps.googleusercontent.com
VUE_APP_GOOGE_CLIENT_SECRET=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
```

### Deployment

#### For `Frontend`
* Just copy the generated `dist` folder into the VPS `/var/www/html/takoyaki/frontend/` to update the contents.

#### For `Backend`
* Update the code located in `/var/www/html/takoyaki/backend` and restart the pm2
```
pm2 status
pm2 restart <id>
```

### Capacitor
Before running the commands below make sure that you have compile the frontend and the backend as production.


#### Compile and build for android
```
npx cap sync <ios or android>
npx cap copy <ios or android>
npx cap run <ios or android>
```
