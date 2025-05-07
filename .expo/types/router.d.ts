/* eslint-disable */
import * as Router from 'expo-router';

export * from 'expo-router';

declare module 'expo-router' {
  export namespace ExpoRouter {
    export interface __routes<T extends string | object = string> {
      hrefInputParams: { pathname: Router.RelativePathString, params?: Router.UnknownInputParams } | { pathname: Router.ExternalPathString, params?: Router.UnknownInputParams } | { pathname: `/admin-dashboard`; params?: Router.UnknownInputParams; } | { pathname: `/`; params?: Router.UnknownInputParams; } | { pathname: `/lecturer-dashboard`; params?: Router.UnknownInputParams; } | { pathname: `/manage-courses`; params?: Router.UnknownInputParams; } | { pathname: `/manage-users`; params?: Router.UnknownInputParams; } | { pathname: `/student-dashboard`; params?: Router.UnknownInputParams; } | { pathname: `/_sitemap`; params?: Router.UnknownInputParams; };
      hrefOutputParams: { pathname: Router.RelativePathString, params?: Router.UnknownOutputParams } | { pathname: Router.ExternalPathString, params?: Router.UnknownOutputParams } | { pathname: `/admin-dashboard`; params?: Router.UnknownOutputParams; } | { pathname: `/`; params?: Router.UnknownOutputParams; } | { pathname: `/lecturer-dashboard`; params?: Router.UnknownOutputParams; } | { pathname: `/manage-courses`; params?: Router.UnknownOutputParams; } | { pathname: `/manage-users`; params?: Router.UnknownOutputParams; } | { pathname: `/student-dashboard`; params?: Router.UnknownOutputParams; } | { pathname: `/_sitemap`; params?: Router.UnknownOutputParams; };
      href: Router.RelativePathString | Router.ExternalPathString | `/admin-dashboard${`?${string}` | `#${string}` | ''}` | `/${`?${string}` | `#${string}` | ''}` | `/lecturer-dashboard${`?${string}` | `#${string}` | ''}` | `/manage-courses${`?${string}` | `#${string}` | ''}` | `/manage-users${`?${string}` | `#${string}` | ''}` | `/student-dashboard${`?${string}` | `#${string}` | ''}` | `/_sitemap${`?${string}` | `#${string}` | ''}` | { pathname: Router.RelativePathString, params?: Router.UnknownInputParams } | { pathname: Router.ExternalPathString, params?: Router.UnknownInputParams } | { pathname: `/admin-dashboard`; params?: Router.UnknownInputParams; } | { pathname: `/`; params?: Router.UnknownInputParams; } | { pathname: `/lecturer-dashboard`; params?: Router.UnknownInputParams; } | { pathname: `/manage-courses`; params?: Router.UnknownInputParams; } | { pathname: `/manage-users`; params?: Router.UnknownInputParams; } | { pathname: `/student-dashboard`; params?: Router.UnknownInputParams; } | { pathname: `/_sitemap`; params?: Router.UnknownInputParams; };
    }
  }
}
