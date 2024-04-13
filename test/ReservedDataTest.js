import test from "ava";
import ReservedData from "../src/Util/ReservedData.js";

test("No reserved Keys", t => {
  t.deepEqual(ReservedData.getReservedKeys({ key: {} }).sort(), []);
});

test("Standard keys are reserved", t => {
  t.deepEqual(ReservedData.getReservedKeys({ content: "" }).sort(), ["content"]);
  t.deepEqual(ReservedData.getReservedKeys({ collections: {} }).sort(), ["collections"]);
  t.deepEqual(ReservedData.getReservedKeys({ content: "", collections: {} }).sort(), ["collections", "content"]);
});

test("`page` subkeys", t => {
  t.deepEqual(ReservedData.getReservedKeys({ page: {} }).sort(), []);
  t.deepEqual(ReservedData.getReservedKeys({ page: "" }).sort(), ["page"]);
  t.deepEqual(ReservedData.getReservedKeys({ page: { date: "", otherkey: "" } }).sort(), ["page.date"]);
  t.deepEqual(ReservedData.getReservedKeys({ page: { inputPath: "", otherkey: "" } }).sort(), ["page.inputPath"]);
  t.deepEqual(ReservedData.getReservedKeys({ page: { fileSlug: "", otherkey: "" } }).sort(), ["page.fileSlug"]);
  t.deepEqual(ReservedData.getReservedKeys({ page: { filePathStem: "", otherkey: "" } }).sort(), ["page.filePathStem"]);
  t.deepEqual(ReservedData.getReservedKeys({ page: { outputFileExtension: "", otherkey: "" } }).sort(), ["page.outputFileExtension"]);
  t.deepEqual(ReservedData.getReservedKeys({ page: { templateSyntax: "", otherkey: "" } }).sort(), ["page.templateSyntax"]);
  t.deepEqual(ReservedData.getReservedKeys({ page: { url: "", otherkey: "" } }).sort(), ["page.url"]);
  t.deepEqual(ReservedData.getReservedKeys({ page: { outputPath: "", otherkey: "" } }).sort(), ["page.outputPath"]);
  t.deepEqual(ReservedData.getReservedKeys({ page: { date: "", outputPath: "", otherkey: "" } }).sort(), ["page.date", "page.outputPath"]);
});
