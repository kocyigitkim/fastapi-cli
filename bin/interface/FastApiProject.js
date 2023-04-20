"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FastApiProject = void 0;
const FastApiRouteType_1 = require("./FastApiRouteType");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class FastApiProject {
    static open(data) {
        var js = data instanceof Buffer ? data.toString() : data;
        var project = JSON.parse(js);
        var res = new FastApiProject();
        for (var k in project) {
            res[k] = project[k];
        }
        return res;
    }
    save() {
        return JSON.stringify(this, null, 2);
    }
    buildTSConfig() {
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
    buildIndex() {
        return `import { NextApplication, NextFileResolverPlugin, NextOptions } from "fastapi-next";
${this.routers.some(r => r.type === FastApiRouteType_1.FastApiRouteType.WEBSOCKET) ? `import { NextSocketOptions } from "fastapi-next";` : ""}
const options = new NextOptions();
${this.routers.filter(r => r.type == FastApiRouteType_1.FastApiRouteType.REST).map(r => {
            return `options.routerDirs.push(__dirname + "/${r.path.replace(/^\//, "")}");`;
        }).join("\n")}
${this.routers.filter(r => r.type == FastApiRouteType_1.FastApiRouteType.WEBSOCKET).map(r => {
            return `options.socketRouterDirs.push(__dirname + "/${r.path.replace(/^\//, "")}");`;
        }).join("\n")}
${this.routers.some(r => r.type == FastApiRouteType_1.FastApiRouteType.WEBSOCKET) ? `options.sockets = new NextSocketOptions();` : ``}
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
    buildHelloWorld() {
        return `import { NextContext } from "fastapi-next";
export default async function (ctx: NextContext<any>){
    return "Hello World :)";
}`;
    }
    makeDockerFile(distPath, distIndex, npmrcPath) {
        var _a;
        var isBundle = Boolean((_a = this.build) === null || _a === void 0 ? void 0 : _a.bundle);
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
`;
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
ENTRYPOINT ["node", "index"]`;
        }
        fs_1.default.writeFileSync(path_1.default.join(distPath, "Dockerfile"), dockerFile);
    }
    buildVSCodeLaunch() {
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
        }, null, 2);
    }
}
exports.FastApiProject = FastApiProject;
//# sourceMappingURL=FastApiProject.js.map