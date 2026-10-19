import { validateNames } from './names';

export interface Schema {
    type?: 'string' | 'number' | 'integer' | 'boolean' | 'null' | 'object' | 'array';
    enum?: readonly string[];
    $ref?: string;
    items?: Schema;
    anyOf?: readonly Schema[];
    properties?: Record<string, Schema>;
    required?: readonly string[];
    debugOnly?: boolean;
    minimum?: number;
    maximum?: number;
    minBytes?: number;
    maxBytes?: number;
}

export interface Field extends Schema {
    optional?: boolean;
}

export interface Argument {
    name: string;
    schema: Schema;
    optional: boolean;
    debugOnly?: boolean;
}

export interface Request {
    args: Argument[];
    result: Schema;
    error: boolean;
    debugOnly?: boolean;
}

export interface RequestOptions {
    returns?: Schema;
    error?: boolean;
    debugOnly?: boolean;
}

export interface Protocol {
    version: number;
    definitions: Record<string, Schema>;
    requests: Record<string, Request>;
    events: Record<string, Schema>;
    internalEvents?: Record<string, Schema>;
}

export const s = {
    string: {
        type: 'string',
    } as Schema,
    number: {
        type: 'number',
    } as Schema,
    integer: {
        type: 'integer',
    } as Schema,
    boolean: {
        type: 'boolean',
    } as Schema,
    record: {
        type: 'object',
    } as Schema,
    unknown: {} as Schema,
    void: {
        type: 'null',
    } as Schema,

    text(limits: { minBytes?: number; maxBytes?: number }): Schema {
        return {
            type: 'string',
            ...limits,
        };
    },

    ref(name: string): Schema {
        return {
            $ref: `#/definitions/${name}`,
        };
    },
    array(items: Schema): Schema {
        return {
            type: 'array',
            items,
        };
    },
    nullable(value: Schema): Schema {
        return {
            anyOf: [value, s.void],
        };
    },
    optional(value: Schema): Field {
        return {
            ...value,
            optional: true,
        };
    },
    debugOnly<T extends Field>(value: T): T {
        return {
            ...value,
            debugOnly: true,
        };
    },
    enum(values: readonly string[], type?: 'string'): Schema {
        return type ? {
            type,
            enum: values,
        } : {
            enum: values,
        };
    },
    object(fields: Record<string, Field>, required?: readonly string[]): Schema {
        return {
            type: 'object',
            properties: Object.fromEntries(Object.entries(fields).map(([name, field]) => {
                const { optional: _optional, ...schema } = field;
                return [name, schema];
            })),
            required: required ?? Object.keys(fields).filter(name => !fields[name].optional),
        };
    },
};

/* Field order is the positional argument order on the existing wire protocol. */
export function request(
    fields: Record<string, Field> = {},
    options: RequestOptions = {},
): Request {
    return {
        args: Object.entries(fields).map(([name, field]) => {
            const { optional = false, debugOnly, ...schema } = field;
            return {
                name,
                schema,
                optional,
                ...(debugOnly ? {
                    debugOnly,
                } : {}),
            };
        }),
        result: options.returns ?? s.record,
        error: options.error ?? false,
        ...(options.debugOnly ? {
            debugOnly: true,
        } : {}),
    };
}

export function references<T extends Record<string, Schema>>(definitions: T): { [K in keyof T]: Schema } {
    return Object.fromEntries(Object.keys(definitions).map(name => [name, s.ref(name)])) as { [K in keyof T]: Schema };
}

export function validateSchema(schema: Schema, location: string, definitions: Record<string, Schema> = {}): void {
    for (const [minimum, maximum, numeric] of [
        ['minBytes', 'maxBytes', false],
        ['minimum', 'maximum', true],
    ] as const) {
        const lower = schema[minimum];
        const upper = schema[maximum];
        if (lower === undefined && upper === undefined) {
            continue;
        }

        const validType = numeric ? schema.type === 'integer' || schema.type === 'number' : schema.type === 'string';
        const validLimit = (value: number | undefined) => value === undefined ||
            (Number.isFinite(value) && (numeric || (Number.isInteger(value) && value >= 0)));
        if (!validType || !validLimit(lower) || !validLimit(upper) ||
            (lower !== undefined && upper !== undefined && lower > upper)) {
            throw new Error(`${location}: invalid ${minimum}/${maximum} limits`);
        }
    }

    if (schema.$ref && (!schema.$ref.startsWith('#/definitions/') ||
        !Object.hasOwn(definitions, schema.$ref.slice('#/definitions/'.length)))) {
        throw new Error(`${location}: unknown reference ${schema.$ref}`);
    }

    for (const name of schema.required ?? []) {
        if (!Object.hasOwn(schema.properties ?? {}, name)) {
            throw new Error(`${location}: required field ${name} is not defined`);
        }
    }

    for (const [name, field] of Object.entries(schema.properties ?? {})) {
        validateSchema(field, `${location}.${name}`, definitions);
    }

    if (schema.items) {
        validateSchema(schema.items, `${location}[]`, definitions);
    }

    for (const alternative of schema.anyOf ?? []) {
        validateSchema(alternative, location, definitions);
    }
}

export function validateProtocol(protocol: Protocol): void {
    const internalEvents = protocol.internalEvents ?? {};
    for (const channel of Object.keys(internalEvents)) {
        if (!channel.startsWith('native->') || Object.hasOwn(protocol.events, channel)) {
            throw new Error(`Invalid or duplicate internal event: ${channel}`);
        }
    }

    for (const channel of Object.keys(protocol.events)) {
        if (channel.startsWith('native->')) {
            throw new Error(`Native-only event must be declared in internalEvents: ${channel}`);
        }
    }

    validateNames(protocol.definitions, protocol.requests, { ...protocol.events, ...internalEvents });

    for (const [name, definition] of Object.entries(protocol.definitions)) {
        validateSchema(definition, name, protocol.definitions);
    }

    for (const [channel, definition] of Object.entries(protocol.requests)) {
        let optional = false;
        let debugOnly = false;
        for (const argument of definition.args) {
            if (optional && !argument.optional) {
                throw new Error(`${channel}: required argument ${argument.name} follows an optional argument`);
            }

            if (debugOnly && !argument.debugOnly) {
                throw new Error(`${channel}: production arguments must precede debug arguments`);
            }

            optional ||= argument.optional;
            debugOnly ||= argument.debugOnly ?? false;
            validateSchema(argument.schema, `${channel}.${argument.name}`, protocol.definitions);
        }

        validateSchema(definition.result, `${channel} result`, protocol.definitions);
    }

    for (const [channel, event] of Object.entries({ ...protocol.events, ...internalEvents })) {
        validateSchema(event, channel, protocol.definitions);
    }
}
