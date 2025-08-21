import bcrypt from "bcryptjs";

import { sign, verify } from "hono/jwt";
import { App } from "../core";

export const passwordHash = async (password: string): Promise<string> => {
	return await bcrypt.hash(password, 10);
};

export const passwordVerify = async (
	password: string,
	userPassword: string,
): Promise<boolean> => {
	return await bcrypt.compare(password, userPassword);
};

export const encrypt = async (data: unknown): Promise<string> => {
	return await sign({ data: data }, App.config.app.secret);
};

export const decrypt = async (token: string): Promise<any> => {
	const data = await verify(token, App.config.app.secret);

	return data?.data ?? null;
};
