export function contractName(channel: string): string {
    return channel.split(/[^a-zA-Z0-9]+/).filter(Boolean).map(word => word[0].toUpperCase() + word.slice(1)).join('');
}

export function validateNames(definitions: Record<string, { enum?: readonly string[] }>, requests: Record<string, unknown>, events: Record<string, { type?: string; properties?: unknown }>): void {
    const names = new Map<string, string>([
        ['RequestChannel', 'generated request enum'],
        ['EventChannel', 'generated event enum'],
        ['DebugRequestChannel', 'generated debug request enum'],
        ['DebugIpcContract', 'generated debug contract'],
        ['IIPCContract', 'generated request contract'],
        ['IIPCEvents', 'generated event contract'],
        ['IPCResult', 'imported result type'],
        ['SettingsValues', 'generated settings value types'],
        ['EventContract', 'generated event concept'],
        ['RendererEvent', 'generated event concept'],
        ['RequestChannels', 'generated request list'],
        ['EventChannels', 'generated event list'],
        ['Json', 'native JSON type'],
    ]);
    for (const name of Object.keys(definitions)) {
        if (!/^[A-Za-z][A-Za-z0-9]*$/.test(name) || names.has(name)) {
            throw new Error(`Invalid or reserved contract type name: ${name}`);
        }

        names.set(name, name);
        const members = new Set<string>();
        for (const value of definitions[name].enum ?? []) {
            const member = contractName(value);
            if (!/^[A-Za-z][A-Za-z0-9]*$/.test(member) || members.has(member)) {
                throw new Error(`Invalid or duplicate enum member: ${name}.${member}`);
            }

            members.add(member);
        }
    }

    function reserve(name: string, channel: string) {
        if (!/^[A-Za-z][A-Za-z0-9]*$/.test(name)) {
            throw new Error(`Invalid generated channel name: ${channel}`);
        }

        if (names.has(name)) {
            throw new Error(`Generated name collision: ${channel} and ${names.get(name)} both use ${name}`);
        }

        names.set(name, channel);
    }

    for (const channel of [...Object.keys(requests), ...Object.keys(events)]) {
        reserve(contractName(channel), channel);
    }

    for (const [channel, definition] of Object.entries(events)) {
        if (definition.type === 'object' && definition.properties) {
            reserve(`${contractName(channel)}Payload`, channel);
        }
    }
}
