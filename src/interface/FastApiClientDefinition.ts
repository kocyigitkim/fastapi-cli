export class FastApiClientDefinition {
    constructor() { }

    public url: string;
    public typescript: boolean;
    public outputPath: string;

    public save() {
        return JSON.stringify(this, null, 2);
    }
    public static load(content: string) {
        var r = new FastApiClientDefinition();
        const obj = JSON.parse(content);
        for (var k in obj) {
            r[k] = obj[k];
        }
        return r;
    }
}