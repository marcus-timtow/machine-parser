(function (deps, definition) {
    if (!definition) {
        definition = deps;
        deps = [];
    }
    if (!Array.isArray(deps)) {
        deps = [deps];
    }
    if (typeof define === "function" && typeof define.amd === "object") {
        define(deps, definition);
    } else if (typeof module !== "undefined") {
        module.exports = definition.apply(this, deps.map(function (dep) {
            return require(dep);
        }));
    } else {
        throw new Error("missing module loader");
    }
})(["./syntax-error", "./preparse", "./machine", "./defaults"], function (SyntaxError, preparse, Factory, defaultMachines) {

    return function () {
        var factory = new Factory();

        var parse = function (type, line) {
            if (typeof line === "string") {
                line = {
                    line: line
                };
            }

            let machine = new (factory.get(type))();
            for (let i = 0; i < line.line.length; i++) {
                let char = line.line.charAt(i);
                if (machine.test(char)) {
                    machine.push(char);
                } else {
                    throw new SyntaxError("machine " + type + ": unexpected character",
                            {file: line.original_file, linenumber: line.original_line_number, line: line.original_line || line.line, section: char, charnumber: i + 1});
                }
            }
            if (!machine.complete) {
                throw new SyntaxError("machine " + type + ": unexpected EOL",
                        {file: line.original_file, linenumber: line.original_line_number, line: line.original_line || line.line});
            }
            return machine.parse();
        };
        parse.preparse = preparse;
        parse.SyntaxError = SyntaxError;
        for (let prop in factory) {
            if (typeof factory[prop] === "function") {
                parse[prop] = factory[prop].bind(factory);
            }
        }
        defaultMachines.registerAt(parse);

        return parse;
    };
});
