# 📋 REQUIREMENTS

We're writing the a new guide on debugging and troubleshooting dependency injection. Below is a markdown outline of the topics we want to hit. Keep in mind the writing style of approved examples provided in CLAUDE.md.

Do not write the entire guide at once. Take it one section at a time. Leave the requirements section here for now so you don't lose context.

# Debugging and troubleshooting dependency injection

Angular's dependency injection system automatically provides dependencies to your components and services. However, when configuration issues arise, understanding how to debug and troubleshoot these problems becomes essential. This guide covers common dependency injection errors, debugging techniques, and patterns to help you resolve issues effectively.

## Common dependency injection errors

### NullInjectorError: No provider for [Service]

The `NullInjectorError` occurs when Angular cannot find a provider for a requested dependency. This error appears when you try to inject a service or value that has not been registered in any injector.

#### Quick checks

- Confirm the service uses `providedIn` or is listed in the relevant `providers` array.
- Inspect the component in Angular DevTools and verify the token shows up in the **Providers** panel.
- Add a temporary `console.log` in the service constructor to ensure it instantiates in the expected injector.

#### How to resolve

- Review [Services are not available where expected](#services-are-not-available-where-expected) for examples of promoting provider scope.
- See [Missing provider configuration](#missing-provider-configuration) when the service never declares `providedIn`.

### NG0203: inject() must be called from an injection context

Angular throws NG0203 when `inject()` runs outside of Angular-managed code, such as in standalone functions or class constructors that execute before DI initializes.

#### Quick checks

- Ensure the call happens during an injection lifecycle (factory function, constructor invoked by DI, provider `useFactory`, etc.).
- Double-check that the code path is not triggered from top-level module scope.

#### How to resolve

- Move the call into a factory registered through a provider. See the [Services are not available](#services-are-not-available-where-expected) section for factory patterns.
- For utilities, accept dependencies as parameters instead of calling `inject()` directly.

### Circular dependency detected

Circular dependencies occur when two providers depend on each other, directly or indirectly, causing Angular to resolve a token before its factory is ready.

#### Quick checks

- Trace the dependency chain in error logs. Angular lists the tokens involved in the cycle.
- Look for constructors or factories that reference each other (A injects B, B injects A).

#### How to resolve

- Use [`forwardRef()`](/api/core/forwardRef) to delay the resolution of the dependency until it is needed.
- Refactor shared dependencies to be used in a new service.
- Break the cycle with optional injection and guard against `null` at runtime.
- Use signals or event emitters to share state instead of cross-injecting services.

## Common pitfalls and solutions

### Services are not available where expected

A common issue occurs when a service exists but isn't accessible where you expect it. This typically happens due to provider scope misunderstandings or missing configuration.

#### Provider scope issues

Services are only available to components within the same injector hierarchy. Standalone components inherit providers across their view tree and any projected content, but sibling elements own separate injectors.

When you provide a service at a specific level, it's only accessible to that component and its descendants unless you promote the provider to a shared scope:

```ts
@Component({
  selector: 'app-parent',
  providers: [DataStore], // DataStore provided here
  template: '<app-child></app-child>'
})
export class ParentComponent {
  dataStore = inject(DataStore); // ✅ Works
}

@Component({
  selector: 'app-child',
  template: ''
})
export class ChildComponent {
  dataStore = inject(DataStore); // ✅ Works - inherited from parent
}

@Component({
  selector: 'app-sibling',
  template: ''
})
export class SiblingComponent {
  dataStore = inject(DataStore); // ❌ Error - not in hierarchy
}
```

```ts
// ✅ Possible solution: Promote the provider so both branches see it
bootstrapApplication(AppComponent, {
  providers: [DataStore]
});
```

TIP: When something fails unexpectedly, open Angular DevTools, select the component, and review the **Providers** panel to confirm which injector supplies each token.

#### Missing provider configuration

Services without `providedIn` must be explicitly provided:

```ts
// Service without providedIn
@Injectable()
export class UserStore {
  // Store implementation
}

// ❌ Component trying to inject unavailable service
@Component({
  selector: 'app-user',
  template: ''
})
export class UserComponent {
  // Error: No provider for UserStore
  private userStore = inject(UserStore);
}

// ✅ Solution 1: Add providedIn to the service
@Injectable({
  providedIn: 'root'
})
export class UserStore {
  // Store implementation
}

// ✅ Solution 2: Provide in the component
@Component({
  selector: 'app-user',
  providers: [UserStore],
  template: ''
})
export class UserComponent {
  private userStore = inject(UserStore);
}
```

TIP: After updating the provider location, confirm the scope in Angular DevTools and add a temporary `console.log` inside `UserStore`'s constructor to verify it initializes in the expected injector.

#### Lazy-loaded routes and provider isolation

Services provided in lazy-loaded routes create separate instances:

```ts
// Lazy-loaded route configuration
export const adminRoutes: Routes = [
  {
    path: '',
    providers: [AdminStore], // New instance for this route
    children: [
      { path: 'dashboard', component: AdminDashboardComponent },
      { path: 'settings', component: AdminSettingsComponent }
    ]
  }
];

// This creates a separate AdminStore instance
// that's isolated from any root-level AdminStore
```

```ts
// ✅ Provide once at bootstrap when the service should be shared
bootstrapApplication(AppComponent, {
  providers: [AdminStore]
});
```

To share a service across lazy-loaded boundaries, use `providedIn: 'root'` or provide it at the application level.

Diagnosing route-scope issues follows the same playbook: inspect the route's injector with Angular DevTools, watch for constructor logs when navigation occurs, and confirm whether the provider lives at bootstrap or on a specific route definition.

### Multiple instances of a dependency instead of singletons

Sometimes you expect a single shared instance of a service, but end up with multiple instances. Every injector holds its own provider records, so Angular returns a fresh instance whenever the same token is registered in more than one injector hierarchy.

#### Understanding when new instances are created

Angular creates a new service instance in these scenarios:

1. **Component or directive providers** - Each element-level `providers` array produces a scoped instance tied to that element and its descendants.
2. **Route providers** - Providers declared on route definitions belong to that route tree, including lazy-loaded routes.
3. **Application bootstrap providers** - Passing providers to `bootstrapApplication()` registers fresh records on the root injector separate from library defaults.
4. **Lazy-loaded environments** - Each lazy boundary owns its own environment injector, so re-registering a token there creates an additional instance.

#### Component-level vs root-level providers

Providing a service at the component level creates a new instance for each component:

```ts
@Injectable({ providedIn: 'root' })
export class CounterStore {
  count = 0;
  increment() { this.count++; }
}

// ❌ Each component gets its own instance
@Component({
  selector: 'app-counter-a',
  providers: [CounterStore], // New instance
  template: '{{ store.count }}'
})
export class CounterAComponent {
  store = inject(CounterStore);
}

@Component({
  selector: 'app-counter-b',
  providers: [CounterStore], // Another new instance
  template: '{{ store.count }}'
})
export class CounterBComponent {
  store = inject(CounterStore);
}

// ✅ Share the root-provided instance
@Component({
  selector: 'app-counter-c',
  // No providers array - uses root instance
  template: '{{ store.count }}'
})
export class CounterCComponent {
  store = inject(CounterStore);
}
```

#### Debugging multiple instances

To verify if you're getting the same instance, add debugging code:

```ts
@Injectable()
export class DebugStore {
  private id = Math.random();

  constructor() {
    console.log(`DebugStore instance created: ${this.id}`);
  }

  getId() { return this.id; }
}
```

If you see different IDs in the console, you have multiple instances.

When diagnosing duplicate instances, take the following steps:

1. Inspect the component tree in Angular DevTools and expand the **Providers** panel to see where the token is registered.
2. Add temporary logging like the `DebugStore` example or log the injection context to confirm which injector creates the instance.
3. Use `injector.get(Token, null, InjectFlags.Optional)` (imported from `@angular/core`) in targeted tests or debug helpers to check which injector currently resolves the token.

#### Note on multi providers

Providers that use `multi: true` intentionally accumulate multiple instances or values under the same token. Receiving an array of instances in this scenario is expected behavior, not a duplication bug.

### Common injection token issues

#### Interface injection issues

TypeScript interfaces disappear at runtime, so Angular cannot use them as provider identifiers. When a constructor or factory attempts to inject an interface, Angular reports `NG0201: No provider for ...`.

- Declare an `InjectionToken` that captures the runtime identifier and optional type information.
- Provide a concrete value or factory for that token in the scope where consumers need it.
- Replace the interface injection with a call to `inject()` that references the token.

```ts
import { inject, InjectionToken } from '@angular/core';

export interface ApiConfig {
  readonly baseUrl: string;
}

export const API_CONFIG = new InjectionToken<ApiConfig>('api-config');

export class ProjectsClient {
  private readonly config = inject(API_CONFIG);
  // use config.baseUrl when composing requests
}
```

```ts
bootstrapApplication(AppComponent, {
  providers: [
    {
      provide: API_CONFIG,
      useValue: { baseUrl: 'https://api.example.com' } satisfies ApiConfig
    }
  ]
});
```

When the type widens beyond a static object, prefer `useFactory` so you can compose values lazily while remaining inside the injection context.

#### InjectionToken debugging

Tokens participate in the injector tree like services. When a resolution fails, Angular reports the token description you pass to the constructor (`'api-config'` in the example above). Provide a clear description so error messages stay actionable.

- Use [Angular DevTools](/tools/devtools) to locate the token under **Providers** and confirm which injector registers it.
- If DevTools does not show the token, add a temporary `console.log(API_CONFIG.toString())` inside the consuming class. The stringified token reveals whether the provider you expect is the one being resolved.
- For optional dependencies, call `inject(API_CONFIG, { optional: true })` and log a warning when the result is `null`. This keeps the application running while you trace provider order.

```ts
const config = inject(API_CONFIG, { optional: true });
if (!config) {
  console.warn('API_CONFIG missing from injector tree');
}
```

The `Injector.get()` helper also accepts an `InjectFlags` option that mirrors the `optional` configuration if you prefer to inspect tokens from diagnostic utilities.

#### Token naming best practices

Consistent names reduce ambiguity—especially when you maintain multiple tokens for similar concepts.

- Prefix tokens with the domain or feature (`AUTH_CONFIG`, `PAYMENTS_CLIENT_OPTIONS`).
- Include a human-readable description in the constructor so stack traces identify the token (`new InjectionToken('auth-config')`).
- Co-locate token declarations with the feature that owns them to keep providers discoverable.
- Use `multi: true` sparingly and always document the expected shape of the aggregated values; consider defining a dedicated `InjectionToken<readonly Handler[]>` to make type expectations clear.

Review the injection token guidance in the Angular documentation at https://angular.dev/guide/di/injection-token for more patterns and examples.

## Debugging dependency resolution

Resolving tough dependency issues often requires more than scanning stack traces. Pair targeted instrumentation with Angular DevTools so you can observe how the injector traverses scopes in real time.

### Using Angular DevTools

[Angular DevTools](/tools/devtools) provides deep visibility into component hierarchies and injector scopes.

1. Launch DevTools in your browser and switch to the **Angular** tab.
2. Select the component that reports the injection error. The right panel lists the **Providers** registered on that element and any parent injectors.
3. Expand each provider entry to view the concrete class, factory function, and the injector level that supplies it.

Use the search box at the top of the Providers panel to filter by token name—especially helpful when multiple tokens share similar descriptions.

### Tracing provider resolution

Angular resolves dependencies by checking the requesting injector, climbing through ancestor view injectors, and finally querying the environment injector (often the root). You can mirror this search to understand how a specific token resolves.

- Inject `EnvironmentInjector` and call `get()` with `{ skipSelf: true }` to probe specific ancestors.
- Wrap `inject()` calls in a diagnostic helper that logs the injector level whenever a token resolves.
- Use `runInInjectionContext()` when you need to run tracing code outside of component lifecycles but still leverage DI.

```ts
import { EnvironmentInjector, inject, InjectionToken, runInInjectionContext, Type } from '@angular/core';

export function traceToken<T>(
  token: InjectionToken<T> | Type<T>,
  injector: EnvironmentInjector,
): T | null {
  let resolved: T | null = null;

  console.group(`Resolving token: ${token.toString()}`);
  runInInjectionContext(injector, () => {
    resolved = inject(token, { optional: true });
  });
  console.groupEnd();

  return resolved;
}

export function expectFromAncestor<T>(
  token: InjectionToken<T> | Type<T>,
  injector: EnvironmentInjector,
): T | null {
  return injector.get(token, null, { optional: true, skipSelf: true });
}
```

Call `traceToken(API_CONFIG, someEnvironmentInjector)` from instrumentation utilities, such as a debugging panel, to confirm which injector resolves the token. Within a component or service, obtain the `EnvironmentInjector` with `inject(EnvironmentInjector)` and pass it to `expectFromAncestor(API_CONFIG, injector)` to learn whether the parent injector supplies the token or whether you must promote the provider to a broader scope.

## Summary

Dependency injection issues often stem from misunderstanding provider scope, missing configuration, or circular dependencies.

When debugging DI problems:

1. **Start with the error message** - Angular's error messages identify the missing token and injection context
2. **Use Angular DevTools** - Inspect the component tree and Providers panel to understand injector hierarchy
3. **Add strategic logging** - Temporary console logs in constructors confirm when and where services instantiate
4. **Apply injection flags** - Use `optional`, `self`, `skipSelf`, and `host` to control and test resolution behavior
5. **Trace the hierarchy** - Remember that tokens resolve from element injectors up through the root injector

Most DI issues resolve by either:

- Moving providers to the correct scope (`providedIn: 'root'` or component providers array)
- Fixing missing provider configuration
- Breaking circular dependencies with `forwardRef()` or refactoring

At the end of the day, understanding how Angular resolves dependencies can help you design cleaner architectures and debug issues faster when they arise.
