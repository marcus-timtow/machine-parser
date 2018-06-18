
var SyntaxError = require("./syntax-error");
var preparse = require("./preparse");
var Factory = require("./machine");

var Parser = function () {
    var factory = new Factory();

    var parse = function (type, line) {
        if (typeof line === "string") {
            line = {
                line: line
            };
        }

        let machine = factory.make(type);
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
    parse.register = factory.register.bind(factory);
    parse.registerChar = factory.registerChar.bind(factory);
    parse.registerString = factory.registerString.bind(factory);
    parse.alias = factory.alias.bind(factory);

    return parse;
};

module.exports = Parser;

