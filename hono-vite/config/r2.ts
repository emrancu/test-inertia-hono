import { R2Config } from "../src/type-declaration/storage";
import { getEnv } from "../src/core";

export const r2Config: R2Config = {
	// Get the R2 bucket from environment using the binding name
	// The binding name should match what's defined in wrangler.jsonc
	bucket: getEnv("MY_BUCKET"),

	// Optional: Public URL for accessing files (if you have a custom domain)
	publicUrl: getEnv("R2_PUBLIC_URL", "https://files.yourdomain.com") as string,

	// Default access control for uploaded files
	defaultACL: "private",

	// Optional: Maximum file size (10MB example)
	maxFileSize: 10 * 1024 * 1024,

	// Optional: Allowed MIME types
	allowedMimeTypes: [
		"image/jpeg",
		"image/png",
		"image/gif",
		"image/webp",
		"image/svg+xml",
		"application/pdf",
		"text/plain",
		"text/csv",
		"application/json",
		"application/zip",
		"video/mp4",
		"video/webm",
	],

	// Optional: S3-compatible API credentials (for direct API access)
	// These are loaded from environment variables using getEnv()
	credentials: {
		accountId: getEnv("R2_ACCOUNT_ID", "") as string,
		accessKeyId: getEnv("R2_ACCESS_KEY_ID", "") as string,
		secretAccessKey: getEnv("R2_SECRET_ACCESS_KEY", "") as string,
	},
};

