// Makes `import App from "./App.vue"` resolve under PLAIN tsc.
//
// vue-tsc does not need this: it resolves single-file components for real and
// takes the actual component's type in preference to this wildcard. Plain tsc
// cannot parse a `.vue` file at all, and the root `tsc --build` in
// `pnpm typecheck` is plain tsc — without this declaration the frontend project
// fails to build the moment the entry point imports its own root component.
//
// The type is deliberately the generic `DefineComponent` rather than something
// narrower: anything more specific here would be a SECOND, hand-maintained
// description of a component vue-tsc already types correctly, and the two would
// disagree silently.
declare module "*.vue" {
  import type { DefineComponent } from "vue";

  const component: DefineComponent<Record<string, unknown>, unknown, unknown>;
  export default component;
}
