
/**
 * A syntax error which may be encountered while parsing a configuration file.
 * 
 * @constructor
 * @extends Error
 * 
 * @argument {string} msg
 * @argument {object} details
 * @argument {string} [details.file] file name
 * @argument {number} [details.linenumber] line number
 * @argument {string} [details.line] line
 * @argument {number} [details.charnumber] charnumber
 * @argument {string} [details.section] part of the line containing a syntax error
 */
let SyntaxError = function (msg, details) {
    //Error.call(this, msg);
    this.message = msg;
    details = details || {};
    this.linenumber = details.linenumber;
    this.line = details.line;
    this.charnumber = details.charnumber;
    if (typeof this.charnumber=== "number" && typeof this.line === "string" && this.line.length >= this.charnumber){
        this.char = this.line.charAt(this.charnumber -1);
    }
    this.section = details.section;
    this.file = details.file;
};
//SyntaxError.prototype = Object.create(Error.prototype);
SyntaxError.prototype.toJSON = function () {
    let ret = {
        message: this.message
    };
    for (let prop of ["linenumber", "line", "section", "file", "charnumber", "char"]) {
        if (this.hasOwnProperty(prop) && this[prop] !== undefined) {
            ret[prop] = this[prop];
        }
    }
    return ret;
};
SyntaxError.prototype.toString = function () {
    let msg = "file " + (this.file || "-") + ": line " + (this.linenumber !== undefined ? this.linenumber : "-") + ": char " + (this.charnumber !== undefined ? (this.charnumber + ' "' + this.char + '"') : "-") + ": " + this.message;
    if (this.hasOwnProperty("line") && this.line) {
        msg += "\n>  " + this.line;
    }
    if (this.hasOwnProperty("section") && this.section) {
        msg += "\n>> " + this.section;
    }
    return msg;
};

module.exports = SyntaxError;

