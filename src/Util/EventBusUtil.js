import eventBus from "../EventBus.js";
import debugUtil from "debug";

const debug = debugUtil("Eleventy:EventBus");

class EventBusUtil {
	static debugCurrentListenerCounts() {
		for (let name of eventBus.eventNames()) {
			debug("Listeners for %o: %o", name, eventBus.listenerCount(name));
		}
	}
}

export default EventBusUtil;
