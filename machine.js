
var debug = require("debug")("machine-parser:machine");


// char

var Char = function (context, _path) {
    this.consumed = "";
    this.complete = false;
    this.path = _path || [];
    this.path.push(this.type);
    this.context = context;
};
Char.prototype.push = function (char) {
    this.consumed = char;
    this.complete = true;
};
Char.prototype.parse = function () {
    return this.consumed;
};

var CharFactory = function (charconf) {
    this.type = charconf.type;
    if (typeof charconf.char === "string") {
        this.test = function (char) {
            return !this.complete && charconf.char === char;
        };
    } else {
        this.test = function (char) {
            return !this.complete && charconf.char.test(char);
        };
    }

    var _Char = this.Char = function (context, _path) {
        Char.call(this, context, _path);
    };
    this.Char.prototype = Object.create(Char.prototype);
    this.Char.prototype.type = this.type;
    this.Char.prototype.test = this.test;

    this.Char.prototype.clone = function () {
        var clone = Object.create(_Char.prototype);
        clone.path = this.path;
        clone.consumed = this.consumed;
        clone.complete = this.complete;
        clone.context = this.context;
        return clone;
    };
};
CharFactory.prototype.make = function (context, _path) {
    return new this.Char(context, _path);
};


// state

var StateFactory = function (stateconf) {
    this.next = stateconf.next || [];
    this.initial = stateconf.initial;
    this.final = stateconf.final;

    /*
     * A state is an instance of Machine at a given position in a Machine String.
     */
    var _State = this.State = function (previous, context, _path) {
        this.previousState = previous || null;
        this.machine = context.make(_path);
    };
    this.State.prototype.next = this.next;
    this.State.prototype.initial = this.initial;
    this.State.prototype.final = this.final;
    this.State.prototype.parse = function () {
        var parsed = this.machine.parse();
        if (stateconf.parse === "dismiss") {
            parsed = undefined;
        } else if (stateconf.parse) {
            parsed = stateconf.parse(parsed);
        }
        return parsed;
    };

    this.State.prototype.clone = function () {
        var clone = Object.create(_State.prototype);
        clone.previousState = this.previousState && this.previousState.clone();
        clone.machine = this.machine.clone();
        return clone;
    };
};
StateFactory.prototype.make = function (previous, context, _path) {
    return new this.State(previous, context, _path);
};


// string

