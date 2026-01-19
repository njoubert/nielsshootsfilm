"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.configs = exports.rules = void 0;
const all_1 = require("./configs/all");
const legacy_all_1 = require("./configs/legacy-all");
const legacy_recommended_1 = require("./configs/legacy-recommended");
const recommended_1 = require("./configs/recommended");
const requireIndex = require("requireindex");
exports.rules = requireIndex(`${__dirname}/rules`);
const plugin = { rules: exports.rules };
exports.configs = {
    all: legacy_all_1.config,
    'flat/all': (0, all_1.configFactory)(plugin),
    recommended: legacy_recommended_1.config,
    'flat/recommended': (0, recommended_1.configFactory)(plugin)
};
