import eventBus from "../EventBus.js";
import debugUtil from "debug";

const debug = debugUtil("Eleventy:EventBus");

class EventBusUtil {
	// Used for non-global subscriptions that will blow away the previous listener
	static soloOn(name, callback) {
		eventBus.off(name, callback);
		eventBus.on(name, callback);
	}

	static resetForConfig() {
		this.debug();
		debug("Config reset (removing eleventy.templateModified listeners).");
		eventBus.removeAllListeners("eleventy.templateModified");
	}

	static debug() {
		for (let name of eventBus.eventNames()) {
			debug("Listeners for %o: %o", name, eventBus.listenerCount(name));
		}
	}
}

export default EventBusUtil;
