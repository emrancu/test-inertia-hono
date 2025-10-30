import { HTTPException } from "hono/http-exception";
import { App } from "../core";
import { Str } from "../supports";
import {
	FileInfo,
	ListOptions,
	ListResult,
	UploadOptions,
} from "../type-declaration/storage";

export class R2FileManager {
	/**
	 * Get the R2 bucket instance from config
	 * Everything comes from config/r2.ts
	 */
	private getBucket(): any {
		const bucket = App.config.r2.bucket;

		if (!bucket) {
			throw new HTTPException(500, {
				message: "R2 bucket not configured. Check config/r2.ts",
			});
		}

		return bucket;
	}

	/**
	 * Validate file before upload
	 * All validation rules come from config/r2.ts
	 */
	private validateFile(file: File): void {
		const config = App.config.r2;

		// Check file size (configured in config/r2.ts)
		if (config.maxFileSize && file.size > config.maxFileSize) {
			throw new HTTPException(400, {
				message: `File size exceeds maximum allowed size of ${config.maxFileSize} bytes`,
			});
		}

		// Check MIME type (configured in config/r2.ts)
		if (config.allowedMimeTypes && config.allowedMimeTypes.length > 0) {
			if (!config.allowedMimeTypes.includes(file.type)) {
				throw new HTTPException(400, {
					message: `File type "${file.type}" is not allowed`,
				});
			}
		}
	}

	/**
	 * Generate a unique file key with optional prefix
	 */
	private generateFileKey(fileName: string, prefix?: string): string {
		const timestamp = Date.now();
		const randomStr = Str.uuid().substring(0, 8);
		const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
		const basePath = prefix ? `${prefix}/` : "";

		return `${basePath}${timestamp}_${randomStr}_${sanitizedFileName}`;
	}

	/**
	 * Upload a file to R2
	 * @param file - The file to upload
	 * @param key - Optional custom key/path for the file
	 * @param options - Upload options (metadata, http headers)
	 * @returns The key of the uploaded file
	 */
	public async upload(
		file: File,
		key?: string,
		options?: UploadOptions,
	): Promise<string> {
		this.validateFile(file);

		const bucket = this.getBucket();
		const fileKey = key || this.generateFileKey(file.name);

		const uploadOptions: any = {
			httpMetadata: {
				contentType: file.type || options?.httpMetadata?.contentType,
				...options?.httpMetadata,
			},
			customMetadata: options?.customMetadata,
		};

		await bucket.put(fileKey, file, uploadOptions);

		return fileKey;
	}

	/**
	 * Upload from ArrayBuffer or ReadableStream
	 * @param data - Data to upload
	 * @param key - The key/path for the file
	 * @param options - Upload options
	 * @returns The key of the uploaded file
	 */
	public async uploadBuffer(
		data: ArrayBuffer | ReadableStream,
		key: string,
		options?: UploadOptions,
	): Promise<string> {
		const bucket = this.getBucket();

		const uploadOptions: any = {
			httpMetadata: options?.httpMetadata,
			customMetadata: options?.customMetadata,
		};

		await bucket.put(key, data, uploadOptions);

		return key;
	}

	/**
	 * Get a file from R2
	 * @param key - The key/path of the file
	 * @returns The R2 object or null if not found
	 */
	public async get(key: string): Promise<any> {
		const bucket = this.getBucket();
		return await bucket.get(key);
	}

	/**
	 * Get file metadata without downloading the file
	 * @param key - The key/path of the file
	 * @returns File metadata or null if not found
	 */
	public async head(key: string): Promise<any> {
		const bucket = this.getBucket();
		return await bucket.head(key);
	}

	/**
	 * Delete a file from R2
	 * @param key - The key/path of the file to delete
	 * @returns void
	 */
	public async delete(key: string): Promise<void> {
		const bucket = this.getBucket();
		await bucket.delete(key);
	}

	/**
	 * Delete multiple files from R2
	 * @param keys - Array of keys/paths to delete
	 * @returns void
	 */
	public async deleteMultiple(keys: string[]): Promise<void> {
		const bucket = this.getBucket();
		await bucket.delete(keys);
	}

