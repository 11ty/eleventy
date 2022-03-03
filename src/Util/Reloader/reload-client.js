(function () {
  if (!("WebSocket" in window)) {
    return;
  }

  class Util {
    static pad(num, digits = 2) {
      let zeroes = new Array(digits + 1).join(0);
      return `${zeroes}${num}`.substr(-1 * digits);
    }

    static log(message) {
      Util.output("log", message);
    }
    static error(message, error) {
      Util.output("error", message, error);
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
    static reconnect(e) {
      if (document.visibilityState === "visible") {
        EleventyReload.init({ mode: "reconnect" });
      }
    }

    static async onreload({ subtype, files, build, pathprefix }) {
      if (subtype === "css") {
        for (let link of document.querySelectorAll(`link[rel="stylesheet"]`)) {
          let url = new URL(link.href);
          url.searchParams.set("_11ty", Date.now());
          link.href = url.toString();
        }
        Util.log(`CSS updated without page reload.`);
      } else {
        const { default: morphdom } = await import(
          `${pathprefix || "/"}morphdom-esm.js`
        );

        let morphed = false;
        // Util.log( JSON.stringify(build.templates, null, 2) );
        for (let template of build.templates || []) {
          if (template.url === document.location.pathname) {
            // Importantly, if this does not match but is still relevant
            // (layout/include/etc), a full reload happens below.
            // This could be improved.
            if ((files || []).includes(template.inputPath)) {
              // Notable limitation: this won’t re-run script elements
              morphed = true;
              morphdom(document.documentElement, template.content, {
                // Speed-up trick from morphdom docs
                onBeforeElUpdated: function (fromEl, toEl) {
                  // https://dom.spec.whatwg.org/#concept-node-equals
                  if (fromEl.isEqualNode(toEl)) {
                    return false;
                  }
                  return true;
                },
              });

              Util.log(`HTML delta applied without page reload.`);
            }
            break;
          }
        }

        if (!morphed) {
          Util.log(`Page reload initiated.`);
          window.location.reload();
        }
      }
    }

    static init(options = {}) {
      Util.log("Trying to connect…");

      let { port } = new URL(document.location.href);
      // TODO add a path here so that it doesn’t collide with any app websockets
      let socket = new WebSocket(`ws://localhost:${port}`);

      // TODO add special handling for disconnect or document focus to retry
      socket.addEventListener("message", async function (event) {
        try {
          let data = JSON.parse(event.data);
          // Util.log( JSON.stringify(data, null, 2) );
          let { type } = data;

          if (type === "eleventy.reload") {
            await EleventyReload.onreload(data);
          } else if (type === "eleventy.msg") {
            Util.log(`${data.message}`);
          } else if (type === "eleventy.error") {
            // Log Eleventy build errors
            // Extra parsing for Node Error objects
            let e = JSON.parse(data.error);
            Util.error(`Build error:  ${e.message}`, e);
          } else if (type === "eleventy.status") {
            if (data.status === "connected" && options.mode === "reconnect") {
              window.location.reload();
            }
            Util.log(Util.capitalize(data.status));
          } else {
            Util.log("Unknown event type", data);
          }
        } catch (e) {
          Util.log("Error", event.data, e.message);
        }
      });

      socket.addEventListener("open", (event) => {
        EleventyReload.applyReconnectListeners("remove");
      });

      socket.addEventListener("close", (event) => {
        EleventyReload.applyReconnectListeners("remove");
        EleventyReload.applyReconnectListeners("add");
      });
    }

    static applyReconnectListeners(mode) {
      let method = "addEventListener";
      if (mode === "remove") {
        method = "removeEventListener";
      }
      window[method]("focus", EleventyReload.reconnect);
      window[method]("visibilitychange", EleventyReload.reconnect);
    }
  }

  // TODO remove this?
  // Util.log("Page reload.", Date.now());

  EleventyReload.init();
})();
