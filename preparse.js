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
})(function () {
    //debug = debug("marchine-parser:preparse");
    var path, fs;



    let parseindent = function (string) {
        let indent = 0;
        for (let i = 0; i < string.length; i++) {
            if (string.charAt(i) === " ") {
                indent++;
            } else if (string.charAt(i) === "\t") {
                indent += 2;
            } else {
                return indent;
            }
        }
        return indent;
    };

    let parseinclude = function (string) {
        let regex = /^\s*include\s+([^\s]+)\s*$/;
        let match = string.match(regex);
        return match && match[1];
    };

    let parsecommentstart = function (string) {
        return /^\s*#-{2,}\s*$/.test(string);
    };
    let parsecommentend = function (string) {
        return /^\s*-{2,}#\s*$/.test(string);
    };

    /**
     * Splits a configuration file into lines, discards comments and empty lines, 
     * keeps track of the original file line numbers, extracts indents, replaces 
     * includes instructions.
     * 
     * @argument {string} filename
     * @argument {object} [options]
     * @argument {object<path,file: string|Buffer>} [options.files] Don't read files from the filesystem, instead use those.
     * @argument {boolean=true} [options.include] Allow includes
     * 
     * @returns {PreparsedFile} preparsed
     */
    let preparse = function (filename, options) {
        //debug("parsing file " + filename + " (%o)", options);
        options = options || {};
        options.include = options.include === false ? false : true;
        if (!options.files) {
            path = path || require("path");
            fs = fs || require("fs");
        }

        let raw = options.files ? options.files[filename] : fs.readFileSync(filename);
        if (!raw) {
            throw new Error("ENOENT - " + filename + " doesn't exist");
        }

        let parsed = [];

        // splits by lines
        let lines = raw.toString().split("\n");

        // discards comments and empty lines, keeps track of number of line discarded, and extracts includes
        let include, comment;
        for (let i = 0; i < lines.length; i++) {
            if (comment) {
                if (parsecommentend(lines[i])) {
                    comment = false;
                }
                continue;
            }
            if (parsecommentstart(lines[i])) {
                comment = true;
                continue;
            }
            let indent = parseindent(lines[i]);
            let line = lines[i].split("#")[0].trim();
            if (line === "") {

            } else if ((include = parseinclude(line))) {
                if (options.include) {
                    if (options.files) {
                        include = preparse(include.startsWith("./") ? include.substr(2) : include, options);
                    } else {
                        let includedfilename = path.join(path.dirname(filename), include);
                        include = preparse(includedfilename, options);
                    }
                    parsed = parsed.concat(include);
                }
            } else {
                parsed.push({
                    line: line,
                    original_line: lines[i],
                    original_line_number: i + 1,
                    original_indent: indent,
                    original_file: filename
                });
            }
        }

        return parsed;
    };


    return preparse;
});
