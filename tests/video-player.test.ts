import assert from "node:assert/strict";
import test from "node:test";
import { DomUtils, parseDocument } from "htmlparser2";
import { renderContent } from "../src/core/rendering/content";
import { videoDefaults } from "../src/core/video/player";
import { standaloneVideo, videoCall } from "../src/core/video/shortcode";

const mediaId = "646efdd6-2b1a-43f3-a32a-29a79ab60506";
const media = { [mediaId]: { original: "/media/sample.mp4" } };
const render = (
  content: string,
  type: "html" | "markdown",
  videoPreview = false,
) =>
  renderContent(
    {
      id: "video-test",
      content: [{ id: "first", type, content }],
      media_urls: media,
    },
    [],
    { videoPreview },
  );

test("video block round trips options and public rendering resolves the media reference", () => {
  const values = {
    ...videoDefaults,
    source: `site://media/${mediaId}`,
    title: '说明 "第二段" <样片>',
    max_width: 800,
    autoplay: true,
    loop: true,
  };
  const call = videoCall(values);
  assert.deepEqual(standaloneVideo(call), values);
  assert.equal(standaloneVideo("<p>正文</p>" + call), null);
  const rendered = render(call, "html");
  const video = DomUtils.findOne(
    (node) => node.name === "video",
    parseDocument(rendered.html).children,
  );
  assert.equal(video?.attribs.src, media[mediaId].original);
  assert.equal(video?.attribs["aria-label"], values.title);
  for (const attribute of [
    "autoplay",
    "muted",
    "loop",
    "playsinline",
    "controls",
  ]) {
    assert.ok(Object.hasOwn(video?.attribs ?? {}, attribute));
  }
  assert.match(rendered.html, /max-inline-size:800px/);
  assert.doesNotMatch(
    render(call, "markdown", true).html,
    /<video[^>]+\sautoplay/,
  );
});

test("trusted shortcode embeds allowlisted players and raw HTML cannot create an iframe", () => {
  const youtube = videoCall({
    ...videoDefaults,
    source: "https://youtu.be/M7lc1UVf-VE?autoplay=1",
    loop: true,
  });
  const bili = videoCall({
    ...videoDefaults,
    source: "https://www.bilibili.com/video/BV1B7411m7LV/?p=2&autoplay=1",
  });
  const raw =
    '<iframe src="https://www.youtube-nocookie.com/embed/M7lc1UVf-VE"></iframe><div data-ef-video="spoof"></div>';
  const html = render([raw, youtube, bili].join("\n\n"), "markdown").html;
  const urls = DomUtils.findAll(
    (node) => node.name === "iframe",
    parseDocument(html).children.filter((node) => node.type === "tag"),
  ).map(({ attribs }) => new URL(attribs.src));
  assert.deepEqual(
    urls.map((url) => url.hostname),
    ["www.youtube-nocookie.com", "player.bilibili.com"],
  );
  assert.equal(urls[0].searchParams.get("playlist"), "M7lc1UVf-VE");
  assert.equal(urls[1].searchParams.get("p"), "2");
  assert.ok(urls.every((url) => url.searchParams.get("autoplay") === "0"));
  assert.doesNotMatch(html, /data-ef-video/);
});
