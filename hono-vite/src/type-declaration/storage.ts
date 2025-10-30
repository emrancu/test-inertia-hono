export type R2Config = {
	bucket: any; // The R2 bucket instance from environment
	publicUrl?: string; // Optional public URL for accessing files
	defaultACL?: "public-read" | "private"; // Default access control
	maxFileSize?: number; // Max file size in bytes (optional)
	allowedMimeTypes?: string[]; // Allowed MIME types (optional)
	// Optional: For direct S3-compatible API access
	credentials?: {
		accountId?: string; // Account ID from environment
		accessKeyId?: string; // Access key from environment
		secretAccessKey?: string; // Secret key from environment
	};
};

export type UploadOptions = {
	customMetadata?: Record<string, string>;
	httpMetadata?: {
		contentType?: string;
		contentLanguage?: string;
		contentDisposition?: string;
		contentEncoding?: string;
		cacheControl?: string;
		cacheExpiry?: Date;
	};
};

export type FileInfo = {
	key: string;
	size: number;
	uploaded: Date;
	httpMetadata?: {
		contentType?: string;
		contentLanguage?: string;
		contentDisposition?: string;
		contentEncoding?: string;
		cacheControl?: string;
		cacheExpiry?: Date;
	};
	customMetadata?: Record<string, string>;
};

export type ListOptions = {
	prefix?: string;
	limit?: number;
	cursor?: string;
};

export type ListResult = {
	objects: FileInfo[];
	truncated: boolean;
	cursor?: string;
};

