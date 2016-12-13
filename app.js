var fs = require("fs");
var path = require("path");

var contextBuilder = require("./context.js");
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question('Provide a namespace ... ', (answer) => {
    var context = contextBuilder.loadContext(answer);
    var dest = path.join(__dirname, "bin");
    if (!fs.existsSync(dest))
        fs.mkdir(dest);


    var header = "// API version " + context.config.apiversion + ", generated " + new Date().toString() + "\r\n\r\n";
    var result = header + context.apiText;

    var dest = path.join(__dirname, "bin");
    if (!fs.existsSync(dest))
        fs.mkdir(dest);

    dest = path.join(dest, context.config.destination);
    fs.writeFileSync(dest, result);
    console.log("The file was saved to " + dest);
    rl.close();

});
