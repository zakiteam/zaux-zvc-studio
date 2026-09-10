import ZVCHelper from "@zx_core/common/helpers/zvc.helper";
import meta from "./IntroHero.meta";
import defaults from "./data/IntroHero.defaults";

export default {
  ...meta,
  buildNode(data, params = {}) {
    data = { ...defaults, ...data };
    const gv = (path) => ZVCHelper.getValue(data, path);
    const nodeObject = {
      meta: {
        ZVCName: meta?.ZVCName,
      },
      node: {
        name: "ComponentsRenderer",
        props: {
          components: [
            {
              name: "div",
              props: {
                class: "min-h-[600px] md:h-screen pt-28 md:pt-0 w-full relative",
              },
              children: [
                {
                  name: "Zimg",
                  props: {
                    class: "absolute inset-0",
                    src: gv("imgSrc") ?? "https://placehold.co/1920x1080",
                  },
                },
                {
                  name: "div",
                  props: {
                    class:
                      "relative z-20 bg-gradient-heavy-dark flex flex-col justify-end pb-6 md:pb-16 h-full min-h-[inherit]",
                  },
                  children: [
                    {
                      name: "div",
                      props: {
                        class: "container-m mx-auto flex flex-col gap-8",
                      },
                      children: [
                        {
                          name: "Breadcrumbs",
                          props: {
                            theme: "dark1",
                            size: "s",
                            crumbs: [
                              {
                                iconOnly: true,
                                icon: "home",
                                title: "Homepage",
                                href: "#homepage",
                              },
                              {
                                title: "Link 0",
                                href: "#link0",
                              },
                              {
                                title: "Link 1",
                                href: "#link1",
                              },
                            ],
                          },
                        },
                        {
                          name: "IntroText",
                          props: {
                            size : gv('introSize') ?? "l",
                            theme: gv("introTheme") ?? "dark1",
                            title: gv("title") ?? "Lorem ipsum dolor sit amet",
                            subtitle:
                              gv("subtitle") ??
                              "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
                            excerpt:
                              gv("excerpt") ??
                              "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
                          },
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    };
    return ZVCHelper.renderNode(nodeObject, data, params, meta);
  },
};