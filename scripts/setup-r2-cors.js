// JavaScript wrapper to ensure proper module resolution
require('dotenv').config();
const { S3Client, PutBucketCorsCommand } = require('@aws-sdk/client-s3');

// Import R2 config
const path = require('path');
const fs = require('fs');

// Load environment variables
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_ENDPOINT = process.env.R2_ENDPOINT || (R2_ACCOUNT_ID ? `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : null);

// Validate environment variables
function validateConfig() {
  const missing = [];
  if (!R2_ACCOUNT_ID) missing.push('R2_ACCOUNT_ID');
  if (!R2_ACCESS_KEY_ID) missing.push('R2_ACCESS_KEY_ID');
  if (!R2_SECRET_ACCESS_KEY) missing.push('R2_SECRET_ACCESS_KEY');
  if (!R2_BUCKET_NAME) missing.push('R2_BUCKET_NAME');
  
  if (missing.length > 0) {
    console.error("❌ Missing required environment variables:");
    missing.forEach(v => console.error(`   - ${v}`));
    console.error("\n💡 Add these to your .env file");
    process.exit(1);
  }
  
  if (!R2_ENDPOINT) {
    console.error("❌ R2_ENDPOINT or R2_ACCOUNT_ID is required!");
    process.exit(1);
  }
  
  return true;
}

// Create R2 client
const r2Client = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

async function setupCORS() {
  try {
    validateConfig();
    
    console.log(`🔧 Setting up CORS for bucket: ${R2_BUCKET_NAME}`);
    console.log(`📍 Endpoint: ${R2_ENDPOINT}`);
    console.log(`🔑 Access Key ID: ${R2_ACCESS_KEY_ID.substring(0, 8)}...`);
    
    const command = new PutBucketCorsCommand({
      Bucket: R2_BUCKET_NAME,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedHeaders: ["*"],
            AllowedMethods: ["GET", "HEAD"],
            AllowedOrigins: ["*"], // In production, replace with your domain
            ExposeHeaders: [
              "ETag",
              "Content-Length",
              "Content-Type",
              "Accept-Ranges",
              "Content-Range",
            ],
            MaxAgeSeconds: 3600,
          },
        ],
      },
    });

    await r2Client.send(command);
    console.log("✅ CORS configuration applied successfully!");
    console.log("\n⚠️  Note: In production, update AllowedOrigins to your domain");
  } catch (error) {
    console.error("\n❌ Error setting up CORS:");
    console.error(`   Message: ${error.message}`);
    
    if (error.name === 'AccessDenied' || error.message.includes('Access Denied')) {
      console.error("\n💡 Possible issues:");
      console.error("   1. Check that your R2_ACCESS_KEY_ID has R2:Edit permissions");
      console.error("   2. Verify the bucket name is correct");
      console.error("   3. Ensure the bucket exists in your Cloudflare account");
      console.error("   4. Check that your R2_ACCOUNT_ID is correct");
    } else if (error.name === 'NoSuchBucket' || error.message.includes('does not exist')) {
      console.error("\n💡 The bucket does not exist. Create it in Cloudflare Dashboard first.");
    } else if (error.message.includes('InvalidAccessKeyId')) {
      console.error("\n💡 Invalid access key. Check your R2_ACCESS_KEY_ID.");
    } else if (error.message.includes('SignatureDoesNotMatch')) {
      console.error("\n💡 Invalid secret key. Check your R2_SECRET_ACCESS_KEY.");
    } else {
      console.error(`   Error Code: ${error.name || 'Unknown'}`);
      console.error(`   Stack: ${error.stack}`);
    }
    
    process.exit(1);
  }
}

setupCORS();

