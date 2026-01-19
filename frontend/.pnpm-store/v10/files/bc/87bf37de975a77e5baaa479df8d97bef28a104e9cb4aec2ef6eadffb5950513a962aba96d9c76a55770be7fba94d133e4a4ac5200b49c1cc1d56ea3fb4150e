import { Plugin } from 'vite';

type Engine = {
    css: string;
    package: string;
    dtsType?: string;
};
declare const engines: {
    readonly lit: {
        readonly css: "css";
        readonly package: "lit";
    };
    readonly fast: {
        readonly css: "css";
        readonly package: "@microsoft/fast-element";
    };
    readonly "lit-element": {
        readonly css: "css";
        readonly package: "lit-element";
    };
};
type Engines = keyof typeof engines;

interface Options {
    include?: string | RegExp | Array<string | RegExp>;
    exclude?: string | RegExp | Array<string | RegExp>;
    engine?: Engines | Engine;
    dts?: boolean;
}
declare function lit(options?: Options): Plugin;

export { type Options, lit as default };
