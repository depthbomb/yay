import { wireSchema } from './wire_names.mjs';
import { generateChannels } from './channels.mjs';
import { generateSettingCpp } from './settings.mjs';
import { contractName } from '../../protocol/names.ts';

const nameOf = reference => reference.split('/').at(-1);
const nullable = value => value.anyOf?.some(item => item.type === 'null');
const nonNull = value => value.anyOf.find(item => item.type !== 'null');

function productionSchema(value) {
	if (Array.isArray(value)) {
		return value.filter(item => !item?.debugOnly).map(productionSchema);
	}

	if (value && typeof value === 'object') {
		return Object.fromEntries(Object.entries(value)
			.filter(([key, field]) => key !== 'debugOnly' && !field?.debugOnly)
			.map(([key, field]) => [key, productionSchema(field)]));
	}

	return value;
}

function guard(content, definition) {
	return definition.debugOnly ? `#ifdef YAY_DEBUG_BUILD\n${content}#endif\n` : content;
}

function typeOf(value) {
	if (value.$ref) {
		return nameOf(value.$ref);
	}

	if (nullable(value)) {
		return `std::optional<${typeOf(nonNull(value))}>`;
	}

	if (value.type === 'array') {
		return `std::vector<${typeOf(value.items)}>`;
	}

	return {
		string: 'std::string',
		number: 'double',
		integer: 'int64_t',
		boolean: 'bool',
		null: 'std::nullptr_t',
	}[value.type] ?? 'Json';
}

function fieldType(value, optional) {
	const type = typeOf(value);
	return optional && !nullable(value) ? `std::optional<${type}>` : type;
}

function generateStruct(name, definition) {
	let header = `struct ${name}\n{\npublic:\n`;
	let read = `void from_json(const Json& input, ${name}& value)\n{\n`;
	let write = `void to_json(Json& output, const ${name}& value)\n{\n    output = Json::object();\n`;
	for (const [field, schema] of Object.entries(definition.properties)) {
		const required = definition.required.includes(field);
		header += guard(`    ${fieldType(schema, !required)} ${field}{};\n`, schema);
		if (!required || nullable(schema)) {
			read += guard(`    if (input.contains("${field}") && !input.at("${field}").is_null())\n    {\n        value.${field} = input.at("${field}").get<${nullable(schema) ? typeOf(nonNull(schema)) : typeOf(schema)}>();\n    }\n`, schema);
			let fieldWriter = `    if (value.${field})\n    {\n        output["${field}"] = *value.${field};\n    }\n`;
			if (required) {
				fieldWriter += `    else\n    {\n        output["${field}"] = nullptr;\n    }\n`;
			}

			write += guard(fieldWriter, schema);
		}
		else {
			read += guard(`    input.at("${field}").get_to(value.${field});\n`, schema);
			write += guard(`    output["${field}"] = value.${field};\n`, schema);
		}
	}

	header += `};\nvoid from_json(const Json& input, ${name}& value);\nvoid to_json(Json& output, const ${name}& value);\n\n`;
	return { header, implementation: read + '}\n\n' + write + '}\n\n' };
}

export function generateCpp(schema, banner, wireNames = new Map(), settings = {}) {
	let header = banner + '#pragma once\n#include "core/json.h"\n#include <concepts>\n#include <optional>\n#include <string_view>\n#include <vector>\n\nnamespace ipc\n{\n';
	let implementation = banner + '#include "generated/ipc_contract.h"\n#include <stdexcept>\n\nnamespace ipc\n{\n';
	const channels = generateChannels(schema, wireNames);
	header += channels.header;
	implementation += channels.implementation;
	const settingContract = generateSettingCpp(settings);
	header += settingContract.header;
	implementation += settingContract.implementation;
	for (const [name, definition] of Object.entries(schema.definitions)) {
		if (definition.type === 'object' && definition.properties) {
			const model = generateStruct(name, definition);
			header += model.header;
			implementation += model.implementation;
		}
	}

	for (const [channel, definition] of Object.entries(schema.requests)) {
		const name = contractName(channel);
		let request = `struct ${name}\n{\npublic:\n    static constexpr auto Channel = RequestChannel::${name};\n    typedef ${typeOf(definition.result)} Result;\n`;
		for (const arg of definition.args) {
			request += guard(`    ${fieldType(arg.schema, arg.optional)} ${arg.name}{};\n`, arg);
		}

		request += `    static ${name} parse(const Json& args);\n};\n\n`;
		header += guard(request, definition);
		const debugArgsOnly = definition.args.length && definition.args.every(arg => arg.debugOnly);
		let parser = `${name} ${name}::parse(${debugArgsOnly ? '[[maybe_unused]] ' : ''}const Json&${definition.args.length ? ' args' : ''})\n{\n    ${name} value;\n`;
		definition.args.forEach((arg, index) => {
			const read = arg.optional
				? `    if (args.size() > ${index} && !args.at(${index}).is_null())\n    {\n        value.${arg.name} = args.at(${index}).get<${typeOf(arg.schema)}>();\n    }\n`
				: `    value.${arg.name} = args.at(${index}).get<${typeOf(arg.schema)}>();\n`;
			parser += guard(read, arg);
		});
		parser += '\n    return value;\n}\n\n';
		implementation += guard(parser, definition);
	}

	for (const [channel, definition] of Object.entries({ ...schema.events, ...schema.internalEvents })) {
		const name = contractName(channel);
		let payload = typeOf(definition);
		if (definition.type === 'object' && definition.properties) {
			payload = `${name}Payload`;
			const model = generateStruct(payload, definition);
			header += guard(model.header, definition);
			implementation += guard(model.implementation, definition);
		}

		header += guard(`struct ${name}\n{\npublic:\n    static constexpr auto Channel = EventChannel::${name};\n    static constexpr bool Renderer = ${Object.hasOwn(schema.events, channel)};\n    typedef ${payload} Payload;\n};\n\n`, definition);
	}

	header += 'template <class Event>\nconcept EventContract = requires\n{\n    typename Event::Payload;\n    requires std::same_as<decltype(Event::Channel), const EventChannel>;\n};\n\ntemplate <class Event>\nconcept RendererEvent = EventContract<Event> && Event::Renderer;\n\n';
	header += 'const Json& schema();\n}\n';
	const runtimeSchema = wireSchema(schema, wireNames);
	implementation += `const Json& schema()\n{\n#ifdef YAY_DEBUG_BUILD\n    static const Json value = Json::parse(R"ipc(${JSON.stringify(runtimeSchema)})ipc");\n#else\n    static const Json value = Json::parse(R"ipc(${JSON.stringify(productionSchema(runtimeSchema))})ipc");\n#endif\n\n    return value;\n}\n}\n`;
	return { header, implementation };
}
