var jsir = (function () {

    var toString = Object.prototype.toString;

    function assert(condition, msg) {
        if (!condition) throw new Error(msg);
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

    var newApply = (function () {
        function Class() {};

        return function(ctor, args) {       
            // Reference prototype
            Class.prototype = ctor.prototype;

            // No constructor provided to prevent double
            // constructor firing on the real object
            var instance = new Class();

            ctor.apply(instance, args);

            return instance;
        }
    })();

    function Base() {}
    Base.prototype.dump = function () {
        return "";
    };

    Base.prototype.becomeParentOf = function (child) {
        if (child !== null) {
            child.parent = this;
        }

        return child;
    };

    function createHelper() {
        return newApply(this, arguments);
    }

    function definePrototype(func, proto, extendBase) {
        var funcProto = func.prototype = new (extendBase || Base);
        funcProto.constructor = func;
        func.create = createHelper;

        for (var key in proto) {
            if (proto.hasOwnProperty(key)) {
                funcProto[key] = proto[key];
            }
        }
    }

    /**
     * Module
     */
    function Module() {
        this.useStrict = true;
    }

    definePrototype(Module, {
        dump: function () {
            var out = "";

            if (this.useStrict) {
                out += "\"use strict\"\n\n";
            }

            for (var i = 0, l = this.length; i < l; i++) {
                out += this[i].dump();
            }

            return out;
        }
    }, Array);

    /**
     * EmptyStatement
     */
    function EmptyStatement(module) {
        if (module) module.push(this);
    }

    definePrototype(EmptyStatement, {
        isEmpty: function () {
            return true;
        },
        dump: function () {
            return ";";
        }
    });

    /**
     * BooleanLiteral
     */
    function BooleanLiteral(value, module) {
        assert(toString.call(value) === "[object Boolean]", "BooleanLiteral requires a boolean value.");

        this.value = value;

        if (module) module.push(this);
    }

    definePrototype(BooleanLiteral, {
        dump: function () {
            return this.value.toString();
        }
    });

    /**
     * BlockStatement
     */
    function BlockStatement(statements, module) {
        this.statements = statements || null;

        if (module) module.push(this);
    }

    definePrototype(BlockStatement, {
        dump: function () {
            var statements = this.statements;
            var out = "";

            out += "{";

            if (statements !== null) {
                out += "\n";
                for (var i = 0, l = statements.length; i < l; i++) {
                    out += indent(statements[i].dump(), 4) + "\n";
                }
            }

            out += "}"

            return out;
        }
    });

    /**
     * ConditionalStatement
     */
    function ConditionalStatement(conditionExpression, thenStatement, elseStatement, module) {
        assert(conditionExpression instanceof Base, "ConditionalStatement requires valid condition.");

        this.conditionExpression = conditionExpression;
        this.thenStatement = thenStatement || EmptyStatement.create();
        this.elseStatement = elseStatement;

        if (module) module.push(this);
    }

    definePrototype(ConditionalStatement, {
        dump: function () {
            var out = "";
            out += "if (";
            out += this.conditionExpression.dump();
            out += ") "
            out += this.thenStatement.dump();

            if (this.elseStatement) {
                out += "else ";
                out += this.elseStatement.dump();
            }

            return out;
        }
    });

    /**
     * SwitchMember
     */
    function SwitchMember(labels, statements) {
        this.labels = labels;
        this.statements = statements;
    }

    definePrototype(SwitchMember, {
        dump: function () {
            var labels = this.labels;
            var statements = this.statements;
            var out = "";

            for (var i = 0, l = labels.length; i < l; i++) {
                out += "case " + labels[i] + ":\n";
            }

            var dumpedStatements = [];
            for (var j = 0, k = statements.length; j < k; j++) {
                dumpedStatements.push(indent(statements[j].dump(), 4));
            }

            out += dumpedStatements.join("\n");

            return out;
        }
    });

    /**
     * SwitchStatement
     */
    function SwitchStatement(expression, members, module) {
        this.expression = expression;
        this.members = members;

        if (module) module.push(this);
    }

    definePrototype(SwitchStatement, {
        dump: function () {
            var members = this.members;
            var out = "";

            out += "switch (" + this.expression.dump() + ") {";

            if (members) {
                out += "\n";
                for (var i = 0, l = members.length; i < l; i++) {
                    out += indent(members[i].dump(), 4) + "\n";
                }
            }

            out += "}";

            return out;
        }
    });

    /**
     * Variable
     */
    function Variable(name, initializer) {
        this.name = name;
        this.initializer = initializer || null;
    }

    definePrototype(Variable, {
        dump: function () {
            var vars = this.vars;
            var out = "";

            out += this.name;

            if (this.initializer) {
                out += " = ";
                out += this.initializer.dump();
            }

            return out;
        }
    });

    /**
     * VariableStatement
     */
    function VariableStatement(vars, module) {
        this.vars = vars;

        if (module) module.push(this);
    }

    definePrototype(VariableStatement, {
        dump: function () {
            var vars = this.vars;
            var out = "";

            out += "var ";

            var expandedVars = [];

            for (var i = 0, l = vars.length; i < l; i++) {
                expandedVars.push(vars[i].dump());
            }

            out += expandedVars.join(",\n    ");

            out += ";"

            return out;
        }
    });

    /**
     * Function
     */
    function Function(name, params, bodyBlock, module) {
        this.name = name || "";
        this.params = params || [];
        this.bodyBlock = bodyBlock || BlockStatement.create();

        if (module) module.push(this);
    }

    definePrototype(Function, {
        dump: function () {
            var out = "";

            out += "function " + this.name + "(" + this.params.join(", ") + ") ";
            out += this.bodyBlock.dump();

            return out;
        }
    });

    return {
        Module: Module,
        EmptyStatement: EmptyStatement,
        BooleanLiteral: BooleanLiteral,
        BlockStatement: BlockStatement,
        Variable: Variable,
        VariableStatement: VariableStatement,
        SwitchMember: SwitchMember,
        ConditionalStatement: ConditionalStatement,
        SwitchStatement: SwitchStatement,
        Function: Function
    }; 

})();