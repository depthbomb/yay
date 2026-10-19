#pragma once

#include <algorithm>
#include <cstddef>
#include <functional>
#include <memory>
#include <mutex>
#include <ranges>
#include <stdexcept>
#include <string>
#include <tuple>
#include <type_traits>
#include <typeindex>
#include <typeinfo>
#include <unordered_map>
#include <utility>
#include <vector>

// Public types and constructor metadata

#define DI_INJECT(...) using DiSignature = __VA_ARGS__; __VA_ARGS__
#define DI_INJECT_EXPLICIT(...) using DiSignature = __VA_ARGS__; explicit __VA_ARGS__
#define DI_SIGNATURE(...) using DiSignature = __VA_ARGS__

namespace di
{
    inline constexpr char LibraryName[] = "di";
    inline constexpr char LibraryVersion[] = "0.1.0";

    enum class Lifetime
    {
        Singleton,
        Scoped,
        Transient
    };

    enum class ErrorCode
    {
        MissingBinding,
        DuplicateBinding,
        DependencyCycle,
        ScopeRequired,
        CaptiveDependency,
        InvalidRequest,
        NullFactoryResult,
        BuilderConsumed,
        InvalidContainer
    };

    class InjectionError : public std::runtime_error
    {
    private:
        ErrorCode m_code;
        std::vector<std::string> m_path;

    public:
        InjectionError(const ErrorCode code, std::string message, std::vector<std::string> path = {})
            : std::runtime_error(std::move(message)), m_code(code), m_path(std::move(path)) {}

        [[nodiscard]] ErrorCode code() const noexcept
        {
            return m_code;
        }

        [[nodiscard]] const std::vector<std::string>& path() const noexcept
        {
            return m_path;
        }
    };

    struct Unqualified {};

    template<class Tag, class T>
    class Named
    {
        static_assert(!std::is_rvalue_reference_v<T>, "di::Named cannot store an rvalue reference.");

    private:
        T m_value;

    public:
        explicit Named(T value) : m_value(std::forward<T>(value)) {}

        [[nodiscard]] T& get() & noexcept
        {
            return m_value;
        }

        [[nodiscard]] const T& get() const & noexcept
        {
            return m_value;
        }

        [[nodiscard]] T&& get() && noexcept
        {
            return std::forward<T>(m_value);
        }
    };

    template<class T, class = void>
    struct ConstructorTraits {};

    template<class T>
    struct ConstructorTraits<T, std::void_t<typename T::DiSignature>>
    {
    public:
        typedef T::DiSignature Signature;
    };
}

// Injection traits

namespace di::detail
{
    template<class...>
    inline constexpr bool AlwaysFalse = false;

    template<class T>
    struct SignatureTraits
    {
    public:
        static constexpr bool Valid = false;
    };

    template<class R, class... Args>
    struct SignatureTraits<R(Args...)>
    {
    public:
        static constexpr bool Valid = true;
        typedef R Result;
        typedef std::tuple<Args...> Arguments;
    };

    template<class R, class... Args>
    struct SignatureTraits<R(Args...) noexcept> : SignatureTraits<R(Args...)> {};

    template<class R, class... Args>
    struct SignatureTraits<R (*)(Args...)> : SignatureTraits<R(Args...)> {};

    template<class R, class... Args>
    struct SignatureTraits<R (*)(Args...) noexcept> : SignatureTraits<R(Args...)> {};

    template<class C, class R, class... Args>
    struct SignatureTraits<R (C::*)(Args...)> : SignatureTraits<R(Args...)> {};

    template<class C, class R, class... Args>
    struct SignatureTraits<R (C::*)(Args...) const> : SignatureTraits<R(Args...)> {};

    template<class C, class R, class... Args>
    struct SignatureTraits<R (C::*)(Args...) noexcept> : SignatureTraits<R(Args...)> {};

    template<class C, class R, class... Args>
    struct SignatureTraits<R (C::*)(Args...) const noexcept> : SignatureTraits<R(Args...)> {};

    template<class C, class R, class... Args>
    struct SignatureTraits<R (C::*)(Args...) &> : SignatureTraits<R(Args...)> {};

    template<class C, class R, class... Args>
    struct SignatureTraits<R (C::*)(Args...) const &> : SignatureTraits<R(Args...)> {};

