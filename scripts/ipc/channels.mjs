import { contractName } from '../../protocol/names.ts';

function guard(content, definition) {
	return definition.debugOnly ? `#ifdef YAY_DEBUG_BUILD\n${content}#endif\n` : content;
}

export function generateChannels(schema, wireNames) {
	let header = '';
	let implementation = '';
	for (const [kind, entries] of [
		['Request', Object.entries(schema.requests)],
		['Event', Object.entries({ ...schema.events, ...schema.internalEvents })],
	]) {
		const type = `${kind}Channel`;
		header += `enum class ${type}\n{\n`;
		header += entries.map(([channel, definition]) => guard(`    ${contractName(channel)},\n`, definition)).join('');
		header += '};\n\n';
		header += `inline constexpr ${type} ${kind}Channels[] = {\n`;
		header += entries.map(([channel, definition]) => guard(`    ${type}::${contractName(channel)},\n`, definition)).join('');
		header += '};\n\n';
		header += `std::string_view channelName(${type} channel);\nstd::optional<${type}> parse${type}(std::string_view name);\n\n`;
		implementation += `std::string_view channelName(const ${type} channel)\n{\n    switch (channel)\n    {\n`;
		implementation += entries.map(([channel, definition]) => guard(`    case ${type}::${contractName(channel)}:\n        return ${JSON.stringify(wireNames.get(channel) ?? channel)};\n`, definition)).join('');
		implementation += `    }\n\n    throw std::invalid_argument("Invalid ${kind.toLowerCase()} channel.");\n}\n\n`;
		implementation += `std::optional<${type}> parse${type}(const std::string_view name)\n{\n`;
		implementation += entries.map(([channel, definition]) => guard(`    if (name == ${JSON.stringify(wireNames.get(channel) ?? channel)})\n    {\n        return ${type}::${contractName(channel)};\n    }\n\n`, definition)).join('');
		implementation += '    return std::nullopt;\n}\n\n';
	}

	header += 'bool isRendererEvent(EventChannel channel);\n\n';
	implementation += 'bool isRendererEvent(const EventChannel channel)\n{\n    switch (channel)\n    {\n';
	implementation += Object.entries(schema.events).map(([channel, definition]) => guard(`    case EventChannel::${contractName(channel)}:\n`, definition)).join('');
	implementation += '        return true;\n    default:\n        return false;\n    }\n}\n\n';
	return { header, implementation };
}
