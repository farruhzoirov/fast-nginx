const chalk = require("chalk");
const readline = require("readline");

function askUser(options, question) {
    if (options.yes) {
        console.log(chalk.gray(`${question} (auto-answered: yes)`));
        return Promise.resolve(true);
    }

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise((resolve) => {
        rl.question(chalk.yellow(`${question} (y/N): `), (answer) => {
            rl.close();
            resolve(answer.toLowerCase() === "y" || answer.toLowerCase() === "yes");
        });
    });
}


module.exports = askUser;