    template<class C, class R, class... Args>
    struct SignatureTraits<R (C::*)(Args...) & noexcept> : SignatureTraits<R(Args...)> {};

    template<class C, class R, class... Args>
    struct SignatureTraits<R (C::*)(Args...) const & noexcept> : SignatureTraits<R(Args...)> {};

    template<class F, class = void>
    struct CallableTraits : SignatureTraits<F> {};

    template<class F>
    struct CallableTraits<F, std::void_t<decltype(&F::operator())>> : SignatureTraits<decltype(&F::operator())> {};

    template<class T, class = void>
    struct InjectionTraits : SignatureTraits<void> {};

    template<class T>
    struct InjectionTraits<T, std::void_t<typename ConstructorTraits<T>::Signature>>
        : SignatureTraits<typename ConstructorTraits<T>::Signature> {};

    template<class T>
    struct SharedTraits
    {
    public:
        static constexpr bool Value = false;
    };

    template<class T>
    struct SharedTraits<std::shared_ptr<T>>
    {
    public:
        static constexpr bool Value = true;
        typedef T Element;
    };

    template<class T>
    struct UniqueTraits
    {
    public:
        static constexpr bool Value = false;
    };

    template<class T, class D>
    struct UniqueTraits<std::unique_ptr<T, D>>
    {
    public:
        static constexpr bool Value = true;
        typedef T Element;
        typedef D Deleter;
    };

    template<class T>
    struct NamedTraits
    {
    public:
        static constexpr bool Value = false;
    };

    template<class Tag, class T>
    struct NamedTraits<Named<Tag, T>>
    {
    public:
        static constexpr bool Value = true;
        typedef Tag Qualifier;
        typedef T Request;
    };
}

// Registry and lifetime state

namespace di
{
    class Container;
    class ContainerBuilder;
}

namespace di::detail
{
    struct Key
    {
    public:
        std::type_index type;
        std::type_index tag;

        bool operator==(const Key&) const = default;
    };

    struct KeyHash
    {
    public:
        std::size_t operator()(const Key& key) const noexcept
        {
            return key.type.hash_code() ^ (key.tag.hash_code() + 0x9e3779b9U + (key.type.hash_code() << 6U));
        }
    };

    typedef std::shared_ptr<const void> SharedObject;
    typedef std::unique_ptr<void, void (*)(void*)> UniqueObject;

    template<class T, class Tag>
    Key makeKey()
    {
        return {.type = typeid(std::remove_cv_t<T>), .tag = typeid(Tag)};
    }

    inline std::string describeKey(const Key& key)
    {
        std::string result = key.type.name();
        if (key.tag != typeid(Unqualified))
        {
            result += " [";
            result += key.tag.name();
            result += "]";
        }

        return result;
    }

    template<class T>
    UniqueObject eraseUnique(std::unique_ptr<T> object)
    {
        return UniqueObject(object.release(), [](void* pointer)
        {
            delete static_cast<T*>(pointer);
        });
    }

    struct Binding
    {
    public:
        Lifetime lifetime;
        bool readOnly;
        std::function<SharedObject(Container&)> makeShared;
        std::function<UniqueObject(Container&)> makeUnique;
        bool borrowOnly = false;
        std::size_t cacheIndex = 0;
    };

    typedef std::unordered_map<Key, Binding, KeyHash> Registry;

    inline std::size_t indexBindings(Registry& registry, const Lifetime lifetime)
    {
        std::size_t count = 0;
        for (auto& binding : registry | std::views::values)
        {
            if (binding.lifetime == lifetime)
            {
                binding.cacheIndex = count++;
            }
        }

        return count;
    }

    class Cache
    {
    private:
        std::vector<SharedObject> m_objects;
        std::vector<std::size_t> m_creationOrder;
        const std::size_t m_size;

    public:
        explicit Cache(const std::size_t size) : m_size(size) {}
        Cache(const Cache&) = delete;
        Cache& operator=(const Cache&) = delete;

        ~Cache()
        {
            // References inside a service may still need its dependencies during destruction.
            while (!m_creationOrder.empty())
            {
                m_objects[m_creationOrder.back()].reset();
                m_creationOrder.pop_back();
            }
        }

