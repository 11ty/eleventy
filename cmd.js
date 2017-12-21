#!/usr/bin/env node
const argv = require("minimist")(process.argv.slice(2));
const Eleventy = require("./src/Eleventy");

let eleven = new Eleventy(argv.input, argv.output);
eleven.setFormats(argv.formats);
eleven.setIsVerbose(!argv.quiet);

(async () => {
  await eleven.init();

  if (argv.version) {
    console.log(eleven.getVersion());
  } else if (argv.help) {
    console.log(eleven.getHelp());
  } else if (argv.watch) {
    eleven.watch();
  } else {
    await eleven.write();
    console.log(eleven.getFinishedLog());
  }
})();
