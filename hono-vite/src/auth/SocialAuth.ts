import { Github } from "./social-auth/Github";
import { Google } from "./social-auth/Google";
import { Linkedin } from "./social-auth/Linkedin";
import { Twitter } from "./social-auth/Twitter";

/**
 * SocialAuth provides OAuth authentication with various providers
 * Integrates with the guard-based Auth system
 * 
 * Usage:
 * - SocialAuth.google().redirect() // Redirect to Google OAuth
 * - SocialAuth.google().getUser() // Get user data from Google
 * - SocialAuth.google().guard('web').login() // Login with session
 * - SocialAuth.google().guard('api').login({ permissions: ['read'] }) // Login with JWT
 * - SocialAuth.google().login({ createUserCallback: async (socialUser) => {...} }) // Custom user creation
 */
export const SocialAuth = {
	/**
	 * Google OAuth provider
	 */
	google() {
		return new Google();
	},

	/**
	 * LinkedIn OAuth provider
	 */
	linkedin() {
		return new Linkedin();
	},

	/**
	 * X/Twitter OAuth provider
	 */
	x() {
		return new Twitter();
	},

	/**
	 * Github OAuth provider
	 */
	github() {
		return new Github();
	},
};


