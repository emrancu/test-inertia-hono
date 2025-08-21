import { Context } from "hono";

let environmentVars: Record<string, unknown> = {};

/**
 * RequestData class handles HTTP request processing and data extraction
 */
class RequestData {
	private readonly request: Request;
	private requestData: Record<string, unknown> = {};
	private headers: Record<string, string> = {};
	private context: Context | null = null;
	private baseUrl: string = "";
	private path: string = "";
	private initialized: boolean = false;

	constructor(request: Request) {
		this.request = request;
		this.initialize();
	}

	/**
	 * Initialize request data synchronously
	 * Parses URL, headers, and query parameters immediately
	 * Body parsing is done separately via initializeBody() for async operations
	 */
	private initialize(): void {
		if (this.initialized) return;

		try {
			this.parseUrl();
			this.parseHeaders();
			this.initialized = true;
		} catch (error) {
			console.error("Failed to initialize request data:", error);
			throw new Error("Request initialization failed");
		}
	}

	/**
	 * Initialize request body data asynchronously
	 * Must be called separately for requests with body content
	 */
	async initializeBody(): Promise<void> {
		try {
			await this.parseRequestBody();
		} catch (error) {
			console.error("Failed to initialize request body:", error);
			throw new Error("Request body initialization failed");
		}
	}

	/**
	 * Parse request body based on content type
	 */
	private async parseRequestBody(): Promise<void> {
		if (!["POST", "PUT", "PATCH"].includes(this.request.method)) {
			return;
		}

		const contentType = this.request.headers.get("content-type") || "";

		try {
			if (contentType.includes("application/json")) {
				this.requestData = await this.request.json();
			} else if (
				contentType.includes("application/x-www-form-urlencoded") ||
				contentType.includes("multipart/form-data")
			) {
				const formData = await this.request.formData();
				const formDataObject: Record<string, string> = {};
				
				for (const [key, value] of formData.entries()) {
					// Handle File objects and convert to string representation
					if (typeof value === 'object' && value !== null && 'name' in value) {
						formDataObject[key] = `[File: ${(value as any).name}]`;
					} else {
						formDataObject[key] = value.toString();
					}
				}
				
				this.requestData = formDataObject;
			}
		} catch (error) {
			console.error("Failed to parse request body:", error);
			this.requestData = {};
		}
	}

	/**
	 * Parse URL and extract query parameters
	 */
	private parseUrl(): void {
		try {
			const url = new URL(this.request.url);
			
			// Extract query parameters
			const queryParams = Object.fromEntries(url.searchParams.entries());
			this.requestData = { ...queryParams, ...this.requestData };

			// Set base URL and path
			this.baseUrl = `${url.protocol}//${url.host}`;
			this.path = url.pathname;
		} catch (error) {
			console.error("Failed to parse URL:", error);
			// Fallback for invalid URLs
			this.baseUrl = "";
			this.path = "/";
		}
	}

	/**
	 * Parse and store request headers
	 */
	private parseHeaders(): void {
		this.headers = {};
		this.request.headers.forEach((value, key) => {
			this.headers[key.toLowerCase()] = value;
		});
	}


	/**
	 * Get all request data (query params + body data)
	 */
	all(): Record<string, unknown> { 
		return this.requestData;
	}

	/**
	 * Set the Hono context
	 */
	setContext(context: Context): void {
		this.context = context;
	}

	/**
	 * Get the Hono context
	 */
	getContext(): Context {
		if (!this.context) {
			throw new Error("Context not set");
		}
		return this.context;
	}

	/**
	 * Get input value by key with optional default
	 */
	input(key: string, defaultValue: any = ''): any { 
		return this.requestData[key] ?? defaultValue;
	}

	/**
	 * Alias for input method
	 */
	get(key: string, defaultValue: unknown = null): unknown {
		return this.input(key, defaultValue);
	}

	/**
	 * Get the original request object
	 */
	getRequest(): Request {
		return this.request;
	}

	/**
	 * Get header value by key with optional default
	 */
	header(key: string, defaultValue: string = ""): string { 
		return this.headers[key.toLowerCase()] ?? defaultValue;
	}

	/**
	 * Get all headers
	 */
	allHeaders(): Record<string, string> { 
		return { ...this.headers };
	}

	/**
	 * Check if request method matches
	 */
	isMethod(method: string): boolean {
		return this.request.method.toLowerCase() === method.toLowerCase();
	}

	/**
	 * Get client IP address
	 */
	ip(): string { 
		const forwardedFor = this.header("x-forwarded-for");
		if (forwardedFor) {
			return forwardedFor.split(",")[0].trim();
		}
		return this.header("x-real-ip") || "127.0.0.1";
	}

	/**
	 * Get URL without query parameters (protocol + host + path)
	 */
	url(): string {
		try {
			const url = new URL(this.request.url);
			return `${url.protocol}//${url.host}${url.pathname}`;
		} catch (error) {
			return this.baseUrl + this.path;
		}
	}

	/**
	 * Alias for url() - Get the complete full URL
	 */
	fullurl(): string {
		return this.request.url;
	}

	/**
	 * Get the base URL (protocol + host) without path
	 */
	getBaseUrl(): string {
		return this.baseUrl;
	}

	/**
	 * Get request path (pathname without query parameters)
	 */
	pathname(): string { 
		return this.path;
	}

	/**
	 * Get URI (path + query string if present)
	 */
	uri(): string {
		try {
			const url = new URL(this.request.url);
			return url.pathname + url.search;
		} catch (error) {
			return this.path;
		}
	}

	/**
	 * Check if request is initialized
	 */
	isInitialized(): boolean {
		return this.initialized;
	}
}

// Global request instance
export let AppRequest!: RequestData;

/**
 * Set environment variables
 */
export function setEnv(env: Record<string, unknown>): void {
	environmentVars = { ...env };
}

/**
 * Get environment variable with optional default
 */
export function getEnv(key: string, defaultValue: unknown = ""): unknown {
	return environmentVars[key] ?? defaultValue;
}

/**
 * Create and set global request instance
 * The request is automatically initialized with URL, headers, and query parameters
 * For requests with body content, call initializeBody() separately
 */
export function setRequest(request: Request): RequestData {
	AppRequest = new RequestData(request);
 
	return AppRequest;
}


export function setContext(context: Context): void {
	AppRequest.setContext(context);
}
 

/**
 * Get the current global request instance
 */
export function getRequest(): RequestData {
	
	if (!AppRequest) {
		throw new Error("No request instance available. Call setRequest() first.");
	}

	return AppRequest;
}