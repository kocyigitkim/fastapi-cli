export class FastApiProject {
    public name: string;
    public port: number;
    public deps?: FastApiDependency[];
    public routers: FastApiRoute[];
    public build?: FastApiBuild;
    public static open(data: Buffer | string): FastApiProject {
        var js = data instanceof Buffer ? data.toString() : data;
        var project = JSON.parse(js);
        var res = new FastApiProject();
        for (var k in project) {
            res[k] = project[k];
        }
        return res;
    }
    public save(): string {
        return JSON.stringify(this);
    }
}

export enum FastApiRouteType {
    REST = "rest",
    WEBSOCKET = "websocket"
}

export class FastApiRoute {
    public type: FastApiRouteType;
    public path: string;
}

export class FastApiDependency {
    public name: string;
    public version: string;
    public repository?: string;
}

export enum FastApiBuildMode{
    Default= "default",
    Docker = "docker",
    DockerCompose = "docker-compose"
}

export class FastApiBuild{
    public mode: FastApiBuildMode;
    public output: string;
    public compress: boolean;
    public bundle: boolean;
}