import "dotenv/config";
import { S3Client, PutBucketCorsCommand } from "@aws-sdk/client-s3";
import { r2Client, R2_BUCKET_NAME } from "../lib/r2/config";

async function setupCORS() {
  try {
    if (!R2_BUCKET_NAME) {
      console.error("❌ R2_BUCKET_NAME is not set in environment variables!");
      process.exit(1);
    }

    console.log(`🔧 Setting up CORS for bucket: ${R2_BUCKET_NAME}`);

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
  } catch (error: any) {
    console.error("❌ Error setting up CORS:", error.message);
    process.exit(1);
  }
}

setupCORS();

