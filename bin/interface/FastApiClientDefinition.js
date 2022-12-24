"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FastApiClientDefinition = void 0;
class FastApiClientDefinition {
    constructor() { }
    save() {
        return JSON.stringify(this, null, 2);
    }
    static load(content) {
        var r = new FastApiClientDefinition();
        const obj = JSON.parse(content);
        for (var k in obj) {
            r[k] = obj[k];
        }
        return r;
    }
}
exports.FastApiClientDefinition = FastApiClientDefinition;
//# sourceMappingURL=FastApiClientDefinition.js.map