	/**
	 * List files in the bucket
	 * @param options - List options (prefix, limit, cursor)
	 * @returns List of files with metadata
	 */
	public async list(options?: ListOptions): Promise<ListResult> {
		const bucket = this.getBucket();

		const result = await bucket.list({
			prefix: options?.prefix,
			limit: options?.limit,
			cursor: options?.cursor,
		});

		const objects: FileInfo[] = result.objects.map((obj: any) => ({
			key: obj.key,
			size: obj.size,
			uploaded: obj.uploaded,
			httpMetadata: obj.httpMetadata,
			customMetadata: obj.customMetadata,
		}));

		return {
			objects,
			truncated: result.truncated,
			cursor: result.cursor,
		};
	}

	/**
	 * Check if a file exists
	 * @param key - The key/path of the file
	 * @returns true if file exists, false otherwise
	 */
	public async exists(key: string): Promise<boolean> {
		const obj = await this.head(key);
		return obj !== null;
	}

	/**
	 * Get the public URL for a file
	 * Public URL comes from config/r2.ts
	 * @param key - The key/path of the file
	 * @returns Public URL string
	 */
	public getPublicUrl(key: string): string {
		const publicUrl = App.config.r2.publicUrl;

		if (!publicUrl) {
			throw new HTTPException(500, {
				message: "Public URL not configured in config/r2.ts",
			});
		}

		// Remove trailing slash from publicUrl if present
		const baseUrl = publicUrl.replace(/\/$/, "");
		// Remove leading slash from key if present
		const cleanKey = key.replace(/^\//, "");

		return `${baseUrl}/${cleanKey}`;
	}

	/**
	 * Get S3-compatible API credentials from config
	 * All credentials come from config/r2.ts
	 * @returns Credentials object or null if not configured
	 */
	public getApiCredentials(): {
		accountId?: string;
		accessKeyId?: string;
		secretAccessKey?: string;
		endpoint?: string;
	} | null {
		const credentials = App.config.r2.credentials;

		if (!credentials || !credentials.accountId || !credentials.accessKeyId || !credentials.secretAccessKey) {
			return null;
		}

		return {
			accountId: credentials.accountId,
			accessKeyId: credentials.accessKeyId,
			secretAccessKey: credentials.secretAccessKey,
			endpoint: `https://${credentials.accountId}.r2.cloudflarestorage.com`,
		};
	}

	/**
	 * Copy a file within the bucket
	 * @param sourceKey - Source file key
	 * @param destinationKey - Destination file key
	 * @returns void
	 */
	public async copy(sourceKey: string, destinationKey: string): Promise<void> {
		const bucket = this.getBucket();
		const sourceObject = await bucket.get(sourceKey);

		if (!sourceObject) {
			throw new HTTPException(404, {
				message: `Source file "${sourceKey}" not found`,
			});
		}

		await bucket.put(destinationKey, sourceObject.body, {
			httpMetadata: sourceObject.httpMetadata,
			customMetadata: sourceObject.customMetadata,
		});
	}

	/**
	 * Move a file within the bucket (copy and delete)
	 * @param sourceKey - Source file key
	 * @param destinationKey - Destination file key
	 * @returns void
	 */
	public async move(sourceKey: string, destinationKey: string): Promise<void> {
		await this.copy(sourceKey, destinationKey);
		await this.delete(sourceKey);
	}

	/**
	 * Get file size
	 * @param key - The key/path of the file
	 * @returns File size in bytes or null if not found
	 */
	public async getSize(key: string): Promise<number | null> {
		const obj = await this.head(key);
		return obj ? obj.size : null;
	}

	/**
	 * Update file metadata
	 * @param key - The key/path of the file
	 * @param metadata - New metadata
	 * @returns void
	 */
	public async updateMetadata(
		key: string,
		metadata: {
			httpMetadata?: UploadOptions["httpMetadata"];
			customMetadata?: Record<string, string>;
		},
	): Promise<void> {
		const bucket = this.getBucket();
		const obj = await bucket.get(key);

		if (!obj) {
			throw new HTTPException(404, {
				message: `File "${key}" not found`,
			});
		}

		await bucket.put(key, obj.body, {
			httpMetadata: metadata.httpMetadata || obj.httpMetadata,
			customMetadata: metadata.customMetadata || obj.customMetadata,
		});
	}
}

/**
 * Resolve R2FileManager from container
 */
export const resolveR2FileManager = (): R2FileManager => {
	return App.getContainer().resolve("R2FileManager", () => {
		return new R2FileManager();
	});
};

// Export singleton instance
export const FileManager = resolveR2FileManager();