var String = function (context, _path) {
    this.states = [];
    this.path = _path || [];
    this.path.push(this.type);
    this.context = context;
};
String.prototype.test = function (char) {
    if (!this.flag) {
        for (let statefactory of this.fstfactory) {
            if (statefactory.initial && statefactory.factory.test(char)) {
                return true;
            }
        }
        return false;
    } else {
        // non-greedy
        /*for (let state of this.states){
         if (state.final && state.machine.complete) {
         return false;
         }
         }*/
        for (let state of this.states) {
            if (state.machine.test(char)) {
                return true;
            } else if (state.machine.complete) {
                for (let next of state.next) {
                    let nextstatefactory = this.fstfactory[next];
                    if (nextstatefactory.factory.test(char)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
};
String.prototype.push = function (char) {
    if (!this.flag) {
        this.flag = true;
        for (let statefactory of this.fstfactory) {
            if (statefactory.initial && statefactory.factory.test(char)) {
                let state = statefactory.make(null, this.context, this.path.slice(0));
                state.machine.push(char);
                this.states.push(state);
            }
        }
    } else {
        let len = this.states.length;
        for (let i = 0; i < len; i++) {
            let state = this.states[i];
            let test = state.machine.test(char);
            if (state.machine.complete) {
                for (let next of state.next) {
                    let nextstatefactory = this.fstfactory[next];
                    if (nextstatefactory.factory.test(char)
                            /*&& (!test || nextstatefactory.factory.type !== state.machine.type)*/) { // /!\
                        let stateclone = state.clone();
                        let nextstate = nextstatefactory.make(stateclone, this.context, this.path.slice(0));
                        nextstate.machine.push(char);
                        this.states.push(nextstate);
                    }
                }
            }
            if (test) {
                state.machine.push(char);
            } else {
                this.states.splice(i, 1);
                i--;
                len--;
            }
        }
    }
};
String.prototype.parse = function () {
    let parsestatechain = function (state, parsed) {
        parsed = parsed || [];
        if (state) {
            let partparsed = state.parse();
            if (partparsed) {
                parsed.unshift(partparsed);
            }
            return parsestatechain(state.previousState, parsed);
        } else {
            return parsed;
        }
    };
    for (let state of this.states) {
        if (state.final && state.machine.complete) {
            return parsestatechain(state);
        }
    }
    throw new Error("cannot parse a non-complete machine");
};
Object.defineProperty(String.prototype, "complete", {
    get: function () {
        for (let state of this.states) {
            if (state.final && state.machine.complete) {
                return true;
            }
        }
        return false;
    }
});


var StringFactory = function (stringconf) {
    this.type = stringconf.type;
    this.fstfactory = stringconf.fst.map(function (stateconf) {
        return new StateFactory(stateconf);
    });

    let _String = this.String = function (context, _path) {
        String.call(this, context, _path);
    };
    this.String.prototype = Object.create(String.prototype);
    this.String.prototype.type = this.type;
    this.String.prototype.fstfactory = this.fstfactory;
    this.String.prototype.parse = function () {
        let parsed = String.prototype.parse.call(this);
        if (stringconf.parse === "join") {
            return parsed.join("");
        } else if (stringconf.parse === "dismiss") {
            return undefined;
        } else if (stringconf.parse) {
            return stringconf.parse(parsed);
        } else {
            return parsed;
        }
    };

    this.String.prototype.clone = function () {
        let clone = Object.create(_String.prototype);
        clone.states = this.states.map(function (state) {
            return state.clone();
        });
        clone.path = this.path;
        clone.context = this.context;
        return clone;
    };
};
StringFactory.prototype.make = function (context, _path) {
    return new this.String(context, _path);
};
StringFactory.prototype.test = function (char) {
    for (let statefactory of this.fstfactory) {
        if (statefactory.initial && statefactory.factory.test(char)) {
            return true;
        }
    }
    return false;
};


// factory

var Factory = function () {
    this.repo = {};
};
Factory.prototype.get = function (type) {
    if (!this.repo.hasOwnProperty(type)) {
        throw new Error("machine " + type + " undefined");
    }
    return this.repo[type];
};
Factory.prototype.make = function (type) {
    var factory = this.get(type);
    return factory.make(this);
};
Factory.prototype.register = function (conf) {
    debug("registering machine " + conf.type);
    if (this.repo.hasOwnProperty(conf.type)) {
        throw new Error("machine " + conf.type + " already defined");
    }
    this.repo[conf.type] = conf.char ? new CharFactory(conf) : new StringFactory(conf);
};
Factory.prototype.registerChar = function (string) {
    for (let i = 0; i < string.length; i++) {
        let char = string.charAt(i);
        if (!this.repo.hasOwnProperty(char)) {
            this.register({type: char, char: char});
        }
    }
};
Factory.prototype.registerString = function (string, _prefix) {
    this.registerChar(string);
    let fst = [];
    for (let i = 0; i < string.length; i++) {
        let char = string.charAt(i);
        fst.push({type: char, next: [i + 1], parser: "dismiss"});
    }
    fst[0].initial = true;
    delete fst[fst.length - 1].next;
    fst[fst.length - 1].final = true;
    this.register({
        type: (_prefix ? (_prefix + ":") : "") + string,
        fst: fst,
        parse: () => string
    });
};
Factory.prototype.alias = function (type, alias) {
    debug("aliasing machine " + type + " to " + alias);
    if (!this.repo.hasOwnProperty(type)) {
        throw new Error("machine " + type + " undefined");
    }
    if (this.repo.hasOwnProperty(alias)) {
        throw new Error("machine " + alias + " already defined");
    }
    this.repo[alias] = this.repo[type];
};

module.exports = Factory;