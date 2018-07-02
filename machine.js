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
})( function () {
    //debug = debug("marchine-parser:machine");

    var Factory = function () {
        this.repo = {};
    };

    Factory.prototype.createState = function (statedescriptor) {
        var next = statedescriptor.next || [];
        var initial = !!statedescriptor.initial;
        var final = !!statedescriptor.final;
        var Machine = this.get(statedescriptor.type);

        var State = function (previous, _path) {
            this.previousState = previous || null;
            this.machine = new Machine(_path);
        };
        State.prototype.parse = function () {
            var parsed = this.machine.parse();
            if (statedescriptor.parse === "dismiss") {
                parsed = undefined;
            } else if (statedescriptor.parse) {
                parsed = statedescriptor.parse(parsed);
            }
            return parsed;
        };
        State.prototype.clone = function () {
            var clone = Object.create(State.prototype);
            clone.previousState = this.previousState && this.previousState.clone();
            clone.machine = this.machine.clone();
            return clone;
        };

        State.prototype.Machine = State.Machine = Machine;
        State.prototype.next = State.next = next;
        State.prototype.initial = State.initial = initial;
        State.prototype.final = State.final = final;

        return State;
    };
    Factory.prototype.createChar = function (descriptor) {
        var type = descriptor.type,
                char = descriptor.char,
                test;

        if (typeof char === "string") {
            test = function (_char) {
                return !this.complete && _char === char;
            };
        } else {
            test = function (_char) {
                return !this.complete && char.test(_char);
            };
        }

        var Char = function (_path) {
            this.consumed = "";
            this.complete = false;
            this.path = _path || [];
            this.path.push(this.type);
        };
        Char.prototype.type = Char.type = type;
        Char.prototype.test = Char.test = test;
        Char.prototype.push = function (char) {
            this.consumed = char;
            this.complete = true;
        };
        Char.prototype.parse = function () {
            return this.consumed;
        };

        Char.prototype.clone = function () {
            var clone = Object.create(Char.prototype);
            clone.consumed = this.consumed;
            clone.complete = this.complete;
            clone.path = this.path;
            return clone;
        };

        Char.make = function (_path) {
            return new Char(_path);
        };

        return Char;
    };
    Factory.prototype.createString = function (descriptor) {
        var factory = this;
        var type = descriptor.type;
        var FST = descriptor.fst.map(function (statedescriptor) {
            return factory.createState(statedescriptor);
        });

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


        var String = function (_path) {
            this.states = [];
            this.path = _path || [];
            this.path.push(this.type);
        };
        String.prototype.type = type;
        String.prototype.parse = function () {
            var parsed, flag = false;
            for (let state of this.states) {
                if (state.final && state.machine.complete) {
                    parsed = parsestatechain(state);
                    flag = true;
                    break;
                }
            }
            if (!flag) {
                throw new Error("cannot parse a non-complete machine");
            }
            if (descriptor.parse === "join") {
                return parsed.join("");
            } else if (descriptor.parse === "dismiss") {
                return undefined;
            } else if (descriptor.parse) {
                return descriptor.parse(parsed);
            } else {
                return parsed;
            }
        };
        String.prototype.clone = function () {
            let clone = Object.create(String.prototype);
            clone.states = this.states.map(function (state) {
                return state.clone();
            });
            clone.path = this.path;
            clone.flag = this.flag;
            return clone;
        };

        String.prototype.test = function (char) {
            if (!this.flag) {
                for (let State of FST) {
                    if (State.initial && State.Machine.test(char)) {
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
                            let State = FST[next];
                            if (State.Machine.test(char)) {
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
                for (let State of FST) {
                    if (State.initial && State.Machine.test(char)) {
                        let state = new State(null, this.path.slice(0));
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
                            let State = FST[next];
                            if (State.Machine.test(char)
                                    /*&& (!test || nextstatefactory.factory.type !== state.machine.type)*/) { // /!\
                                let stateclone = state.clone();
                                let nextstate = new State(stateclone, this.path.slice(0));
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

        String.test = function (char) {
            for (let State of FST) {
                if (State.initial && State.Machine.test(char)) {
                    return true;
                }
            }
            return false;
        };

        return String;
    };


    Factory.prototype.register = function (descriptor) {
        //debug("registering machine " + descriptor.type);
        if (this.repo[descriptor.type]) {
            throw new Error("machine " + descriptor.type + " already defined");
        }
        this.repo[descriptor.type] = descriptor.char ? this.createChar(descriptor) : this.createString(descriptor);
    };
    Factory.prototype.registerChar = function (string) {
        for (let i = 0; i < string.length; i++) {
            let char = string.charAt(i);
            if (!this.repo[char]) {
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
        //debug("aliasing machine " + type + " to " + alias);
        if (!this.repo.hasOwnProperty(type)) {
            throw new Error("machine " + type + " undefined");
        }
        if (this.repo.hasOwnProperty(alias)) {
            throw new Error("machine " + alias + " already defined");
        }
        this.repo[alias] = this.repo[type];
    };

    Factory.prototype.get = function (type) {
        if (!this.repo[type]) {
            throw new Error("machine " + type + " undefined");
        }
        return this.repo[type];
    };

    return  Factory;
});