        [[nodiscard]] const SharedObject& find(const std::size_t index)
        {
            // Allocate once on first use, keeping unused scopes cheap and slot references stable during resolution.
            if (m_objects.empty())
            {
                m_objects.resize(m_size);
            }

            return m_objects[index];
        }

        void insert(const std::size_t index, SharedObject object)
        {
            m_creationOrder.push_back(index);
            m_objects[index] = std::move(object);
        }
    };

    struct Frame
    {
    public:
        Key key;
        Lifetime lifetime;
    };

    struct Runtime
    {
    public:
        std::unique_ptr<Registry> registry;
        std::recursive_mutex mutex;
        std::vector<Frame> active;
        const std::size_t scopeSize;
        Cache singletons;

        explicit Runtime(std::unique_ptr<Registry> bindings) : registry(std::move(bindings)),
            scopeSize(indexBindings(*registry, Lifetime::Scoped)),
            singletons(indexBindings(*registry, Lifetime::Singleton)) {}

        [[noreturn]] void fail(const ErrorCode code, std::string message, const Key* requested = nullptr) const
        {
            std::vector<std::string> path;
            for (const auto& key : active | std::views::transform(&Frame::key))
            {
                path.push_back(describeKey(key));
            }

            if (requested != nullptr)
            {
                path.push_back(describeKey(*requested));
            }

            if (!path.empty())
            {
                message += "\nDependency path: ";
                for (std::size_t index = 0; index < path.size(); ++index)
                {
                    if (index != 0)
                    {
                        message += " -> ";
                    }
                    message += path[index];
                }
            }

            throw InjectionError(code, std::move(message), std::move(path));
        }
    };

    class ResolutionFrame
    {
    private:
        Runtime& m_runtime;

    public:
        ResolutionFrame(Runtime& runtime, const Key& key, const Lifetime lifetime) : m_runtime(runtime)
        {
            if (const auto cycle = std::ranges::find(runtime.active, key, &Frame::key); cycle != runtime.active.end())
            {
                runtime.fail(ErrorCode::DependencyCycle, "di: dependency cycle detected.", &key);
            }

            runtime.active.push_back({.key = key, .lifetime = lifetime});
        }

        ResolutionFrame(const ResolutionFrame&) = delete;
        ResolutionFrame& operator=(const ResolutionFrame&) = delete;

        ~ResolutionFrame()
        {
            m_runtime.active.pop_back();
        }
    };
}

// Container

namespace di
{
    class Container
    {
        friend class ContainerBuilder;

    private:
        std::shared_ptr<detail::Runtime> m_runtime;
        std::shared_ptr<detail::Cache> m_scope;

        explicit Container(std::shared_ptr<detail::Runtime> runtime, std::shared_ptr<detail::Cache> scope = {})
            : m_runtime(std::move(runtime)), m_scope(std::move(scope)) {}

    public:
        Container(const Container&) = delete;
        Container& operator=(const Container&) = delete;
        Container(Container&&) noexcept = default;

        Container& operator=(Container&& other) noexcept
        {
            if (this != &other)
            {
                // Release scoped objects before the singleton dependencies they can borrow.
                m_scope.reset();
                m_runtime.reset();
                m_runtime = std::move(other.m_runtime);
                m_scope = std::move(other.m_scope);
            }

            return *this;
        }

        ~Container() = default;

        template<class T>
        [[nodiscard]] T get()
        {
            ensureValid();
            const std::lock_guard lock(m_runtime->mutex);
            return resolve<T, Unqualified>();
        }

        template<class T, class Tag>
        [[nodiscard]] T getNamed()
        {
            ensureValid();
            const std::lock_guard lock(m_runtime->mutex);
            return resolve<T, Tag>();
        }

