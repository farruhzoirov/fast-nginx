const chalk = require("chalk");
const readline = require("readline");

async function askUser(options, question) {
    const validAnswers = ["y", "n", "yes", "no"];
    if (options?.yes) {
        console.log(chalk.gray(`${question} (auto-answered: yes)`));
        return true
    }

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    rl.question(chalk.yellow(`${question} (Y/N): `), (answer) => {
        rl.close();
        if (!validAnswers.includes(answer.toLowerCase())) {
            askUser(options, question);
        }
        return answer.toLowerCase() === "y" || answer.toLowerCase() === "yes";
    });
}


module.exports = {
    askUser
};