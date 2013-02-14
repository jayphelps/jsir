
(function (root) {

    /**
     * @namespace
     */
    var jsir = {};

    if (typeof exports !== "undefined") {
        if (typeof module !== "undefined" && module.exports) {
            exports = module.exports = jsir;
        }
        exports.jsir = jsir;
    } else {
        root.jsir = jsir;
    }

    var toString = Object.prototype.toString;

    function isBoolean(value) {
        return toString.call(value) === "[object Boolean]";
    }

    function assert(condition, msg) {
        if (!isBoolean(condition)) throw new Error("asset() requires Boolean type condition");
        if (condition === false) throw new Error(msg);
    }

    function getSpaces(count) {
        var out = "";

        for (var i = 0; i < count; i++) {
            out += " ";
        }

        return out;
    }

    function indent(str, count) {
        var indention = getSpaces(count);
        return indention + str.split("\n").join("\n" + indention);
    }

    /**
     * Internal helper for easier prototype inheritance and declaration.
     */ 
    var Class = jsir.Class = (function () {
        var classIsInitializing = false;

        function Class() {}

        Class.create = function (instanceMembers) {
            var superClass = this;

            // Instantiate a copy of the inherited class but don't call the
            // constructor!
            classIsInitializing = true;
            var prototype = new superClass() || {};
            classIsInitializing = false;

            // Pass a reference to the super class implementations
            prototype.__super = superClass.prototype;
            // Be sure they have atleast a default constructor!
            prototype.__construct = instanceMembers.__construct || function () {};

            for (var key in instanceMembers) {
                if (instanceMembers.hasOwnProperty(key)) {
                    prototype[key] = instanceMembers[key];
                }
            }

            // Constructor wrapper
            function Class() {
                // Allows us to create an instance of superClass above without
                // actually calling the class's real `constructor`
                if (classIsInitializing) return;

                if (this.__construct) {
                    this.__construct.apply(this, arguments);
                }
            }

            // Assign our members to this copy of Class
            Class.prototype = prototype;
            Class.prototype.constructor = Class;

            Class.extend = extendClass;

            return Class;
        };

        function extendClass(instanceMembers) {
            return Class.create.call(this, instanceMembers);
        }

        return Class;

    })();

    /**
     * Base class that all elements inherit a common interface from.
     */
    var Element = Class.create({

        toString: function () {
            return "";
        },

        becomeParentOf: function (child) {
            if (child !== null) {
                child.setParent(this);
            }
        },

        setParent: function (parent) {
            this.parent = parent;
        },

        getParent: function () {
            return this.parent;
        }

    });

    /**
     * Typically used as a 1-to-1 IR container for an output file.
     */
    var Module = Element.extend({

        useStrict: true,
        elements: null,

        /**
         * @constructs
         */
        __construct: function () {
            this.elements = [];
        },

        push: function () {
            return this.elements.push.apply(this.elements, arguments);
        },

        pop: function () {
            return this.elements.pop();
        },

        toString: function () {
            var out = "";

            if (this.useStrict) {
                out += "\"use strict\"\n\n";
            }

            var elements = this.elements;

            for (var i = 0, l = elements.length; i < l; i++) {
                out += elements[i].toString();
            }

            return out;
        }

    });

    /**
     * Statement base class
     */
    var Statement = Element.extend({});

    /**
     * EmptyStatement
     */
    var EmptyStatement = Statement.extend({

        __construct: function (module) {
            if (module) module.push(this);
        },

        toString: function () {
            return ";";
        }

    });

    /**
     * BooleanLiteral
     */
    var BooleanLiteral = Statement.extend({

        __construct: function (value, module) {
            assert(isBoolean(value), "BooleanLiteral requires a boolean value as the first argument.");

            this.value = value;

            if (module) module.push(this);
        },

        toString: function () {
            return this.value.toString();
        }

    });

    /**
     * BlockStatement
     */
    var BlockStatement = Statement.extend({

        __construct: function (statements, module) {
            this.statements = statements || null;

            if (module) module.push(this);
        },

        toString: function () {
            var statements = this.statements;
            var out = "";

            out += "{";

            if (statements !== null) {
                out += "\n";
                for (var i = 0, l = statements.length; i < l; i++) {
                    out += indent(statements[i].toString(), 4) + "\n";
                }
            }

            out += "}"

            return out;
        }

    });

    /**
     * ConditionalStatement
     */
    var ConditionalStatement = Statement.extend({

        __construct: function (conditionExpression, thenStatement, elseStatement, module) {
            assert(conditionExpression instanceof Base, "ConditionalStatement requires valid condition.");

            this.conditionExpression = conditionExpression;
            this.thenStatement = thenStatement || EmptyStatement.create();
            this.elseStatement = elseStatement;

            if (module) module.push(this);
        },

        toString: function () {
            var out = "";
            out += "if (";
            out += this.conditionExpression.toString();
            out += ") "
            out += this.thenStatement.toString();

            if (this.elseStatement) {
                out += "else ";
                out += this.elseStatement.toString();
            }

            return out;
        }

    });

    /**
     * SwitchMember
     */
    var SwitchMember = Element.extend({

        __construct: function (labels, statements) {
            this.labels = labels;
            this.statements = statements;
        },

        toString: function () {
            var labels = this.labels;
            var statements = this.statements;
            var out = "";

            for (var i = 0, l = labels.length; i < l; i++) {
                out += "case " + labels[i] + ":\n";
            }

            var toStringedStatements = [];
            for (var j = 0, k = statements.length; j < k; j++) {
                toStringedStatements.push(indent(statements[j].toString(), 4));
            }

            out += toStringedStatements.join("\n");

            return out;
        }

    });

    /**
     * SwitchStatement
     */
    var SwitchStatement = Statement.extend({

        __construct: function (expression, members, module) {
            this.expression = expression;
            this.members = members;

            if (module) module.push(this);
        },

        toString: function () {
            var members = this.members;
            var out = "";

            out += "switch (" + this.expression.toString() + ") {";

            if (members) {
                out += "\n";
                for (var i = 0, l = members.length; i < l; i++) {
                    out += indent(members[i].toString(), 4) + "\n";
                }
            }

            out += "}";

            return out;
        }

    });

    /**
     * Variable
     */
    var Variable = Element.extend({

        __construct: function (name, initializer) {
            this.name = name;
            this.initializer = initializer || null;
        },

        toString: function () {
            var vars = this.vars;
            var out = "";

            out += this.name;

            if (this.initializer) {
                out += " = ";
                out += this.initializer.toString();
            }

            return out;
        }

    });

    /**
     * VariableStatement
     */
    var VariableStatement = Statement.extend({

        __construct: function (vars, module) {
            this.vars = vars;

            if (module) module.push(this);
        },

        toString: function () {
            var vars = this.vars;
            var out = "";

            out += "var ";

            var expandedVars = [];

            for (var i = 0, l = vars.length; i < l; i++) {
                expandedVars.push(vars[i].toString());
            }

            out += expandedVars.join(",\n    ");

            out += ";"

            return out;
        }

    });

    /**
     * Function
     */
    var Function = Element.extend({

        __construct: function (name, params, bodyBlock, module) {
            this.name = name || "";
            this.params = params || [];
            this.bodyBlock = bodyBlock || BlockStatement.create();

            if (module) module.push(this);
        },

        toString: function () {
            var out = "";

            out += "function " + this.name + "(" + this.params.join(", ") + ") ";
            out += this.bodyBlock.toString();

            return out;
        }
        
    });

})(this);