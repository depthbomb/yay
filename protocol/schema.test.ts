import assert from 'node:assert/strict';
import { test } from 'node:test';
import { protocol } from './ipc';
import { s, request, references, validateProtocol, validateSchema, type Protocol } from './schema';
import { SettingsKey } from '../ui/src/ipc/ipc.generated';

function fixture(): Protocol {
    return {
        version: 1,
        definitions: {},
        requests: {},
        events: {},
    };
}

test('the application contract is valid and includes every renderer setting', () => {
    validateProtocol(protocol);
    assert.deepEqual(protocol.definitions.SettingsKey.enum, Object.values(SettingsKey));
});

test('optional and nullable fields describe different wire values', () => {
    const definition = s.object({
        success: s.nullable(s.boolean),
        finishedAt: s.optional(s.number),
    });
    assert.deepEqual(definition.required, ['success']);
    assert.deepEqual(definition.properties?.success.anyOf, [s.boolean, s.void]);
    assert.deepEqual(definition.properties?.finishedAt, s.number);
    assert.equal(Object.hasOwn(definition.properties?.finishedAt ?? {}, 'optional'), false);
});

test('named arguments retain their positional order and debug metadata', () => {
    const definition = request({
        key: s.string,
        fallback: s.optional(s.unknown),
        preview: s.debugOnly(s.optional(s.boolean)),
    });
    assert.deepEqual(definition.args, [
        { name: 'key', schema: s.string, optional: false },
        { name: 'fallback', schema: s.unknown, optional: true },
        { name: 'preview', schema: s.boolean, optional: true, debugOnly: true },
    ]);
    assert.deepEqual(s.object({ debug: s.optional(s.debugOnly(s.boolean)) }).properties?.debug,
        { ...s.boolean, debugOnly: true });
});

test('invalid references and required fields fail before generation', () => {
    const value = fixture();
    value.definitions.Message = s.object({ nested: s.array(s.ref('Missing')) });
    assert.throws(() => validateProtocol(value), /Message.nested\[]: unknown reference/);
    value.definitions = { Message: s.object({}, ['missing']) };
    assert.throws(() => validateProtocol(value), /required field missing is not defined/);
    value.definitions = { Message: { $ref: 'Message' } };
    assert.throws(() => validateProtocol(value), /unknown reference Message/);
});

test('required or production arguments cannot shift existing optional or debug positions', () => {
    const value = fixture();
    value.requests['test<-optional'] = request({ first: s.optional(s.string), second: s.string });
    assert.throws(() => validateProtocol(value), /required argument second follows an optional argument/);
    value.requests = {
        'test<-debug': request({ first: s.debugOnly(s.boolean), second: s.string }),
    };
    assert.throws(() => validateProtocol(value), /production arguments must precede debug arguments/);
});

test('generated names reject collisions between channels, models, and event payloads', () => {
    const value = fixture();
    value.requests['test<-save-item'] = request({});
    value.events['test->save-item'] = s.void;
    assert.throws(() => validateProtocol(value), /Generated name collision/);
    value.events = { 'test->saved': s.object({ value: s.string }) };
    value.definitions.TestSavedPayload = s.string;
    assert.throws(() => validateProtocol(value), /Generated name collision/);
    value.definitions = {};
    value.requests['test<-saved-payload'] = request({});
    assert.throws(() => validateProtocol(value), /Generated name collision/);
    value.requests = {};
    value.definitions.RequestChannel = s.string;
    assert.throws(() => validateProtocol(value), /reserved contract type/);
});

test('enum members must have distinct valid generated identifiers', () => {
    const value = fixture();
    value.definitions.Options = s.enum(['one-two', 'one_two']);
    assert.throws(() => validateProtocol(value), /duplicate enum member/);
    value.definitions.Options = s.enum(['123']);
    assert.throws(() => validateProtocol(value), /Invalid.*enum member/);
});

test('native events are declared separately from renderer events', () => {
    const value = fixture();
    value.events['native->quit'] = s.void;
    assert.throws(() => validateProtocol(value), /must be declared in internalEvents/);
    value.events = {};
    value.internalEvents = { 'native->quit': s.void };
    validateProtocol(value);
    value.internalEvents['window->closed'] = s.void;
    assert.throws(() => validateProtocol(value), /Invalid or duplicate internal event/);
});

test('request options and model references preserve the wire schema', () => {
    const models = references({ Answer: s.boolean });
    assert.deepEqual(models.Answer, s.ref('Answer'));
    assert.deepEqual(request(), { args: [], result: s.record, error: false });
    assert.deepEqual(request({ question: s.string }, { returns: models.Answer, error: true, debugOnly: true }), {
        args: [{ name: 'question', schema: s.string, optional: false }],
        result: s.ref('Answer'),
        error: true,
        debugOnly: true,
    });
});

test('schema limits reject invalid bounds before code generation', () => {
    validateSchema(s.text({ minBytes: 1, maxBytes: 32767 }), 'Text');
    validateSchema({ ...s.integer, minimum: 1, maximum: 65535 }, 'Port');
    assert.throws(() => validateSchema(s.text({ minBytes: 2, maxBytes: 1 }), 'Text'), /invalid minBytes/);
    assert.throws(() => validateSchema(s.text({ maxBytes: -1 }), 'Text'), /invalid minBytes/);
    assert.throws(() => validateSchema({ ...s.boolean, minimum: 1 }, 'Flag'), /invalid minimum/);
    assert.throws(() => validateSchema({ ...s.number, maximum: Infinity }, 'Number'), /invalid minimum/);
});
