// TODO allow opt-out from morphdom, maybe even on a per-path basis
(function () {
  if (!("WebSocket" in window)) {
    return;
  }

  class Util {
    static pad(num, digits = 2) {
      let zeroes = new Array(digits + 1).join(0);
      return `${zeroes}${num}`.substr(-1 * digits);
    }

    static output(type, ...messages) {
      let now = new Date();
      let date = `${Util.pad(now.getUTCHours())}:${Util.pad(
        now.getUTCMinutes()
      )}:${Util.pad(now.getUTCSeconds())}.${Util.pad(
        now.getUTCMilliseconds(),
        3
      )}`;
      console[type](`[11ty][${date} UTC]`, ...messages);
    }

    static capitalize(word) {
      return word.substr(0, 1).toUpperCase() + word.substr(1);
    }
  }

  class EleventyReload {
    static log(message) {
      Util.output("log", message);
    }
    static logError(message, error) {
      Util.output("error", message, error);
    }

    static reconnect(e) {
      if (document.visibilityState === "visible") {
        EleventyReload.init({ mode: "reconnect" });
      }
    }

    static init(options = {}) {
      EleventyReload.log("Trying to connect…");
      let { port } = new URL(document.location.href);
      // TODO add a path here so that it doesn’t collide with any app websockets
      let socket = new WebSocket(`ws://localhost:${port}`);

      // TODO add special handling for disconnect or document focus to retry
      socket.addEventListener("message", async function (event) {
        try {
          let data = JSON.parse(event.data);
          // EleventyReload.log( JSON.stringify(data, null, 2) );
          let {
            type,
            subtype,
            status,
            message,
            build,
            files,
            error,
            pathprefix,
          } = data;
          if (type === "eleventy.reload") {
            if (subtype === "css") {
              for (let link of document.querySelectorAll(
                `link[rel="stylesheet"]`
              )) {
                let url = new URL(link.href);
                url.searchParams.set("_11ty", Date.now());
                link.href = url.toString();
              }
              EleventyReload.log(`CSS updated without page reload.`);
            } else {
              const { default: morphdom } = await import(
                `${pathprefix || "/"}morphdom-esm.js`
              );
              let morphed = false;

              // EleventyReload.log( JSON.stringify(build.templates, null, 2) );
              for (let template of build.templates || []) {
                if (template.url === document.location.pathname) {
                  // Importantly, if this does not match but is still relevant
                  // (layout/include/etc), a full reload happens below.
                  // This could be improved.
                  if ((files || []).includes(template.inputPath)) {
                    // Notable limitation: this won’t re-run script elements
                    morphed = true;
                    morphdom(document.documentElement, template.content);
                    EleventyReload.log(
                      `HTML delta applied without page reload.`
                    );
                  }
                  break;
                }
              }

              if (!morphed) {
                EleventyReload.log(`Page reload initiated.`);
                window.location.reload();
              }
            }
          } else if (type === "eleventy.msg") {
            EleventyReload.log(`${message}`);
          } else if (type === "eleventy.error") {
            // Log Eleventy build errors
            // Extra parsing for Node Error objects
            let e = JSON.parse(error);
            EleventyReload.error(`Build error:  ${e.message}`, e);
          } else if (type === "eleventy.status") {
            if (status === "connected" && options.mode === "reconnect") {
              window.location.reload();
            }
            EleventyReload.log(Util.capitalize(status));
          } else {
            EleventyReload.log("Unknown event type", data);
          }
        } catch (e) {
          EleventyReload.log("Error", event.data, e.message);
        }
      });

      socket.addEventListener("open", function (event) {
        window.removeEventListener("focus", EleventyReload.reconnect);
        window.removeEventListener(
          "visibilitychange",
          EleventyReload.reconnect
        );
      });

      socket.addEventListener("close", function (event) {
        window.removeEventListener(
          "visibilitychange",
          EleventyReload.reconnect
        );
        window.addEventListener("visibilitychange", EleventyReload.reconnect);

        window.removeEventListener("focus", EleventyReload.reconnect);
        window.addEventListener("focus", EleventyReload.reconnect);
      });
    }
  }

  // TODO remove this?
  // EleventyReload.log("Page reload.", Date.now());

  EleventyReload.init();
})();
