export type JWTPayload = {
	[key: string]: unknown;
	/**
	 * The token is checked to ensure it has not expired.
	 */
	exp?: number;
	/**
	 * The token is checked to ensure it is not being used before a specified time.
	 */
	nbf?: number;
	/**
	 * The token is checked to ensure it is not issued in the future.
	 */
	iat?: number;
};



export type JwtMiddlewareOptions = {
	secret: string;
	cookie?:
		| string
		| {
				key: string;
				secret?: string;
		  };
};
