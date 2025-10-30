# R2 File Manager

The framework provides a comprehensive R2 File Manager for handling file uploads, downloads, and management using Cloudflare R2 (S3-compatible storage). 

**All configuration comes from `config/r2.ts`** - this is the single source of truth for R2 settings. The config file uses `getEnv()` to resolve environment variables, and the R2FileManager simply reads from the config.

## Configuration

### Step 1: Add R2 bucket binding to `wrangler.jsonc`

```jsonc
{
  "name": "my-app",
  "r2_buckets": [
    {
      "binding": "MY_BUCKET",
      "bucket_name": "my-bucket-name"
    }
  ]
}
```

### Step 2: Configure R2 settings in `config/r2.ts`

**This is the single source of truth for all R2 configuration.** All environment variables are resolved here using `getEnv()`:

```ts
import { R2Config } from "../src/type-declaration/storage";
import { getEnv } from "../src/core";

export const r2Config: R2Config = {
  // Get the R2 bucket from environment (binding name from wrangler.jsonc)
  bucket: getEnv("MY_BUCKET"),

  // Optional: Public URL for accessing files
  // Can be loaded from environment or use a default value
  publicUrl: getEnv("R2_PUBLIC_URL", "https://files.yourdomain.com") as string,

  // Default access control
  defaultACL: "private",

  // Maximum file size (10MB in this example)
  maxFileSize: 10 * 1024 * 1024,

  // Allowed MIME types for upload validation
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

  // S3-compatible API credentials (optional, for direct API access)
  credentials: {
    accountId: getEnv("R2_ACCOUNT_ID", "") as string,
    accessKeyId: getEnv("R2_ACCESS_KEY_ID", "") as string,
    secretAccessKey: getEnv("R2_SECRET_ACCESS_KEY", "") as string,
  },
};
```

**Key Points:**
- ✅ **All `getEnv()` calls happen here** in the config file
- ✅ **R2FileManager reads from this config** - no environment access in the manager
- ✅ **Single source of truth** - all R2 settings in one place
- ✅ **Type-safe** - TypeScript validates all configuration

### Step 3: Set environment variables (Optional)

If you need direct S3-compatible API access, set these environment variables:

```bash
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=your-r2-access-key-id
R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
```

Or in your `.dev.vars` file for local development:

```env
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=your-r2-access-key-id
R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
```

## Usage

Import the FileManager:

```ts
import { FileManager } from "../src/storage";
// Or create a new instance
import { R2FileManager } from "../src/storage";
const fileManager = new R2FileManager();
```

## Upload Files

### Upload from FormData

```ts
import { FileManager } from "../src/storage";

Route.post("/upload", async (c) => {
  const formData = await c.req.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return c.json({ error: "No file provided" }, 400);
  }

  // Upload with auto-generated key
  const fileKey = await FileManager.upload(file);

  return c.json({
    success: true,
    key: fileKey,
    url: FileManager.getPublicUrl(fileKey),
  });
});
```

### Upload with Custom Key and Metadata

```ts
Route.post("/upload-custom", async (c) => {
  const formData = await c.req.formData();
  const file = formData.get("file") as File;

  const fileKey = await FileManager.upload(
    file,
    `uploads/images/${Date.now()}-${file.name}`, // Custom key
    {
      customMetadata: {
        uploadedBy: "user123",
        originalName: file.name,
      },
      httpMetadata: {
        contentType: file.type,
        cacheControl: "max-age=31536000",
      },
    }
  );

  return c.json({ success: true, key: fileKey });
});
```

### Upload from Buffer or Stream

```ts
Route.post("/upload-buffer", async (c) => {
  const data = await c.req.arrayBuffer();

  const fileKey = await FileManager.uploadBuffer(
    data,
    "documents/report.pdf",
    {
      httpMetadata: {
        contentType: "application/pdf",
        contentDisposition: 'attachment; filename="report.pdf"',
      },
    }
  );

  return c.json({ key: fileKey });
});
```

## List Files

### List All Files

```ts
Route.get("/files", async (c) => {
  const result = await FileManager.list();

  return c.json({
    files: result.objects,
    truncated: result.truncated,
  });
});
```

