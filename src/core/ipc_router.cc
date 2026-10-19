#include "core/ipc_router.h"

IpcRouter::IpcRouter(Dispatcher& dispatcher, WorkerPool& workers, Logger& logger) : m_dispatcher(dispatcher),
      m_workers(workers),
      m_logger(logger) {}

void IpcRouter::validateValue(const Json& value, const Json& definition, const std::string& location)
{
    if (definition.contains("$ref"))
    {
        const auto reference = definition.at("$ref").get<std::string>();
        validateValue(value, ipc::schema().at("definitions").at(reference.substr(reference.rfind('/') + 1)), location);
        return;
    }

    if (definition.contains("anyOf"))
    {
        for (const auto& alternative : definition.at("anyOf"))
        {
            try
            {
                validateValue(value, alternative, location);
                return;
            }
            catch (const std::exception&) {}
        }

        throw std::runtime_error(location + " has an invalid type.");
    }

    if (definition.contains("enum"))
    {
        if (const auto& values = definition.at("enum"); std::ranges::find(values, value) == values.end())
        {
            throw std::runtime_error(location + " has an unsupported value.");
        }
    }

    const auto type = definition.value("type", "");
    const bool valid = type.empty() || (type == "string" && value.is_string()) ||
                       (type == "number" && value.is_number()) || (type == "integer" && value.is_number_integer()) ||
                       (type == "boolean" && value.is_boolean()) || (type == "null" && value.is_null()) ||
                       (type == "array" && value.is_array()) || (type == "object" && value.is_object());
    if (!valid)
    {
        throw std::runtime_error(location + " must be " + type + ".");
    }

    if (value.is_number() &&
        ((definition.contains("minimum") && value < definition.at("minimum")) ||
         (definition.contains("maximum") && value > definition.at("maximum"))))
    {
        throw std::runtime_error(location + " is outside the allowed range.");
    }

    if (value.is_string())
    {
        // Keep this initializer separate so the condition stays readable.
        // ReSharper disable once CppTooWideScopeInitStatement
        const auto bytes = value.get_ref<const std::string&>().size();
        if ((definition.contains("minBytes") && bytes < definition.at("minBytes").get<size_t>()) ||
            (definition.contains("maxBytes") && bytes > definition.at("maxBytes").get<size_t>()))
        {
            throw std::runtime_error(location + " has an invalid length.");
        }
    }

    if (type == "object" && definition.contains("properties"))
    {
        for (const auto& field : definition.value("required", Json::array()))
        {
            if (!value.contains(field.get<std::string>()))
            {
                throw std::runtime_error(location + " is missing " + field.get<std::string>() + ".");
            }
        }

        for (const auto& [key, child] : definition.at("properties").items())
        {
            if (value.contains(key))
            {
                validateValue(value.at(key), child, location + "." + key);
            }
        }
    }

    if (type == "array" && definition.contains("items"))
    {
        for (const auto& item : value)
        {
            validateValue(item, definition.at("items"), location + "[]");
        }
    }
}

void IpcRouter::validateArguments(const std::string& channel, const Json& args)
{
    const auto& requests = ipc::schema().at("requests");
    if (!requests.contains(channel) || !args.is_array())
    {
        throw std::runtime_error("Invalid IPC request.");
    }

    const auto& parameters = requests.at(channel).at("args");
    if (args.size() > parameters.size())
    {
        throw std::runtime_error("Too many IPC arguments.");
    }

    for (size_t i = 0; i < parameters.size(); ++i)
    {
        const auto& parameter = parameters.at(i);
        if (i >= args.size() || (args.at(i).is_null() && parameter.value("optional", false)))
        {
            if (!parameter.value("optional", false))
            {
                throw std::runtime_error("Missing IPC argument: " + parameter.at("name").get<std::string>());
            }

            continue;
        }

        validateValue(args.at(i), parameter.at("schema"), channel + "." + parameter.at("name").get<std::string>());
    }
}

void IpcRouter::validateEvent(const ipc::EventChannel channel, const Json& payload)
{
    if (ipc::isRendererEvent(channel))
    {
        const auto name = std::string(ipc::channelName(channel));
        validateValue(payload, ipc::schema().at("events").at(name), name);
    }
}

void IpcRouter::dispatch(const Json& message, const RequestContext& context, Reply reply) const
{
    try
    {
        const auto channel = message.at("channel").get<std::string>();
        const auto args = message.at("args");
        validateArguments(channel, args);
        const auto handler = m_handlers.at(ipc::parseRequestChannel(channel).value());
        auto work = [this, channel, args, context, handler, reply = std::move(reply)]
        {
            Json result;
            try
            {
                result = handler.invoke(args, context);
                if (result.value("isOk", false))
                {
                    validateValue(
                        result.at("data"), ipc::schema().at("requests").at(channel).at("result"), channel + " result");
                }
            }
            catch (const std::exception& error)
            {
                m_logger.write(channel + ": " + error.what());
                result = ipcError(error.what());
            }

            m_dispatcher.post(
                [reply, result = std::move(result)]
                {
                    reply(result);
                });
        };

        if (handler.background)
        {
            m_workers.submit(std::move(work));
        }
        else
        {
            work();
        }
    }
    catch (const std::exception& error)
    {
        reply(ipcError(error.what()));
    }
}

void IpcRouter::verifyCoverage() const
{
    for (const auto channel : ipc::RequestChannels)
    {
        if (!m_handlers.contains(channel))
        {
            throw std::runtime_error("Missing IPC handler: " + std::string(ipc::channelName(channel)));
        }
    }
}

