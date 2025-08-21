/**
 * CSRF Helper Functions for Frontend Integration
 */

/**
 * Get CSRF token from meta tag
 */
export function getCsrfToken(): string | null {
	if (typeof document === 'undefined') return null;
	
	const meta = document.querySelector('meta[name="csrf-token"]');
	return meta ? meta.getAttribute('content') : null;
}

/**
 * Get CSRF token from cookie
 */
export function getCsrfTokenFromCookie(): string | null {
	if (typeof document === 'undefined') return null;
	
	const cookies = document.cookie.split(';');
	for (const cookie of cookies) {
		const [name, value] = cookie.trim().split('=');
		if (name === 'XSRF-TOKEN') {
			return decodeURIComponent(value);
		}
	}
	return null;
}

/**
 * Setup CSRF token for fetch requests
 */
export function setupCsrfForFetch() {
	if (typeof window === 'undefined') return;
	
	const originalFetch = window.fetch;
	
	window.fetch = function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
		const token = getCsrfToken() || getCsrfTokenFromCookie();
		
		if (token && init && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(init.method?.toUpperCase() || '')) {
			init.headers = {
				...init.headers,
				'X-CSRF-TOKEN': token,
				'X-Request-Time': Math.floor(Date.now() / 1000).toString()
			};
		}
		
		return originalFetch.call(this, input, init);
	};
}

/**
 * Setup CSRF token for axios
 */
export function setupCsrfForAxios(axios: any) {
	const token = getCsrfToken() || getCsrfTokenFromCookie();
	
	if (token) {
		axios.defaults.headers.common['X-CSRF-TOKEN'] = token;
		axios.defaults.headers.common['X-Request-Time'] = Math.floor(Date.now() / 1000).toString();
	}
	
	// Add request interceptor to update token on each request
	axios.interceptors.request.use((config: any) => {
		const currentToken = getCsrfToken() || getCsrfTokenFromCookie();
		if (currentToken) {
			config.headers['X-CSRF-TOKEN'] = currentToken;
			config.headers['X-Request-Time'] = Math.floor(Date.now() / 1000).toString();
		}
		return config;
	});
}

/**
 * Create a form with CSRF token
 */
export function createFormWithCsrf(action: string, method: string = 'POST'): HTMLFormElement {
	const form = document.createElement('form');
	form.action = action;
	form.method = method;
	
	const token = getCsrfToken() || getCsrfTokenFromCookie();
	if (token) {
		const csrfInput = document.createElement('input');
		csrfInput.type = 'hidden';
		csrfInput.name = '_token';
		csrfInput.value = token;
		form.appendChild(csrfInput);
	}
	
	return form;
}

/**
 * Add CSRF token to existing form
 */
export function addCsrfToForm(form: HTMLFormElement): void {
	// Remove existing CSRF tokens
	const existingTokens = form.querySelectorAll('input[name="_token"], input[name="csrf_token"]');
	existingTokens.forEach(token => token.remove());
	
	const token = getCsrfToken() || getCsrfTokenFromCookie();
	if (token) {
		const csrfInput = document.createElement('input');
		csrfInput.type = 'hidden';
		csrfInput.name = '_token';
		csrfInput.value = token;
		form.appendChild(csrfInput);
	}
}

/**
 * Auto-setup CSRF for all forms on page load
 */
export function autoSetupCsrf() {
	if (typeof document === 'undefined') return;
	
	// Setup fetch
	setupCsrfForFetch();
	
	// Setup existing forms
	const forms = document.querySelectorAll('form');
	forms.forEach(form => {
		if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(form.method.toUpperCase())) {
			addCsrfToForm(form);
		}
	});
	
	// Watch for new forms
	const observer = new MutationObserver((mutations) => {
		mutations.forEach((mutation) => {
			mutation.addedNodes.forEach((node) => {
				if (node.nodeType === Node.ELEMENT_NODE) {
					const element = node as Element;
					
					// Check if it's a form
					if (element.tagName === 'FORM') {
						const form = element as HTMLFormElement;
						if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(form.method.toUpperCase())) {
							addCsrfToForm(form);
						}
					}
					
					// Check for forms inside the added element
					const forms = element.querySelectorAll('form');
					forms.forEach(form => {
						if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(form.method.toUpperCase())) {
							addCsrfToForm(form);
						}
					});
				}
			});
		});
	});
	
	observer.observe(document.body, {
		childList: true,
		subtree: true
	});
}