        template<class T>
        [[nodiscard]] T create()
        {
            ensureValid();
            const std::lock_guard lock(m_runtime->mutex);

            if constexpr (detail::SharedTraits<T>::Value)
            {
                typedef typename detail::SharedTraits<T>::Element Element;
                const detail::ResolutionFrame frame(*m_runtime, detail::makeKey<Element, Unqualified>(), Lifetime::Transient);
                return constructShared<std::remove_const_t<Element>>();
            }
            else if constexpr (detail::UniqueTraits<T>::Value)
            {
                typedef typename detail::UniqueTraits<T>::Element Element;
                static_assert(std::is_same_v<typename detail::UniqueTraits<T>::Deleter, std::default_delete<Element>>,
                    "di::create supports unique_ptr with its default deleter.");
                const detail::ResolutionFrame frame(*m_runtime, detail::makeKey<Element, Unqualified>(), Lifetime::Transient);
                return constructUnique<std::remove_const_t<Element>>();
            }
            else
            {
                static_assert(!std::is_reference_v<T> && !std::is_pointer_v<T> && !std::is_const_v<T>,
                    "di::create requires a value, shared_ptr, or unique_ptr request.");
                const detail::ResolutionFrame frame(*m_runtime, detail::makeKey<T, Unqualified>(), Lifetime::Transient);
                return constructValue<T>();
            }
        }

        [[nodiscard]] Container createScope() const
        {
            ensureValid();
            return Container(m_runtime, std::make_shared<detail::Cache>(m_runtime->scopeSize));
        }

    private:
        void ensureValid() const
        {
            if (!m_runtime)
            {
                throw InjectionError(ErrorCode::InvalidContainer, "di: cannot use a moved-from container.");
            }
        }

        [[nodiscard]] const detail::Binding& findBinding(const detail::Key& key, const bool mutableRequest) const
        {
            const auto found = m_runtime->registry->find(key);
            if (found == m_runtime->registry->end())
            {
                m_runtime->fail(ErrorCode::MissingBinding, "di: no binding for " + detail::describeKey(key) + ".", &key);
            }

            const detail::Binding& binding = found->second;
            if (mutableRequest && binding.readOnly)
            {
                m_runtime->fail(ErrorCode::InvalidRequest, "di: a const instance cannot satisfy a mutable request.", &key);
            }

            if (binding.lifetime == Lifetime::Scoped)
            {
                if (std::ranges::contains(m_runtime->active, Lifetime::Singleton, &detail::Frame::lifetime))
                {
                    m_runtime->fail(ErrorCode::CaptiveDependency, "di: a singleton cannot depend on a scoped service.", &key);
                }

                if (!m_scope)
                {
                    m_runtime->fail(ErrorCode::ScopeRequired, "di: this service requires an explicit scope.", &key);
                }
            }

            return binding;
        }

        template<class T, class Tag, bool Borrowed = false>
        [[nodiscard]] auto resolveShared(
            const bool mutableRequest,
            const bool owningRequest = false
        )
        {
            const detail::Key key = detail::makeKey<T, Tag>();
            const detail::Binding& binding = findBinding(key, mutableRequest);
            if (owningRequest && binding.borrowOnly)
            {
                m_runtime->fail(ErrorCode::InvalidRequest,
                    "di: a borrowed instance cannot provide shared ownership; register it with bindShared instead.", &key);
            }

            if (Borrowed && binding.lifetime == Lifetime::Transient)
            {
                m_runtime->fail(ErrorCode::InvalidRequest,
                    "di: transient services cannot be borrowed; request a value or owning pointer.", &key);
            }

            detail::Cache* cache = nullptr;
            if (binding.lifetime == Lifetime::Singleton)
            {
                cache = &m_runtime->singletons;
            }
            else if (binding.lifetime == Lifetime::Scoped)
            {
                cache = m_scope.get();
            }

            detail::SharedObject transient;
            const detail::SharedObject& object = cache != nullptr ? cache->find(binding.cacheIndex) : transient;
            if (!object)
            {
                const detail::ResolutionFrame frame(*m_runtime, key, binding.lifetime);
                transient = binding.makeShared(*this);
                if (!transient)
                {
                    m_runtime->fail(ErrorCode::NullFactoryResult, "di: factory returned a null pointer.");
                }

                if (cache != nullptr)
                {
                    cache->insert(binding.cacheIndex, std::move(transient));
                }
            }

            // Mutable access was checked against the binding before removing erased constness.
            T* pointer = static_cast<T*>(const_cast<void*>(object.get()));
            if constexpr (Borrowed)
            {
                return pointer;
            }
            else
            {
                if (cache != nullptr)
                {
                    return std::shared_ptr<T>(object, pointer);
                }

                return std::shared_ptr<T>(std::move(transient), pointer);
            }
        }

