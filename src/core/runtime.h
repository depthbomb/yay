#pragma once
#include "core/json.h"
#include "generated/ipc_contract.h"
#include "core/di.h"
#include <condition_variable>
#include <functional>
#include <mutex>
#include <queue>
#include <thread>

class Dispatcher
{
private:
    std::mutex m_mutex;
    std::queue<std::function<void()>> m_pending;
    std::function<void()> m_wake;
    bool m_stopped = false;

public:
    DI_INJECT(Dispatcher()) = default;
    void setWake(std::function<void()> wake);
    void post(std::function<void()> action);
    void drain();
    void stop();
};

class EventBus
{
public:
    typedef std::function<void(ipc::EventChannel, const Json&)> Listener;

private:
    Dispatcher& m_dispatcher;
    std::vector<Listener> m_listeners;

public:
    DI_INJECT(EventBus(Dispatcher& dispatcher));
    void subscribe(Listener listener);

    template <ipc::EventContract Event> void emit(const Event::Payload& payload)
    {
        forwardEvent(Event::Channel, Json(payload));
    }

    template <ipc::EventContract Event> void emit() requires std::same_as<typename Event::Payload, std::nullptr_t>
    {
        emit<Event>(nullptr);
    }

    // Forward existing wire payloads without discarding fields supplied by external services.
    void forwardEvent(ipc::EventChannel channel, Json payload) const;
};

class WorkerPool
{
private:
    std::mutex m_mutex;
    std::condition_variable_any m_ready;
    std::queue<std::function<void()>> m_work;
    std::vector<std::jthread> m_threads;
    bool m_stopping = false;

public:
    DI_INJECT(WorkerPool());
    ~WorkerPool();
    void submit(std::function<void()> action);
    void stop();
};
