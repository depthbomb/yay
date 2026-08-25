import test from 'node:test';
import assert from 'node:assert/strict';
import { isValidBearerToken, LOCAL_API_HOSTNAME, isAllowedLocalApiHost } from './restValidation';

test('local API uses loopback and accepts only expected Host headers', () => {
	assert.equal(LOCAL_API_HOSTNAME, '127.0.0.1');
	assert.equal(isAllowedLocalApiHost('127.0.0.1:9876', 9876), true);
	assert.equal(isAllowedLocalApiHost('localhost:9876', 9876), true);
	assert.equal(isAllowedLocalApiHost('192.168.1.10:9876', 9876), false);
	assert.equal(isAllowedLocalApiHost('localhost:1234', 9876), false);
});

test('local API bearer tokens require an exact match', () => {
	assert.equal(isValidBearerToken('correct-token', 'correct-token'), true);
	assert.equal(isValidBearerToken('wrong-token', 'correct-token'), false);
	assert.equal(isValidBearerToken('', 'correct-token'), false);
});
