
var exports = {};
module.exports = exports;

exports.chars = "-:=.,;{}[]()<>/?&~#\"\\/'|_^@$%*!?+";
exports.strings = [];
exports.machines = {};

exports.machines["char:az"] = {type: "char:az", char: /[a-z]/};
exports.machines["char:09"] = {type: "char:09", char: /\d/};
exports.machines["char:blank"] = {type: "char:blank", char: /[ \t]/};
exports.machines["char:non-blank"] = {type: "char:non-blank", char: /[^\s]/};

exports.machines["blank"] = {
    type: "blank",
    fst: [
        {type: "char:blank", initial: true, final: true, next: [0]}
    ],
    parse: "dismiss"
};
exports.machines["non-blank"] = {
    type: "non-blank",
    fst: [
        {type: "char:non-blank", initial: true, final: true, next: [0]}
    ], parse: "join"
};
exports.machines["integer"] = {
    type: "integer",
    fst: [
        {type: "char:09", initial: true, final: true, next: [0]}
    ],
    parse: function (parsed) {
        return Number.parseInt(parsed.join(), 10);
    }
};
exports.machines["float"] = {
    type: "float",
    fst: [
        {type: "char:09", initial: true, final: true, next: [1]},
        {type: ".", next: [2]},
        {type: "char:09", final: true, next: [2]}
    ],
    parse: function (parsed) {
        return Number.parseFloat(parsed.join());
    }
};

exports.machines["var"] = {
    type: "var",
    fst: [
        {type: "char:az", initial: true, final: true, next: [0, 1]},
        {type: "-", next: [0]}
    ],
    parse: "join"
};
exports.machines["var:namespaced"] = {
    type: "var:namespaced",
    fst: [
        {type: "var", initial: true, final: true, next: [1]},
        {type: ":", next: [0]}
    ],
    parse: "join"
};
exports.machines["var:num"] = {
    type: "var:num",
    fst: [
        {type: "char:az", initial: true, final: true, next: [0, 1, 2]},
        {type: "char:09", initial: true, final: true, next: [0, 1, 2]},
        {type: "-", next: [0, 1]}
    ],
    parse: "join"
};


exports.machines["size:unit"] = {type: "size:unit", char: /[kKmMgG]/};
exports.machines["size"] = {
    type: "size",
    fst: [
        {type: "integer", initial: true, final: true, next: [1]},
        {type: "size:unit", final: true}
    ],
    parse: function (parsed) {
        let size = parsed.shift();
        switch (parsed.shift()) {
            case "k":
            case "K":
                return size * 1000;
            case "m":
            case "M":
                return size * 1000000;
            case "g":
            case "G":
                return size * 1000000000;
            default:
                return size;
        }
    }
};

exports.registerAt = function(factory){
    factory.registerChar(exports.chars);
    for (let string of exports.strings){
        factory.registerString(string);
    }
    for (let machine in exports.machines){
        factory.register(machine);
    }
};
