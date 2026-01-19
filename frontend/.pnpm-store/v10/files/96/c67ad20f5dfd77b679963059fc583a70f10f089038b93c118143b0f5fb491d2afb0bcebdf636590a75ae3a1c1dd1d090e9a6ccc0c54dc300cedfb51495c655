"use strict";
/**
 * @fileoverview Enforces attribute naming conventions
 * @author James Garbutt <https://github.com/43081j>
 */
const util_1 = require("../util");
//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------
const rule = {
    meta: {
        docs: {
            description: 'Enforces attribute naming conventions',
            recommended: true,
            url: 'https://github.com/43081j/eslint-plugin-lit/blob/master/docs/rules/attribute-names.md'
        },
        schema: [
            {
                type: 'object',
                properties: {
                    convention: { type: 'string', enum: ['none', 'kebab', 'snake'] }
                },
                additionalProperties: false
            }
        ],
        messages: {
            casedAttribute: 'Attributes are case-insensitive and therefore should be ' +
                'defined in lower case',
            casedPropertyWithoutAttribute: 'Property has non-lowercase casing but no attribute. It should ' +
                'instead have an explicit `attribute` set to the lower case ' +
                'name (usually snake-case)',
            casedAttributeConvention: 'Attribute should be property name written in {{convention}} ' +
                'as "{{name}}"'
        }
    },
    create(context) {
        var _a, _b;
        const convention = (_b = (_a = context.options[0]) === null || _a === void 0 ? void 0 : _a.convention) !== null && _b !== void 0 ? _b : 'none';
        return {
            ClassDeclaration: (node) => {
                var _a, _b;
                if ((0, util_1.isLitClass)(node)) {
                    const propertyMap = (0, util_1.getPropertyMap)(node);
                    for (const [prop, propConfig] of propertyMap.entries()) {
                        if (!propConfig.attribute || propConfig.state) {
                            continue;
                        }
                        if (!propConfig.attributeName) {
                            if (prop.toLowerCase() !== prop) {
                                context.report({
                                    node: propConfig.key,
                                    messageId: 'casedPropertyWithoutAttribute'
                                });
                            }
                        }
                        else {
                            if (propConfig.attributeName.toLowerCase() !==
                                propConfig.attributeName) {
                                context.report({
                                    node: (_a = propConfig.expr) !== null && _a !== void 0 ? _a : propConfig.key,
                                    messageId: 'casedAttribute'
                                });
                            }
                            else if (convention !== 'none') {
                                let conventionName;
                                let expectedAttributeName;
                                switch (convention) {
                                    case 'snake':
                                        conventionName = 'snake_case';
                                        expectedAttributeName = (0, util_1.toSnakeCase)(prop);
                                        break;
                                    case 'kebab':
                                        conventionName = 'kebab-case';
                                        expectedAttributeName = (0, util_1.toKebabCase)(prop);
                                        break;
                                }
                                if (expectedAttributeName &&
                                    conventionName &&
                                    propConfig.attributeName !== expectedAttributeName) {
                                    context.report({
                                        node: (_b = propConfig.expr) !== null && _b !== void 0 ? _b : propConfig.key,
                                        messageId: 'casedAttributeConvention',
                                        data: {
                                            convention: conventionName,
                                            name: expectedAttributeName
                                        }
                                    });
                                }
                            }
                        }
                    }
                }
            }
        };
    }
};
module.exports = rule;