        template<class T, class Tag>
        [[nodiscard]] std::unique_ptr<T> resolveUnique()
        {
            const detail::Key key = detail::makeKey<T, Tag>();
            const detail::Binding& binding = findBinding(key, !std::is_const_v<T>);
            if (binding.lifetime != Lifetime::Transient)
            {
                m_runtime->fail(ErrorCode::InvalidRequest,
                    "di: unique ownership requires a transient binding; use shared_ptr or a reference for cached services.",
                    &key);
            }

            const detail::ResolutionFrame frame(*m_runtime, key, binding.lifetime);
            if (!binding.makeUnique)
            {
                m_runtime->fail(ErrorCode::InvalidRequest, "di: this factory cannot transfer unique ownership.");
            }

            detail::UniqueObject object = binding.makeUnique(*this);
            if (!object)
            {
                m_runtime->fail(ErrorCode::NullFactoryResult, "di: factory returned a null pointer.");
            }

            return std::unique_ptr<T>(static_cast<T*>(object.release()));
        }

        template<class T, class Tag>
        [[nodiscard]] T resolve()
        {
            typedef std::remove_cvref_t<T> Plain;
            static_assert(!std::is_rvalue_reference_v<T> && !std::is_pointer_v<Plain>,
                "Raw pointers and rvalue references are not injected; use T&, shared_ptr<T>, or unique_ptr<T>.");

            if constexpr (detail::NamedTraits<Plain>::Value)
            {
                static_assert(!std::is_reference_v<T>, "di::Named parameters must be passed by value.");
                typedef detail::NamedTraits<Plain> NamedInfo;
                static_assert(!detail::NamedTraits<std::remove_cvref_t<typename NamedInfo::Request>>::Value,
                    "Nested di::Named requests are not supported.");
                return T(resolve<typename NamedInfo::Request, typename NamedInfo::Qualifier>());
            }
            else if constexpr (std::is_lvalue_reference_v<T>)
            {
                static_assert(!detail::SharedTraits<Plain>::Value && !detail::UniqueTraits<Plain>::Value,
                    "Pass injected smart pointers by value; use T& to borrow the service itself.");
                typedef std::remove_reference_t<T> Element;
                return *resolveShared<Element, Tag, true>(!std::is_const_v<Element>);
            }
            else if constexpr (detail::SharedTraits<Plain>::Value)
            {
                typedef typename detail::SharedTraits<Plain>::Element Element;
                static_assert(!std::is_array_v<Element>, "Array services are not supported.");
                return resolveShared<Element, Tag>(!std::is_const_v<Element>, true);
            }
            else if constexpr (detail::UniqueTraits<Plain>::Value)
            {
                typedef typename detail::UniqueTraits<Plain>::Element Element;
                static_assert(!std::is_array_v<Element>, "Array services are not supported.");
                static_assert(std::is_same_v<typename detail::UniqueTraits<Plain>::Deleter, std::default_delete<Element>>,
                    "Injected unique_ptr requests must use the default deleter.");
                return resolveUnique<Element, Tag>();
            }
            else
            {
                static_assert(!std::is_pointer_v<T> && !std::is_reference_v<T>,
                    "Raw pointers and rvalue references are not injected; use T&, shared_ptr<T>, or unique_ptr<T>.");
                static_assert(std::is_copy_constructible_v<Plain>,
                    "Value injection requires a copyable type; request unique_ptr<T> for move-only services.");
                return Plain(*resolveShared<const Plain, Tag>(false));
            }
        }

        template<class Arguments, class Callback>
        decltype(auto) withArguments(Callback&& callback)
        {
            return [&]<class... Args>(std::type_identity<std::tuple<Args...>>) -> decltype(auto)
            {
                // List initialization resolves dependencies in declaration order.
                std::tuple<Args...> arguments{resolve<Args, Unqualified>()...};
                return std::apply(std::forward<Callback>(callback), std::move(arguments));
            }(std::type_identity<Arguments>{});
        }

        template<class T, class Callback>
        decltype(auto) withConstructor(Callback&& callback)
        {
            typedef detail::InjectionTraits<T> Traits;
            if constexpr (Traits::Valid)
            {
                static_assert(std::is_same_v<T, typename Traits::Result>,
                    "The injection signature must name the class being constructed.");
                return withArguments<typename Traits::Arguments>(std::forward<Callback>(callback));
            }
            else
            {
                static_assert(detail::AlwaysFalse<T>,
                    "Missing injection metadata: add DI_INJECT, DI_SIGNATURE, ConstructorTraits, or use bindFactory.");
            }
        }

