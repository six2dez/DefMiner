// @vitest-environment jsdom
//
// The docblock above is per-FILE on purpose. vitest 4 removed
// `environmentMatchGlobs`, and decision P2-D4 forbids a `projects` or
// `workspace` key in vitest.config.ts — five files in this repo resolve the
// Phase 0 results directory from a bare relative literal and a per-project root
// breaks all five at once. A per-file docblock costs one line and breaks
// nothing.

import { createRequire } from "module";

import { describe, expect, it, vi } from "vitest";

import { init, MOUNT_ELEMENT_ID, PAGE_PATH, SIDEBAR_LABEL } from "./index";

const require_ = createRequire(import.meta.url);

/**
 * The prefixwrap selector, READ FROM THE POSTCSS CONFIG rather than restated.
 *
 * This is the entire point of the test below. `#plugin--defminer` appears in
 * exactly two places that must agree — the PostCSS plugin option and the mount
 * element's id — and a disagreement between them throws nothing, warns nothing
 * and logs nothing. It renders the page completely unstyled, because every rule
 * in the built stylesheet ends up scoped to an element that does not exist.
 * Restating the literal here would produce a test that passes while the
 * property it is named after is false.
 */
const postcssConfig = require_("../postcss.config.cjs") as {
  plugins: Record<string, unknown>;
};
const PREFIXWRAP_SELECTOR = postcssConfig.plugins["postcss-prefixwrap"];

type AddPageOptions = {
  body: HTMLElement;
  topbar?: HTMLElement;
  onEnter?: () => void;
};

/**
 * A stub SDK carrying only the three members `init` touches.
 *
 * Cast at each call site through `unknown` rather than typed as the real
 * `Caido` object: the full SDK has some forty sub-SDKs, none of which `init`
 * reads, and stubbing them would be forty pieces of fiction guarding two
 * assertions.
 */
function stubSdk() {
  const addPage = vi.fn<(path: string, options: AddPageOptions) => void>();
  const registerItem = vi.fn(() => ({ setCount: vi.fn() }));

  return {
    sdk: {
      navigation: { addPage },
      sidebar: { registerItem },
      backend: {
        getArtifacts: vi.fn(() => Promise.resolve([])),
        // `onEvent` IS PART OF THE MINIMAL SURFACE NOW. The page subscribes the
        // coalescer on mount (UI-07), and a stub without it makes `init` throw
        // where the real SDK would not — the same reason the three members
        // above are here rather than the whole forty-sub-SDK object.
        onEvent: vi.fn(() => ({ stop: vi.fn() })),
      },
    },
    addPage,
    registerItem,
  };
}

describe("init", () => {
  it("registers the page with an HTMLElement body, not a component", () => {
    const { sdk, addPage } = stubSdk();

    // structurally narrower than the full Caido SDK on purpose; widening it to
    // the real type would mean stubbing ~40 unrelated sub-SDKs to assert two
    // calls.
    init(sdk as unknown as Parameters<typeof init>[0]);

    expect(addPage).toHaveBeenCalledTimes(1);
    const [path, options] = addPage.mock.calls[0];

    expect(path).toBe(PAGE_PATH);

    // Research P-03: `addPage` is typed `{ body: HTMLElement }`. Passing a
    // component object satisfies neither the runtime nor the operator, and it
    // fails INSIDE Caido rather than at build time — which is why this is
    // asserted rather than assumed.
    expect(options.body).toBeInstanceOf(HTMLElement);
  });

  it("mounts on an element whose id is the prefixwrap root from postcss.config.cjs", () => {
    const { sdk, addPage } = stubSdk();

    init(sdk as unknown as Parameters<typeof init>[0]);

    const [, options] = addPage.mock.calls[0];

    expect(typeof PREFIXWRAP_SELECTOR).toBe("string");
    expect(PREFIXWRAP_SELECTOR as string).toMatch(/^#/);
    expect(options.body.id).toBe((PREFIXWRAP_SELECTOR as string).slice(1));
    // And the module constant agrees with both, so a change to either side has
    // exactly one place left to hide.
    expect(options.body.id).toBe(MOUNT_ELEMENT_ID);
  });

  it("renders DefMiner's own markup inside that element", () => {
    const { sdk, addPage } = stubSdk();

    init(sdk as unknown as Parameters<typeof init>[0]);

    const [, options] = addPage.mock.calls[0];

    // The element handed to Caido is already a LIVE app, not an empty div that
    // fills in later.
    expect(options.body.children.length).toBeGreaterThan(0);
    expect(options.body.textContent).toContain("Artifacts");
  });

  it("registers exactly one sidebar item, at the page path, with no icon", () => {
    const { sdk, registerItem } = stubSdk();

    init(sdk as unknown as Parameters<typeof init>[0]);

    expect(registerItem).toHaveBeenCalledTimes(1);
    const [label, path, options] = registerItem.mock.calls[0] as unknown as [
      string,
      string,
      unknown,
    ];

    expect(label).toBe(SIDEBAR_LABEL);
    expect(path).toBe(PAGE_PATH);
    // 05-UI-SPEC.md fixes the icon library at "none". `options` being absent is
    // the assertion — an icon here would mean an icon package in the bundle.
    expect(options).toBeUndefined();
  });

  it("registers the page exactly once — two entries at one path collide, they do not merge", () => {
    const { sdk, addPage } = stubSdk();

    init(sdk as unknown as Parameters<typeof init>[0]);

    expect(addPage).toHaveBeenCalledTimes(1);
  });
});
