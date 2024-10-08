import { FastApiBuild } from "./FastApiBuild";
import { FastApiDependency } from "./FastApiDependency";
import { FastApiRoute } from "./FastApiRoute";
import { FastApiRouteType } from "./FastApiRouteType";
import fs from 'fs'
import path from 'path'
import { FastApiResource } from "./FastApiResource";

export class FastApiProject {
    public name: string;
    public port: number;
    public deps?: FastApiDependency[];
    public routers: FastApiRoute[];
    public build?: FastApiBuild;
    public resources?: FastApiResource[];
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
        return JSON.stringify(this, null, 2);
    }
    public buildTSConfig() {
        return JSON.stringify({
            "compilerOptions": {
                "target": "ESNext",
                "module": "CommonJS",
                "rootDir": "./src",
                "sourceMap": true,
                "outDir": "./dist",
                "esModuleInterop": true,
                "forceConsistentCasingInFileNames": true,
                "strict": false,
                "skipLibCheck": true
            }
        }, null, 2);
    }
    public buildIndex() {
        return `import { NextApplication, NextFileResolverPlugin, NextOptions } from "fastapi-next";
${this.routers.some(r => r.type === FastApiRouteType.WEBSOCKET) ? `import { NextSocketOptions } from "fastapi-next";` : ""}

async function main() {
    const options = new NextOptions();
    ${this.routers.filter(r => r.type == FastApiRouteType.REST).map(r => {
                return `options.routerDirs.push(__dirname + "/${r.path.replace(/^\//, "")}");`;
            }).join("\n")}
    ${this.routers.filter(r => r.type == FastApiRouteType.WEBSOCKET).map(r => {
                return `options.socketRouterDirs.push(__dirname + "/${r.path.replace(/^\//, "")}");`;
            }).join("\n")}
    ${this.routers.some(r => r.type == FastApiRouteType.WEBSOCKET) ? `options.sockets = new NextSocketOptions();` : ``}
    const app = new NextApplication(options);

    // ? Health Check
    app.enableHealthCheck();

    // ? Plugins
    app.registry.register(new NextFileResolverPlugin());

    // ? Session
    app.registerInMemorySession();

    // ? Init
    await app.init();

    // ? Start
    await app.start();
}
main();`.replace(/^\n{2,}/gm, "");
    }

    public buildHelloWorld() {
        return `import { NextContext } from "fastapi-next";
export default async function (ctx: NextContext<any>){
    return "Hello World :)";
}`
    }

    public makeDockerFile(distPath: string, distIndex: string, npmrcPath: string) {
        var isBundle = Boolean(this.build?.bundle);
        var dockerFile = "";
        const nodeBuildVersion = "latest";
        const nodeReleaseVersion = "slim";
        var environments = [
            "PORT=5000",
            "NODE_ENV=production"
        ];
        if (isBundle) {
            dockerFile = `FROM mhart/alpine-node:16
WORKDIR /app
COPY . .
${environments.map(e => `ENV ${e}`).join("\n")}
RUN chmod +x index\nENTRYPOINT ./index
`
        }
        else {
            dockerFile = `FROM node:${nodeBuildVersion} as build
WORKDIR /app
COPY package.json .
RUN npm install --production --legacy-peer-deps

FROM node:${nodeReleaseVersion}
${environments.map(e => `ENV ${e}`).join("\n")}
WORKDIR /app
COPY --from=build /app .
COPY --from=build /app/node_modules ./node_modules
COPY . .
ENTRYPOINT ["node", "index"]`
        }
        fs.writeFileSync(path.join(distPath, "Dockerfile"), dockerFile);
    }
    public buildVSCodeLaunch() {
        return JSON.stringify({
            "version": "0.2.0",
            "configurations": [
                {
                    "type": "node",
                    "request": "launch",
                    "name": "Debug",
                    "skipFiles": [
                        "<node_internals>/**"
                    ],
                    "runtimeExecutable": "fastapi",
                    "args": [
                        "watch"
                    ],
                    "env": {
                        "PORT": "5000"
                    }
                }
            ]
        }, null, 2)
    }
}