### List with Prefix and Pagination

```ts
Route.get("/files/images", async (c) => {
  const cursor = c.req.query("cursor");

  const result = await FileManager.list({
    prefix: "uploads/images/",
    limit: 50,
    cursor: cursor,
  });

  return c.json({
    files: result.objects.map((file) => ({
      key: file.key,
      size: file.size,
      uploaded: file.uploaded,
      url: FileManager.getPublicUrl(file.key),
    })),
    nextCursor: result.cursor,
    hasMore: result.truncated,
  });
});
```

## Download/Get Files

### Get File

```ts
Route.get("/download/:key", async (c) => {
  const key = c.req.param("key");
  const file = await FileManager.get(key);

  if (!file) {
    return c.json({ error: "File not found" }, 404);
  }

  return new Response(file.body, {
    headers: {
      "Content-Type": file.httpMetadata?.contentType || "application/octet-stream",
      "Content-Length": file.size.toString(),
    },
  });
});
```

### Stream File to Response

```ts
Route.get("/stream/:key", async (c) => {
  const key = c.req.param("key");
  const file = await FileManager.get(key);

  if (!file) {
    return c.notFound();
  }

  return c.body(file.body, {
    headers: {
      "Content-Type": file.httpMetadata?.contentType || "application/octet-stream",
      "Cache-Control": file.httpMetadata?.cacheControl || "no-cache",
    },
  });
});
```

### Get File Metadata (Without Downloading)

```ts
Route.get("/file-info/:key", async (c) => {
  const key = c.req.param("key");
  const metadata = await FileManager.head(key);

  if (!metadata) {
    return c.json({ error: "File not found" }, 404);
  }

  return c.json({
    key: metadata.key,
    size: metadata.size,
    uploaded: metadata.uploaded,
    contentType: metadata.httpMetadata?.contentType,
    customMetadata: metadata.customMetadata,
  });
});
```

## Delete Files

### Delete Single File

```ts
Route.delete("/files/:key", async (c) => {
  const key = c.req.param("key");
  
  await FileManager.delete(key);

  return c.json({ success: true, message: "File deleted" });
});
```

### Delete Multiple Files

```ts
Route.post("/files/delete-batch", async (c) => {
  const { keys } = await c.req.json();

  await FileManager.deleteMultiple(keys);

  return c.json({
    success: true,
    message: `${keys.length} files deleted`,
  });
});
```

## Additional Operations

### Check if File Exists

```ts
Route.get("/exists/:key", async (c) => {
  const key = c.req.param("key");
  const exists = await FileManager.exists(key);

  return c.json({ exists });
});
```

### Copy File

```ts
Route.post("/files/copy", async (c) => {
  const { source, destination } = await c.req.json();

  await FileManager.copy(source, destination);

  return c.json({
    success: true,
    message: "File copied",
    newKey: destination,
  });
});
```

### Move File

```ts
Route.post("/files/move", async (c) => {
  const { source, destination } = await c.req.json();

  await FileManager.move(source, destination);

  return c.json({
    success: true,
    message: "File moved",
    newKey: destination,
  });
});
```

### Get File Size

```ts
Route.get("/size/:key", async (c) => {
  const key = c.req.param("key");
  const size = await FileManager.getSize(key);

  if (size === null) {
    return c.json({ error: "File not found" }, 404);
  }

  return c.json({
    key,
    size,
    sizeInMB: (size / 1024 / 1024).toFixed(2),
  });
});
```

### Update File Metadata

```ts
Route.patch("/files/:key/metadata", async (c) => {
  const key = c.req.param("key");
  const { metadata } = await c.req.json();

  await FileManager.updateMetadata(key, {
    customMetadata: metadata,
    httpMetadata: {
      cacheControl: "max-age=86400",
    },
  });

  return c.json({ success: true });
});
```

## Get Public URL

```ts
Route.get("/public-url/:key", async (c) => {
  const key = c.req.param("key");
  const url = FileManager.getPublicUrl(key);

  return c.json({ url });
});
```

## Get S3-Compatible API Credentials

If you need to use AWS SDK or other S3-compatible clients:

