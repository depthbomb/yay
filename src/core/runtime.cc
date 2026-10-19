#include "core/runtime.h"

void Dispatcher::setWake(std::function<void()> wake)
{
    std::lock_guard lock(m_mutex);
    m_wake = std::move(wake);
}

void Dispatcher::post(std::function<void()> action)
{
    std::lock_guard lock(m_mutex);
    if (m_stopped)
    {
        return;
    }

    m_pending.push(std::move(action));
    if (m_wake)
    {
        m_wake();
    }
}

void Dispatcher::drain()
{
    std::queue<std::function<void()>> pending;
    {
        std::lock_guard lock(m_mutex);
        pending.swap(m_pending);
    }

    while (!pending.empty())
    {
        auto action = std::move(pending.front());
        pending.pop();
        action();
    }
}

void Dispatcher::stop()
{
    std::lock_guard lock(m_mutex);
    m_stopped = true;
    m_wake = {};
    m_pending = {};
}

EventBus::EventBus(Dispatcher& dispatcher) : m_dispatcher(dispatcher) {}

void EventBus::subscribe(Listener listener)
{
    m_listeners.push_back(std::move(listener));
}

void EventBus::forwardEvent(const ipc::EventChannel channel, Json payload) const
{
    m_dispatcher.post(
        [this, channel, payload = std::move(payload)]
        {
            for (const auto& listener : m_listeners)
            {
                listener(channel, payload);
            }
        });
}

WorkerPool::WorkerPool()
{
    for (int i = 0; i < 3; ++i)
    {
        m_threads.emplace_back(
            [this](const std::stop_token& stop)
            {
                for (;;)
                {
                    std::function<void()> action;
                    {
                        std::unique_lock lock(m_mutex);
                        m_ready.wait(lock,
                                     stop,
                                     [this]
                                     {
                                         return !m_work.empty();
                                     });
                        if (stop.stop_requested())
                        {
                            return;
                        }

                        action = std::move(m_work.front());
                        m_work.pop();
                    }

                    action();
                }
            });
    }
}

WorkerPool::~WorkerPool()
{
    stop();
}

void WorkerPool::submit(std::function<void()> action)
{
    std::lock_guard lock(m_mutex);
    if (m_stopping)
    {
        return;
    }

    m_work.push(std::move(action));
    m_ready.notify_one();
}

void WorkerPool::stop()
{
    {
        std::lock_guard lock(m_mutex);
        m_stopping = true;
        m_work = {};
    }

    for (auto& thread : m_threads)
    {
        thread.request_stop();
    }

    m_ready.notify_all();
    m_threads.clear();
}
