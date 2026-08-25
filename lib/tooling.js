import { createHash } from "node:crypto";
import { TYPE, parse } from "@formatjs/icu-messageformat-parser";
import { printAST } from "@formatjs/icu-messageformat-parser/printer.js";
//#region lib/types/tooling.js
function stableValue(value) {
	if (Array.isArray(value)) return value.map(stableValue);
	if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, child]) => [key, stableValue(child)]));
	return value;
}
function digest(value) {
	const content = JSON.stringify(stableValue(value));
	return `sha256:${createHash("sha256").update(content).digest("hex")}`;
}
function messageSourceHash(id, descriptor) {
	return digest({
		id,
		defaultMessage: descriptor.defaultMessage,
		description: descriptor.description ?? ""
	});
}
function sourceCatalogHash(source) {
	return digest({
		namespace: source.namespace,
		sourceLocale: source.sourceLocale,
		messages: Object.fromEntries(Object.entries(source.messages).map(([id, descriptor]) => [id, {
			defaultMessage: descriptor.defaultMessage,
			description: descriptor.description ?? ""
		}]))
	});
}
function walkSignature(elements, argumentsFound, tagsFound) {
	for (const element of elements) switch (element.type) {
		case TYPE.argument:
		case TYPE.number:
		case TYPE.date:
		case TYPE.time:
			argumentsFound.add(element.value);
			break;
		case TYPE.select:
		case TYPE.plural:
			argumentsFound.add(element.value);
			for (const option of Object.values(element.options)) walkSignature(option.value, argumentsFound, tagsFound);
			break;
		case TYPE.tag:
			tagsFound.add(element.value);
			walkSignature(element.children, argumentsFound, tagsFound);
			break;
		case TYPE.literal:
		case TYPE.pound:
	}
}
function messageSignature(message) {
	const argumentsFound = /* @__PURE__ */ new Set();
	const tagsFound = /* @__PURE__ */ new Set();
	walkSignature(parse(message), argumentsFound, tagsFound);
	return {
		arguments: [...argumentsFound].sort(),
		tags: [...tagsFound].sort()
	};
}
function sameValues(left, right) {
	return left.length === right.length && left.every((value, index) => value === right[index]);
}
/** Validate syntax, source freshness, placeholders, tags, and catalog coverage. */
function validateTranslationCatalog(source, translation) {
	const issues = [];
	const sourceKeys = Object.keys(source.messages);
	const targetKeys = Object.keys(translation.messages);
	if (translation.sourceHash !== sourceCatalogHash(source)) issues.push({
		code: "stale-source",
		key: "*",
		message: "translation sourceHash is stale"
	});
	for (const key of sourceKeys) {
		const descriptor = source.messages[key];
		const translated = translation.messages[key];
		if (!descriptor) continue;
		if (translation.sourceHashes[key] !== messageSourceHash(key, descriptor)) issues.push({
			code: "stale-source",
			key,
			message: `translation for "${key}" is stale`
		});
		if (translated === void 0) {
			issues.push({
				code: "missing-key",
				key,
				message: `missing translation for "${key}"`
			});
			continue;
		}
		try {
			const sourceSignature = messageSignature(descriptor.defaultMessage);
			const targetSignature = messageSignature(translated);
			if (!sameValues(sourceSignature.arguments, targetSignature.arguments)) issues.push({
				code: "argument-mismatch",
				key,
				message: `arguments differ: source [${sourceSignature.arguments.join(", ")}], translation [${targetSignature.arguments.join(", ")}]`
			});
			if (!sameValues(sourceSignature.tags, targetSignature.tags)) issues.push({
				code: "tag-mismatch",
				key,
				message: `tags differ: source [${sourceSignature.tags.join(", ")}], translation [${targetSignature.tags.join(", ")}]`
			});
		} catch (error) {
			issues.push({
				code: "invalid-message",
				key,
				message: error instanceof Error ? error.message : String(error)
			});
		}
	}
	for (const key of targetKeys) if (!source.messages[key]) issues.push({
		code: "extra-key",
		key,
		message: `translation contains unknown key "${key}"`
	});
	return issues;
}
const ACCENTS = {
	a: "à",
	A: "À",
	b: "ƀ",
	B: "Ɓ",
	c: "ç",
	C: "Ç",
	d: "ð",
	D: "Ð",
	e: "ë",
	E: "Ë",
	f: "ƒ",
	F: "Ƒ",
	g: "ğ",
	G: "Ğ",
	h: "ħ",
	H: "Ħ",
	i: "ï",
	I: "Ï",
	j: "ĵ",
	J: "Ĵ",
	k: "ķ",
	K: "Ķ",
	l: "ļ",
	L: "Ļ",
	m: "ɱ",
	M: "Ṁ",
	n: "ñ",
	N: "Ñ",
	o: "ô",
	O: "Ô",
	p: "þ",
	P: "Þ",
	q: "ʠ",
	Q: "Ɋ",
	r: "ŕ",
	R: "Ŕ",
	s: "š",
	S: "Š",
	t: "ŧ",
	T: "Ŧ",
	u: "ü",
	U: "Ü",
	v: "ṽ",
	V: "Ṽ",
	w: "ŵ",
	W: "Ŵ",
	x: "ẋ",
	X: "Ẋ",
	y: "ÿ",
	Y: "Ÿ",
	z: "ž",
	Z: "Ž"
};
function accentLiteral(value) {
	return `［${[...value].map((character) => ACCENTS[character] ?? character).join("")}${" !!!".repeat(Math.max(1, Math.ceil(value.length / 18)))}］`;
}
function transformLiterals(elements) {
	for (const element of elements) switch (element.type) {
		case TYPE.literal:
			element.value = accentLiteral(element.value);
			break;
		case TYPE.select:
		case TYPE.plural:
			for (const option of Object.values(element.options)) transformLiterals(option.value);
			break;
		case TYPE.tag:
			transformLiterals(element.children);
			break;
		case TYPE.argument:
		case TYPE.number:
		case TYPE.date:
		case TYPE.time:
		case TYPE.pound:
	}
}
function pseudoLocalize(message, locale = "en-XA") {
	const ast = parse(message);
	transformLiterals(ast);
	const transformed = printAST(ast);
	return locale === "ar-XB" ? `\u202e${transformed}\u202c` : transformed;
}
function createPseudoCatalog(source, locale = "en-XA", generatedAt = (/* @__PURE__ */ new Date()).toISOString()) {
	const messages = {};
	const sourceHashes = {};
	for (const [key, descriptor] of Object.entries(source.messages)) {
		messages[key] = pseudoLocalize(descriptor.defaultMessage, locale);
		sourceHashes[key] = messageSourceHash(key, descriptor);
	}
	return {
		schemaVersion: 1,
		namespace: source.namespace,
		sourceLocale: source.sourceLocale,
		locale,
		sourceHash: sourceCatalogHash(source),
		sourceHashes,
		messages,
		provider: "dsh-pseudo",
		reviewState: "machine",
		generatedAt
	};
}
//#endregion
export { createPseudoCatalog, messageSignature, messageSourceHash, pseudoLocalize, sourceCatalogHash, validateTranslationCatalog };
