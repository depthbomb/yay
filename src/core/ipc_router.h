#pragma once
#include "core/runtime.h"
#include "generated/ipc_contract.h"
#include "platform/platform.h"

struct RequestContext
{
public:
    std::string windowName;
    HWND window = nullptr;
};

class IpcRouter
{
public:
    typedef std::function<void(Json)> Reply;

private:
    struct Handler
    {
    public:
        bool background;
        std::function<Json(const Json&, const RequestContext&)> invoke;
    };

    Dispatcher& m_dispatcher;
    WorkerPool& m_workers;
    Logger& m_logger;
    std::map<ipc::RequestChannel, Handler> m_handlers;

public:
    DI_INJECT(IpcRouter(Dispatcher& dispatcher, WorkerPool& workers, Logger& logger));

    template <class Request, class Function> void bind(Function function)
    {
        addHandler<Request>(std::move(function), false);
    }

    template <class Request, class Function> void bindBackground(Function function)
    {
        addHandler<Request>(std::move(function), true);
    }

    void dispatch(const Json& message, const RequestContext& context, Reply reply) const;
    void verifyCoverage() const;
    static void validateValue(const Json& value, const Json& definition, const std::string& location);
    static void validateArguments(const std::string& channel, const Json& args);
    static void validateEvent(ipc::EventChannel channel, const Json& payload);

private:
    template <class Request, class Function> void addHandler(Function function, const bool background)
    {
        const auto name = std::string(ipc::channelName(Request::Channel));
        Handler handler{
            background,
            [function = std::move(function)](const Json& args, const RequestContext& context)
            {
                return function(Request::parse(args), context);
            }
        };
        if (!m_handlers.emplace(Request::Channel, std::move(handler)).second)
        {
            throw std::runtime_error("Duplicate IPC handler: " + name);
        }
    }
};