        template<class T>
        [[nodiscard]] T constructValue()
        {
            return withConstructor<T>([]<class... Args>(Args&&... arguments) -> T
            {
                static_assert(std::is_constructible_v<T, Args...>,
                    "The injection signature does not match an accessible constructor.");
                return T(std::forward<Args>(arguments)...);
            });
        }

        template<class T>
        [[nodiscard]] std::shared_ptr<T> constructShared()
        {
            return withConstructor<T>([]<class... Args>(Args&&... arguments)
            {
                static_assert(std::is_constructible_v<T, Args...>,
                    "The injection signature does not match an accessible constructor.");
                return std::make_shared<T>(std::forward<Args>(arguments)...);
            });
        }

        template<class T>
        [[nodiscard]] std::unique_ptr<T> constructUnique()
        {
            return withConstructor<T>([]<class... Args>(Args&&... arguments)
            {
                static_assert(std::is_constructible_v<T, Args...>,
                    "The injection signature does not match an accessible constructor.");
                return std::make_unique<T>(std::forward<Args>(arguments)...);
            });
        }

        template<class F>
        decltype(auto) invokeFactory(F& factory)
        {
            typedef detail::CallableTraits<F> Traits;
            return withArguments<typename Traits::Arguments>([&factory]<class... Args>(Args&&... arguments) -> decltype(auto)
            {
                return std::invoke(factory, std::forward<Args>(arguments)...);
            });
        }
    };

}

// Container builder

namespace di
{
    class ContainerBuilder
    {
    private:
        std::unique_ptr<detail::Registry> m_bindings;

    public:
        ContainerBuilder() : m_bindings(std::make_unique<detail::Registry>()) {}
        ContainerBuilder(const ContainerBuilder&) = delete;
        ContainerBuilder& operator=(const ContainerBuilder&) = delete;
        ContainerBuilder(ContainerBuilder&&) noexcept = default;
        ContainerBuilder& operator=(ContainerBuilder&&) noexcept = default;
        ~ContainerBuilder() = default;

        template<class Service, class Implementation = Service, class Tag = Unqualified>
        ContainerBuilder& bind(const Lifetime lifetime = Lifetime::Singleton)
        {
            static_assert(std::is_same_v<Service, std::remove_cvref_t<Service>>,
                "Register an unqualified service type.");
            static_assert(std::is_convertible_v<Implementation*, Service*>,
                "The implementation must be publicly and unambiguously convertible to the service.");

            detail::Binding binding{lifetime, false,
                [](Container& container) -> detail::SharedObject
                {
                    std::shared_ptr<Service> object = container.constructShared<Implementation>();
                    return object;
                }, {}};

            if constexpr (std::is_same_v<Service, Implementation> || std::has_virtual_destructor_v<Service>)
            {
                binding.makeUnique = [](Container& container)
                {
                    std::unique_ptr<Service> object = container.constructUnique<Implementation>();
                    return detail::eraseUnique(std::move(object));
                };
            }

            addBinding(detail::makeKey<Service, Tag>(), std::move(binding));
            return *this;
        }

