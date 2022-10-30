import { FastApiBuild } from "./FastApiBuild";
import { FastApiDependency } from "./FastApiDependency";
import { FastApiRoute } from "./FastApiRoute";
import { FastApiRouteType } from "./FastApiRouteType";
import fs from 'fs'
import path from 'path'

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
        return JSON.stringify(this, null, 2);
    }
    public buildTSConfig() {
        return JSON.stringify({
            "compilerOptions": {
                "target": "es2017",
                "module": "commonjs",
                "rootDir": "./src",
                "sourceMap": true,
                "outDir": "dist",
                "noImplicitUseStrict": true,
                "declaration": true,
                "declarationMap": true,
                "declarationDir": "dist/ts-types",
                "esModuleInterop": true,
                "forceConsistentCasingInFileNames": true,
                "strict": false,
                "experimentalDecorators": true,
                "emitDecoratorMetadata": true,
                "skipLibCheck": true,
                "plugins": [
                    {
                        "transform": "tst-reflect-transformer"
                    }
                ]
            }
        }, null, 2);
    }
    public buildIndex() {
        return `import { NextApplication, NextFileResolverPlugin, NextOptions } from "fastapi-next";
${this.routers.some(r => r.type === FastApiRouteType.WEBSOCKET) ? `import { NextSocketOptions } from "fastapi-next";` : ""}
const options = new NextOptions();
${this.routers.filter(r => r.type == FastApiRouteType.REST).map(r => {
            return `options.routerDirs.push(__dirname + "/${r.path.replace(/^\//, "")}");`;
        }).join("\n")}
${this.routers.filter(r => r.type == FastApiRouteType.WEBSOCKET).map(r => {
            return `options.socketRouterDirs.push(__dirname + "/${r.path.replace(/^\//, "")}");`;
        }).join("\n")}
${this.routers.some(r => r.type == FastApiRouteType.WEBSOCKET) ? `options.sockets = new NextSocketOptions();` : ``}
options.debug = process.env.NODE_ENV === "development";
options.port = parseInt(process.env.PORT);
const app = new NextApplication(options);

async function main() {
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
                }`
        }
        else {
            dockerFile = `FROM node:16 as build
WORKDIR /app
COPY package.json .
RUN npm install --production --legacy-peer-deps

FROM node:16-slim
${environments.map(e => `ENV ${e}`).join("\n")}
WORKDIR /app
COPY --from=build /app .
COPY . .
ENTRYPOINT ["node", "index"]`
        }
        fs.writeFileSync(path.join(distPath, "Dockerfile"), dockerFile);
    }
    public buildVSCodeLaunch() {
        return `{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "Debug",
            "type": "node",
            "request": "launch",
            "program": "\${workspaceFolder}/src/index.ts",
            "preLaunchTask": "npm: build",
            "cwd": "\${workspaceFolder}",
            "env": {
                "NODE_ENV": "development"
            },
            "sourceMaps": true,
            "outFiles": [
                "\${workspaceFolder}/dist/**/*.js"
            ]
        }
    ]
}`
    }
    public buildVSCodeTasks() {
        return `{
    "version": "2.0.0",
    "tasks": [
        {
            "label": "npm: prepare-debug",
            "type": "npm",
            "script": "prepare-debug",
            "problemMatcher": [],
            "group": {
                "kind": "build",
                "isDefault": true
            }
        }
    ]
}`
    }
}