```ts
Route.get("/api/r2/credentials", async (c) => {
  const credentials = FileManager.getApiCredentials();

  if (!credentials) {
    return c.json({ error: "Credentials not configured" }, 400);
  }

  return c.json({
    endpoint: credentials.endpoint,
    accountId: credentials.accountId,
    // Don't expose secrets in production!
  });
});
```

Use with AWS SDK v3:

```ts
import { S3Client } from "@aws-sdk/client-s3";

const credentials = FileManager.getApiCredentials();

if (credentials) {
  const s3Client = new S3Client({
    region: "auto",
    endpoint: credentials.endpoint,
    credentials: {
      accessKeyId: credentials.accessKeyId!,
      secretAccessKey: credentials.secretAccessKey!,
    },
  });
}
```

## Complete Example: Image Upload API

```ts
import { FileManager } from "../src/storage";

// Upload endpoint with validation
Route.post("/api/images/upload", async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get("image") as File;

    if (!file) {
      return c.json({ error: "No file provided" }, 400);
    }

    // Upload with custom prefix and metadata
    const fileKey = await FileManager.upload(file, undefined, {
      customMetadata: {
        uploadedAt: new Date().toISOString(),
        userId: c.get("userId") || "anonymous",
      },
      httpMetadata: {
        contentType: file.type,
        cacheControl: "public, max-age=31536000",
      },
    });

    return c.json({
      success: true,
      file: {
        key: fileKey,
        url: FileManager.getPublicUrl(fileKey),
        size: file.size,
        type: file.type,
      },
    });
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

// List images
Route.get("/api/images", async (c) => {
  const result = await FileManager.list({
    prefix: "uploads/",
    limit: 100,
  });

  return c.json({
    images: result.objects.map((obj) => ({
      key: obj.key,
      url: FileManager.getPublicUrl(obj.key),
      size: obj.size,
      uploaded: obj.uploaded,
      metadata: obj.customMetadata,
    })),
  });
});

// Delete image
Route.delete("/api/images/:key", async (c) => {
  const key = c.req.param("key");
  
  const exists = await FileManager.exists(key);
  if (!exists) {
    return c.json({ error: "File not found" }, 404);
  }

  await FileManager.delete(key);

  return c.json({ success: true, message: "Image deleted" });
});
```

## API Reference

### Methods

| Method | Description | Parameters | Returns |
|--------|-------------|------------|---------|
| `upload(file, key?, options?)` | Upload a file | `File, string?, UploadOptions?` | `Promise<string>` |
| `uploadBuffer(data, key, options?)` | Upload from buffer/stream | `ArrayBuffer/ReadableStream, string, UploadOptions?` | `Promise<string>` |
| `get(key)` | Get file object | `string` | `Promise<R2ObjectBody \| null>` |
| `head(key)` | Get file metadata | `string` | `Promise<R2Object \| null>` |
| `delete(key)` | Delete a file | `string` | `Promise<void>` |
| `deleteMultiple(keys)` | Delete multiple files | `string[]` | `Promise<void>` |
| `list(options?)` | List files | `ListOptions?` | `Promise<ListResult>` |
| `exists(key)` | Check if file exists | `string` | `Promise<boolean>` |
| `getPublicUrl(key)` | Get public URL | `string` | `string` |
| `getApiCredentials()` | Get S3 API credentials | `none` | `object \| null` |
| `copy(source, dest)` | Copy file | `string, string` | `Promise<void>` |
| `move(source, dest)` | Move file | `string, string` | `Promise<void>` |
| `getSize(key)` | Get file size | `string` | `Promise<number \| null>` |
| `updateMetadata(key, metadata)` | Update metadata | `string, object` | `Promise<void>` |

## File Validation

The R2FileManager automatically validates files based on your config:

- **Max File Size**: Rejects files exceeding `maxFileSize`
- **MIME Type**: Validates against `allowedMimeTypes` if configured
- **HTTP Exceptions**: Throws appropriate errors for validation failures

## How It Works - Architecture

The R2 File Manager follows a **single source of truth** pattern where all configuration happens in `config/r2.ts`:

### Flow: Environment → Config → Manager

