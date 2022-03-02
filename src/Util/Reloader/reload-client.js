// TODO allow opt-out from morphdom, maybe even on a per-path basis
(function () {
  if (!("WebSocket" in window)) {
    return;
  }

  // TODO remove this
  console.log("Page reload.", Date.now());

  class EleventyReload {
    static reconnect(e) {
      if (document.visibilityState === "visible") {
        EleventyReload.init({ mode: "reconnect" });
      }
    }
    static init(options = {}) {
      console.log("[11ty] Connecting…");
      let { port } = new URL(document.location.href);
      // TODO add a path here so that it doesn’t collide with any app websockets
      let socket = new WebSocket(`ws://localhost:${port}`);

      // TODO add special handling for disconnect or document focus to retry
      socket.addEventListener("message", async function (event) {
        try {
          let data = JSON.parse(event.data);
          // console.log( JSON.stringify(data, null, 2) );
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
              console.log(`[11ty] No-reload CSS update applied.`);
            } else {
              const { default: morphdom } = await import(
                `${pathprefix || "/"}morphdom-esm.js`
              );
              let morphed = false;

              // console.log( JSON.stringify(build.templates, null, 2) );
              for (let template of build.templates || []) {
                if (template.url === document.location.pathname) {
                  // Importantly, if this does not match but is still relevant
                  // (layout/include/etc), a full reload happens below.
                  // This could be improved.
                  if ((files || []).includes(template.inputPath)) {
                    // Notable limitation: this won’t re-run script elements
                    morphed = true;
                    morphdom(document.documentElement, template.content);
                    console.log(`[11ty] No-reload HTML delta applied.`);
                  }
                  break;
                }
              }

              if (!morphed) {
                console.log(`[11ty] Reload initiated.`);
                window.location.reload();
              }
            }
          } else if (type === "eleventy.msg") {
            console.log(`[11ty] ${message}`);
          } else if (type === "eleventy.error") {
            // Log Eleventy build errors
            // Extra parsing for Node Error objects
            let e = JSON.parse(error);
            console.error(`[11ty] Eleventy Build error:  ${e.message}`, e);
          } else if (type === "eleventy.status") {
            if (status === "connected" && options.mode === "reconnect") {
              window.location.reload();
            }
            console.log(`[11ty] Reload status: ${status}`);
          } else {
            console.log("[11ty] Unknown Reload event type", data);
          }
        } catch (e) {
          console.log("[11ty] Error", event.data, e.message);
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

  EleventyReload.init();
})();
