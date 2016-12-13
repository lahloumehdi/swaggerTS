var fs = require("fs");
var _ = require("lodash");
var crypto = require('crypto');
var path = require("path");

module.exports = {
    loadContext: function (answer) {
        var config = fs.readFileSync(path.join(__dirname, "generatorconfig.json"), "utf8");
        if (config) {
            config = JSON.parse(config);
        }
        console.log(config);
        
        //load templates
        var context = {
            config: config,
            namespace: answer + config.namespace,
            version: config.apiversion
        }
        
        //parse xml
        var prefixMatch = new RegExp(/(?!xmlns)^.*:/);
        function stripPrefix(str) {
            return str.replace(prefixMatch, '');
        };
        var parseroptions = {
            tagNameProcessors: [stripPrefix],
            attrNameProcessors: [stripPrefix]
        };
        
        var wadlText = fs.readFileSync(path.join(__dirname, config.targetsource));
        context.swagger = JSON.parse(wadlText);
        
        function randomValueHex(len) {
            return crypto.randomBytes(Math.ceil(len / 2))
                .toString('hex')// convert to hexadecimal format
                .slice(0, len);   // return required number of characters
        }
        
        if (context.swagger.info && context.swagger.info.version)
            context.config.apiversion = context.swagger.info.version;
        var apiText = "module " + (answer ? answer : '') + ".API {" + "\n";
        if (context.swagger.definitions) {
            for (var def in context.swagger.definitions) {
                if (context.swagger.definitions[def].type === "object") {
                    apiText += "    export interface I" + ((def.split(".").join('')).split('[').join('')).split(']').join("") + " {" + "\n";
                    if (context.swagger.definitions[def].properties) {
                        for (var prop in context.swagger.definitions[def].properties) {
                            if (context.swagger.definitions[def].properties[prop].description)
                                apiText += "        //" + context.swagger.definitions[def].properties[prop].description + "\n";
                            apiText += "        ";
                            switch (context.swagger.definitions[def].properties[prop].type) {
                                case "array":
                                    if (context.swagger.definitions[def].properties[prop].items && context.swagger.definitions[def].properties[prop].items.$ref) {
                                        var newtype = context.swagger.definitions[def].properties[prop].items.$ref;
                                        if (context.swagger.definitions[def].properties[prop].items.$ref.indexOf("#/definitions/") === 0)
                                            newtype = "I" + ((context.swagger.definitions[def].properties[prop].items.$ref.split("#/definitions/")[1].split(".").join('')).split('[').join('')).split(']').join("");
                                        apiText += prop + "?: " + newtype + "[];" + "\n";
                                    }
                                    else if (context.swagger.definitions[def].properties[prop].items.type === "integer" || context.swagger.definitions[def].properties[prop].items.type === "number") {
                                        apiText += prop + "?: number[];" + "\n";
                                    }
                                    else if (context.swagger.definitions[def].properties[prop].items.type === "string") {
                                        apiText += prop + "?: string[];" + "\n";
                                    }
                                    else {
                                        debugger;
                                    }
                                    break;
                                case "string":
                                    apiText += prop + "?: string;" + "\n";
                                    break;
                                case "object":
                                    apiText += prop + "?: any;" + "\n";
                                    break;
                                case "integer":
                                case "number":
                                    apiText += prop + "?: number;" + "\n";
                                    break;
                                case "boolean":
                                    apiText += prop + "?: boolean;" + "\n";
                                    break;
                                default:
                                    if (context.swagger.definitions[def].properties[prop].$ref && context.swagger.definitions[def].properties[prop].$ref.indexOf("#/definitions/") === 0)
                                        apiText += prop + "?: I" + ((context.swagger.definitions[def].properties[prop].$ref.split("#/definitions/")[1].split(".").join('')).split('[').join('')).split(']').join("") + ";" + "\n";
                                    else {
                                        apiText += prop + "?: any;" + "\n";
                                    }
                            }
                        }
                    }
                    apiText += "    }" + "\n\n";
                }
            }
        }
        
        var apiList = [];
        if (context.swagger.paths) {
            for (var apiPath in context.swagger.paths) {
                for (var verb in context.swagger.paths[apiPath]) {
                    var apiItem = {};
                    apiItem.id = context.swagger.paths[apiPath][verb].operationId;
                    apiItem.verb = verb;
                    apiItem.apiPath = apiPath;
                    apiItem.data = context.swagger.paths[apiPath][verb];
                    
                    var exists = _.find(apiList, function (i) { return i.id == apiItem.id });
                    if (exists) {
                        apiItem.id = apiItem.id + randomValueHex(12);
                    }
                    apiList.push(apiItem);
                }
            }
        }
        
        
        apiText += "}";
        context.apiText = apiText;
        return context;
    }
}