```
┌─────────────────┐
│   Environment   │  (Cloudflare Workers bindings & env vars)
│  - MY_BUCKET    │
│  - R2_*         │
└────────┬────────┘
         │ getEnv()
         ↓
┌─────────────────┐
│  config/r2.ts   │  ← Single source of truth
│                 │
│  bucket: getEnv("MY_BUCKET")
│  publicUrl: getEnv("R2_PUBLIC_URL", "...")
│  maxFileSize: 10 * 1024 * 1024
│  allowedMimeTypes: [...]
│  credentials: { getEnv(...) }
└────────┬────────┘
         │ App.config.r2
         ↓
┌─────────────────┐
│ R2FileManager   │  ← Just reads from config
│                 │
│  getBucket() { return App.config.r2.bucket; }
│  validateFile() { use App.config.r2.maxFileSize }
│  getPublicUrl() { use App.config.r2.publicUrl }
│  getApiCredentials() { use App.config.r2.credentials }
└─────────────────┘
```

### Key Implementation

**1. Config File** (`config/r2.ts`) - All environment resolution happens here:

```ts
import { getEnv } from "../src/core";

export const r2Config: R2Config = {
  bucket: getEnv("MY_BUCKET"),           // ← getEnv() called here
  publicUrl: getEnv("R2_PUBLIC_URL", "https://...") as string,
  maxFileSize: 10 * 1024 * 1024,
  allowedMimeTypes: ["image/jpeg", ...],
  credentials: {
    accountId: getEnv("R2_ACCOUNT_ID", "") as string,
    accessKeyId: getEnv("R2_ACCESS_KEY_ID", "") as string,
    secretAccessKey: getEnv("R2_SECRET_ACCESS_KEY", "") as string,
  },
};
```

**2. File Manager** (`src/storage/R2FileManager.ts`) - Only reads from config:

```ts
// ✅ No getEnv() calls in the manager!

private getBucket(): any {
  return App.config.r2.bucket;  // Just read from config
}

private validateFile(file: File): void {
  const config = App.config.r2;  // All settings from config
  if (config.maxFileSize && file.size > config.maxFileSize) { ... }
  if (config.allowedMimeTypes && ...) { ... }
}

public getPublicUrl(key: string): string {
  const publicUrl = App.config.r2.publicUrl;  // From config
  return `${publicUrl}/${key}`;
}

public getApiCredentials() {
  const credentials = App.config.r2.credentials;  // From config
  return { ...credentials, endpoint: `https://...` };
}
```

### Benefits

✅ **Single Source of Truth**: All configuration in one place (`config/r2.ts`)  
✅ **Clean Separation**: Config handles environment, manager handles file operations  
✅ **No Duplication**: `getEnv()` called only once per setting  
✅ **Easy Testing**: Mock `App.config.r2` instead of environment variables  
✅ **Type Safety**: TypeScript validates configuration at compile time  
✅ **Better Performance**: Environment resolved once at startup

## Configuration Best Practices

1. **Single Source of Truth**: All R2 settings are configured in `config/r2.ts`
2. **Environment Variables**: Use `getEnv()` in the config file to load from environment
3. **Default Values**: Provide sensible defaults using `getEnv("KEY", "default")`
4. **Validation Rules**: Set `maxFileSize` and `allowedMimeTypes` in config
5. **Type Safety**: TypeScript ensures all configuration is valid at compile time

## Security Best Practices

1. **Environment Variables**: Store all credentials in environment variables, never hardcode them
2. **Config File Only**: All `getEnv()` calls should be in `config/r2.ts`, not in the manager
3. **Validate File Types**: Configure `allowedMimeTypes` in `config/r2.ts`
4. **File Size Limits**: Set `maxFileSize` in `config/r2.ts` to prevent abuse
5. **CORS Headers**: Set appropriate CORS headers if serving files publicly
6. **Signed URLs**: Use signed URLs for private files instead of making them public
7. **Rate Limiting**: Implement rate limiting on upload endpoints
8. **Virus Scanning**: Scan uploaded files for viruses/malware if handling user uploads
9. **Content Disposition**: Use content-disposition headers to control file downloads
10. **Cache Headers**: Set cache headers appropriately for performance
11. **Access Control**: Never expose S3 credentials in API responses to clients

