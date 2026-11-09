import type { PublicShortcode } from "../../src/core/contracts/settings";

/** Published template fixtures; production reads the applied backend catalog. */
export const backendShortcodes: readonly PublicShortcode[] = [
  {
    id: "15184599-2f9b-541f-a81f-439ce0ea0e8f",
    name: "notice",
    title: "提示框",
    description: "提示、成功、警告或错误信息。",
    kind: "container",
    parameters: [
      {
        name: "title",
        label: "标题",
        type: "text",
        default: "提示",
        required: false,
        options: [],
      },
      {
        name: "type",
        label: "类型",
        type: "select",
        default: "info",
        required: false,
        options: ["info", "success", "warning", "error"],
      },
    ],
    html: '<aside class="ef-sc-151845992f9b541fa81f439ce0ea0e8f-notice" data-variant="{{type}}"><strong>{{title}}</strong><div>{{content}}</div></aside>',
    css: '.ef-sc-151845992f9b541fa81f439ce0ea0e8f .ef-sc-151845992f9b541fa81f439ce0ea0e8f-notice{padding:1em 1.25em;border-radius:8px;border-left:4px solid #5b7bcc;background:#5b7bcc14;}.ef-sc-151845992f9b541fa81f439ce0ea0e8f .ef-sc-151845992f9b541fa81f439ce0ea0e8f-notice[data-variant="success"]{border-color:#24966b;background:#24966b14;}.ef-sc-151845992f9b541fa81f439ce0ea0e8f .ef-sc-151845992f9b541fa81f439ce0ea0e8f-notice[data-variant="warning"]{border-color:#c18a18;background:#c18a1814;}.ef-sc-151845992f9b541fa81f439ce0ea0e8f .ef-sc-151845992f9b541fa81f439ce0ea0e8f-notice[data-variant="error"]{border-color:#c95151;background:#c9515114;}.ef-sc-151845992f9b541fa81f439ce0ea0e8f .ef-sc-151845992f9b541fa81f439ce0ea0e8f-notice > strong{display:block;margin-bottom:.4em;}.ef-sc-151845992f9b541fa81f439ce0ea0e8f .ef-sc-151845992f9b541fa81f439ce0ea0e8f-notice p:last-child{margin-bottom:0;}',
    scope: "ef-sc-151845992f9b541fa81f439ce0ea0e8f",
    revision: 1,
    media_urls: {},
  },
  {
    id: "c9df582f-05fa-5804-a01c-d13b9d11b73d",
    name: "accordion",
    title: "折叠内容",
    description: "可由读者展开的详细说明。",
    kind: "container",
    parameters: [
      {
        name: "title",
        label: "标题",
        type: "text",
        default: "展开查看",
        required: false,
        options: [],
      },
    ],
    html: '<details class="ef-sc-c9df582f05fa5804a01cd13b9d11b73d-accordion"><summary>{{title}}</summary><div class="ef-sc-c9df582f05fa5804a01cd13b9d11b73d-body">{{content}}</div></details>',
    css: ".ef-sc-c9df582f05fa5804a01cd13b9d11b73d .ef-sc-c9df582f05fa5804a01cd13b9d11b73d-accordion{border:1px solid #8885;border-radius:8px;padding:.8em 1em;}.ef-sc-c9df582f05fa5804a01cd13b9d11b73d .ef-sc-c9df582f05fa5804a01cd13b9d11b73d-accordion > summary{cursor:pointer;font-weight:600;}.ef-sc-c9df582f05fa5804a01cd13b9d11b73d .ef-sc-c9df582f05fa5804a01cd13b9d11b73d-body{padding-top:.8em;}.ef-sc-c9df582f05fa5804a01cd13b9d11b73d .ef-sc-c9df582f05fa5804a01cd13b9d11b73d-body p:last-child{margin-bottom:0;}",
    scope: "ef-sc-c9df582f05fa5804a01cd13b9d11b73d",
    revision: 1,
    media_urls: {},
  },
];