        template<class Service, class Tag = Unqualified, class F>
        ContainerBuilder& bindFactory(F&& factory, const Lifetime lifetime = Lifetime::Singleton)
        {
            static_assert(std::is_same_v<Service, std::remove_cvref_t<Service>>,
                "Register an unqualified service type.");
            typedef std::decay_t<F> Callable;
            typedef detail::CallableTraits<Callable> Traits;

            if constexpr (Traits::Valid)
            {
                typedef typename Traits::Result Result;
                static_assert(!std::is_reference_v<Result>, "Factories must return a value or an owning pointer.");
                constexpr bool returnsValue = std::is_same_v<std::remove_cv_t<Result>, Service>;
                constexpr bool returnsPointer = std::is_convertible_v<Result, std::shared_ptr<Service>>;
                static_assert(returnsValue || returnsPointer,
                    "A factory must return the service value or a shared_ptr/unique_ptr convertible to the service.");

                if constexpr (std::is_pointer_v<Callable>)
                {
                    if (factory == nullptr)
                    {
                        throw InjectionError(ErrorCode::InvalidRequest, "di: cannot bind a null factory function.");
                    }
                }

                auto callable = std::make_shared<Callable>(std::forward<F>(factory));
                detail::Binding binding{lifetime, false,
                    [callable](Container& container) -> detail::SharedObject
                    {
                        if constexpr (returnsValue)
                        {
                            return std::make_shared<Service>(container.invokeFactory(*callable));
                        }
                        else
                        {
                            std::shared_ptr<Service> object = container.invokeFactory(*callable);
                            return object;
                        }
                    }, {}};

                if constexpr (returnsValue)
                {
                    binding.makeUnique = [callable](Container& container)
                    {
                        return detail::eraseUnique(std::make_unique<Service>(container.invokeFactory(*callable)));
                    };
                }
                else if constexpr (detail::UniqueTraits<Result>::Value)
                {
                    typedef typename detail::UniqueTraits<Result>::Element Element;
                    if constexpr (
                        std::is_same_v<typename detail::UniqueTraits<Result>::Deleter, std::default_delete<Element>> &&
                        std::is_convertible_v<Result, std::unique_ptr<Service>> &&
                        (std::is_same_v<Service, Element> || std::has_virtual_destructor_v<Service>)
                    )
                    {
                        binding.makeUnique = [callable](Container& container)
                        {
                            std::unique_ptr<Service> object = container.invokeFactory(*callable);
                            return detail::eraseUnique(std::move(object));
                        };
                    }
                }

                addBinding(detail::makeKey<Service, Tag>(), std::move(binding));
            }
            else
            {
                static_assert(detail::AlwaysFalse<Callable>,
                    "Use a factory with one concrete signature; wrap generic or overloaded callables in a typed lambda.");
            }

            return *this;
        }

        template<class Service, class Tag = Unqualified>
        ContainerBuilder& bindInstance(Service& instance)
        {
            const auto object = std::shared_ptr<Service>(std::addressof(instance), [](Service*) {});
            detail::Binding binding{Lifetime::Singleton, std::is_const_v<Service>,
                [object](Container&) -> detail::SharedObject
                {
                    return object;
                }, {}, true};
            addBinding(detail::makeKey<Service, Tag>(), std::move(binding));
            return *this;
        }

        template<class Service, class Tag = Unqualified>
        ContainerBuilder& bindInstance(Service&&) = delete;

        template<class Service, class Tag = Unqualified>
        ContainerBuilder& bindShared(std::shared_ptr<Service> instance)
        {
            static_assert(!std::is_array_v<Service>, "Array services are not supported.");
            if (!instance)
            {
                throw InjectionError(ErrorCode::NullFactoryResult, "di: cannot bind a null shared instance.");
            }

            detail::Binding binding{Lifetime::Singleton, std::is_const_v<Service>,
                [instance = std::move(instance)](Container&) -> detail::SharedObject
                {
                    return instance;
                }, {}};
            addBinding(detail::makeKey<Service, Tag>(), std::move(binding));
            return *this;
        }

        template<class Service, class Tag = Unqualified>
        ContainerBuilder& bindValue(Service value)
        {
            return bindShared<Service, Tag>(std::make_shared<Service>(std::move(value)));
        }

        [[nodiscard]] Container build()
        {
            ensureValid();
            return Container(std::make_shared<detail::Runtime>(std::move(m_bindings)));
        }

    private:
        void ensureValid() const
        {
            if (!m_bindings)
            {
                throw InjectionError(ErrorCode::BuilderConsumed, "di: this builder has already been built or moved.");
            }
        }

        void addBinding(const detail::Key& key, detail::Binding binding) const
        {
            ensureValid();
            if (
                binding.lifetime != Lifetime::Singleton &&
                binding.lifetime != Lifetime::Scoped &&
                binding.lifetime != Lifetime::Transient
            )
            {
                throw InjectionError(ErrorCode::InvalidRequest, "di: unknown service lifetime.");
            }

            if (const auto [position, inserted] = m_bindings->emplace(key, std::move(binding)); !inserted)
            {
                throw InjectionError(ErrorCode::DuplicateBinding,
                    "di: duplicate binding for " + detail::describeKey(position->first) + ".");
            }
        }
    };
}
