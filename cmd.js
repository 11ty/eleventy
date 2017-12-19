#!/usr/bin/env node

const argv = require("minimist")(process.argv.slice(2));
const Eleventy = require("./src/Eleventy");

let eleven = new Eleventy(argv.input, argv.output);
eleven.setFormats(argv.formats);

(async function() {
  let start = new Date();

  await eleven.init();

  if (argv.version) {
    eleven.printVersion();
  } else if (argv.help) {
    eleven.printHelp();
  } else if (argv.watch) {
    eleven.watch();
  } else {
    await eleven.write();

    console.log(
      "Finished in",
      ((new Date() - start) / 1000).toFixed(2),
      "seconds"
    );
  }
})();
