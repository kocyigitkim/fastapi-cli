/// <reference types="node" />
import { FastApiBuild } from "./FastApiBuild";
import { FastApiDependency } from "./FastApiDependency";
import { FastApiRoute } from "./FastApiRoute";
import { FastApiResource } from "./FastApiResource";
export declare class FastApiProject {
    name: string;
    port: number;
    deps?: FastApiDependency[];
    routers: FastApiRoute[];
    build?: FastApiBuild;
    resources?: FastApiResource[];
    static open(data: Buffer | string): FastApiProject;
    save(): string;
    buildTSConfig(): string;
    buildIndex(): string;
    buildHelloWorld(): string;
    makeDockerFile(distPath: string, distIndex: string, npmrcPath: string): void;
    buildVSCodeLaunch(): string;
    buildVSCodeTasks(): string;
}
//# sourceMappingURL=FastApiProject.d.ts.map