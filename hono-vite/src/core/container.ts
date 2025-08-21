
export class Container {

    private resolved: Record<string, any> = {};

    public resolve<T>(name: string, callback: () => T): T {
        if (!this.resolved[name]) {
            this.resolved[name] = callback();
        }

        return this.resolved[name] as T;
    }

    public get<T = any>(name: string): T {
        if (!this.resolved[name]) {
            throw new Error(`Service '${name}' has not been resolved.`);
        }

        return this.resolved[name];
    }

    public has(name: string): boolean {
        return Object.prototype.hasOwnProperty.call(this.resolved, name);
    }
}
