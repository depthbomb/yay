import { Buffer } from 'node:buffer';
import { contractName } from '../../protocol/names.ts';
import { validateSchema } from '../../protocol/schema.ts';

function matches(value, schema) {
	if (schema.anyOf) {
		return schema.anyOf.some(alternative => matches(value, alternative));
	}

	if (schema.enum) {
		return schema.enum.includes(value);
	}

	if (schema.type === 'null') {
		return value === null;
	}

	if (schema.type === 'string') {
		return typeof value === 'string' && Buffer.byteLength(value, 'utf8') >= (schema.minBytes ?? 0) &&
			Buffer.byteLength(value, 'utf8') <= (schema.maxBytes ?? Infinity);
	}

	if (schema.type === 'boolean') {
		return typeof value === 'boolean';
	}

	return typeof value === 'number' && Number.isFinite(value) && (schema.type !== 'integer' || Number.isInteger(value)) &&
		value >= (schema.minimum ?? -Infinity) && value <= (schema.maximum ?? Infinity);
}

function predicate(schema) {
	if (schema.anyOf) {
		return '(' + schema.anyOf.map(predicate).join(' || ') + ')';
	}

	if (schema.enum) {
		return '(' + schema.enum.map(value => `value == ${JSON.stringify(value)}`).join(' || ') + ')';
	}

	const checks = [];
	switch (schema.type) {
		case 'boolean': return 'value.is_boolean()';
		case 'null': return 'value.is_null()';
		case 'string':
			checks.push('value.is_string()');
			if (schema.minBytes !== undefined) {
				checks.push(`value.get_ref<const std::string&>().size() >= ${schema.minBytes}`);
			}
			if (schema.maxBytes !== undefined) {
				checks.push(`value.get_ref<const std::string&>().size() <= ${schema.maxBytes}`);
			}
			break;
		case 'integer':
		case 'number': {
			const type = schema.type === 'integer' ? 'int64_t' : 'double';
			checks.push(schema.type === 'integer' ? 'value.is_number_integer()' : 'value.is_number()');
			if (schema.minimum !== undefined) {
				checks.push(`value.get<${type}>() >= ${schema.minimum}`);
			}
			if (schema.maximum !== undefined) {
				checks.push(`value.get<${type}>() <= ${schema.maximum}`);
			}
			break;
		}
		default: throw new Error(`Unsupported setting schema: ${JSON.stringify(schema)}`);
	}

	return '(' + checks.join(' && ') + ')';
}

/**
 * @param {Record<string, import('../../protocol/settings.ts').SettingDefinition>} settings
 */
export function validateSettings(settings) {
	for (const [key, definition] of Object.entries(settings)) {
		validateSchema(definition.schema, key);
		predicate(definition.schema);
		if (Object.hasOwn(definition, 'default') && definition.defaultFrom) {
			throw new Error(`${key}: specify a default value or a default source, not both`);
		}

		if (definition.defaultFrom && definition.defaultFrom !== 'downloads') {
			throw new Error(`${key}: unsupported default source`);
		}

		if (Object.hasOwn(definition, 'default') && !matches(definition.default, definition.schema)) {
			throw new Error(`${key}: default does not satisfy its setting schema`);
		}

		if (!Object.hasOwn(definition, 'default') && !definition.defaultFrom) {
			throw new Error(`${key}: a user setting needs a default`);
		}
	}
}

export function generateSettingTypes(settings, typeOf) {
	const fields = Object.entries(settings).map(([key, definition]) =>
		`    [SettingsKey.${contractName(key)}]: ${typeOf(definition.schema)};`);
	return 'export type SettingsValues = {\n' + fields.join('\n') + '\n};\n\n';
}

/**
 * @param {Record<string, import('../../protocol/settings.ts').SettingDefinition>} settings
 */
export function generateSettingCpp(settings) {
	const keys = Object.keys(settings);
	// language=TEXT
	const header = 'enum class SettingsKey\n{\n' + keys.map(key => `    ${contractName(key)},`).join('\n') +
		'\n};\n\ninline constexpr SettingsKey SettingsKeys[] = {\n' +
		keys.map(key => `    SettingsKey::${contractName(key)},`).join('\n') + '\n};\n\n' +
		'std::string_view settingName(SettingsKey key);\n' +
		'std::optional<SettingsKey> parseSettingKey(std::string_view name);\n' +
		'void from_json(const Json& input, SettingsKey& value);\n' +
		'void to_json(Json& output, SettingsKey value);\n\n' +
		'Json settingDefaults(const std::string& downloadsDirectory);\n' +
		'bool validSetting(std::string_view key, const Json& value);\n\n';
	const defaults = Object.entries(settings).flatMap(([key, definition]) => {
		if (!Object.hasOwn(definition, 'default') && !definition.defaultFrom) {
			return [];
		}

		const value = definition.defaultFrom ? 'downloadsDirectory' : definition.default === null ? 'nullptr' : JSON.stringify(definition.default);
		return [`        {${JSON.stringify(key)}, ${value}}`];
	});
	let implementation = 'std::string_view settingName(const SettingsKey key)\n{\n    switch (key)\n    {\n' +
		keys.map(key => `    case SettingsKey::${contractName(key)}:\n        return ${JSON.stringify(key)};`).join('\n') +
		'\n    }\n\n    throw std::invalid_argument("Unknown settings key.");\n}\n\n';
	implementation += 'std::optional<SettingsKey> parseSettingKey(const std::string_view name)\n{\n' +
		keys.map(key => `    if (name == ${JSON.stringify(key)})\n    {\n        return SettingsKey::${contractName(key)};\n    }\n`).join('\n') +
		'\n    return std::nullopt;\n}\n\n';
	implementation += 'void from_json(const Json& input, SettingsKey& value)\n{\n' +
		'    const auto key = parseSettingKey(input.get_ref<const std::string&>());\n' +
		'    if (!key)\n    {\n        throw std::invalid_argument("Unknown settings key.");\n    }\n\n' +
		'    value = *key;\n}\n\n' +
		'void to_json(Json& output, const SettingsKey value)\n{\n    output = settingName(value);\n}\n\n';
	implementation += 'Json settingDefaults(const std::string& downloadsDirectory)\n{\n    return {\n' + defaults.join(',\n') + '\n    };\n}\n\n';
	implementation += 'bool validSetting(const std::string_view key, const Json& value)\n{\n';
	for (const [key, definition] of Object.entries(settings)) {
		implementation += `    if (key == ${JSON.stringify(key)})\n    {\n        return ${predicate(definition.schema)};\n    }\n\n`;
	}
	implementation += '    return false;\n}\n\n';
	return { header, implementation };
}
