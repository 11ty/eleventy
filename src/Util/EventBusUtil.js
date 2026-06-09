import eventBus from "../EventBus.js";
import { createDebug } from "obug";

const debug = createDebug("BuildAwesome:EventBus");

class EventBusUtil {
	static debugCurrentListenerCounts() {
		for (let name of eventBus.eventNames()) {
			debug("Listeners for %o: %o", name, eventBus.listenerCount(name));
		}
	}
}

export default EventBusUtil;
