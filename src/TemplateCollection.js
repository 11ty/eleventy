import { TemplatePath } from "@11ty/eleventy-utils";

import TemplateData from "./Data/TemplateData.js";
import Sortable from "./Util/Objects/Sortable.js";
import { isGlobMatch } from "./Util/GlobMatcher.js";

class TemplateCollection extends Sortable {
	constructor() {
		super();

		this._filteredByGlobsCache = new Map();
	}

	getAll() {
		return this.items.slice();
	}

	getAllSorted() {
		return this.sort(Sortable.sortFunctionDateInputPath);
	}

	getSortedByDate() {
		return this.sort(Sortable.sortFunctionDate);
	}

	getGlobs(globs) {
		if (typeof globs === "string") {
			globs = [globs];
		}

		globs = globs.map((glob) => TemplatePath.addLeadingDotSlash(glob));

		return globs;
	}

	getFilteredByGlob(globs) {
		globs = this.getGlobs(globs);

		let key = globs.join("::");
		if (!this._dirty) {
			// Try to find a pre-sorted list and clone it.
			if (this._filteredByGlobsCache.has(key)) {
				return [...this._filteredByGlobsCache.get(key)];
			}
		} else if (this._filteredByGlobsCache.size) {
			// Blow away cache
			this._filteredByGlobsCache = new Map();
		}

		let filtered = this.getAllSorted().filter((item) => {
			return isGlobMatch(item.inputPath, globs);
		});
		this._dirty = false;
		this._filteredByGlobsCache.set(key, [...filtered]);
		return filtered;
	}

	getFilteredByTag(tagName) {
		return this.getAllSorted().filter((item) => {
			if (!tagName || TemplateData.getIncludedTagNames(item.data).includes(tagName)) {
				return true;
			}
			return false;
		});
	}

	getFilteredByTags(...tags) {
		return this.getAllSorted().filter((item) => {
			let itemTags = TemplateData.getIncludedTagNames(item.data);
			return tags.every((requiredTag) => {
				if (Array.isArray(itemTags)) {
					return itemTags.includes(requiredTag);
				} else {
					return itemTags === requiredTag;
				}
			});
		});
	}
}

export default TemplateCollection;
