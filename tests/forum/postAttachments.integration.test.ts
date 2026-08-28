import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readSource = (relativePath: string) => readFileSync(
  resolve(process.cwd(), relativePath),
  "utf8",
);

describe("forum post attachment integration", () => {
  it("keeps image selection in the Markdown editor and exposes one file picker below", () => {
    const postMessage = readSource("components/forum/PostMessage.vue");

    expect(postMessage).not.toContain("imageInput");
    expect(postMessage).not.toContain("forum.create.upload.addImages");
    expect(postMessage).toContain('@click="openAttachmentPicker"');
    expect(postMessage).toContain('@change="handleAttachmentInput"');
    expect(postMessage).toContain("!file.type.startsWith('image/')");
    expect(postMessage).toContain("forum.create.upload.imageUseEditor");
  });

  it("removes an attachment from the draft before requesting server cleanup", () => {
    const postMessage = readSource("components/forum/PostMessage.vue");
    const removeBlock = postMessage.slice(
      postMessage.indexOf("const removeAttachment ="),
      postMessage.indexOf("const materializeMarkdown ="),
    );

    expect(removeBlock).toContain("item.removed = true");
    expect(removeBlock).toContain("removeMarkdownReference(item)");
    expect(removeBlock).toContain("attachments.value = attachments.value.filter");
    expect(removeBlock).toContain("queueDraftCleanup(item.record.id)");
    expect(removeBlock.indexOf("attachments.value = attachments.value.filter"))
      .toBeLessThan(removeBlock.indexOf("queueDraftCleanup(item.record.id)"));
  });

  it("cleans up an upload that finishes after its draft item was removed", () => {
    const postMessage = readSource("components/forum/PostMessage.vue");
    const uploadBlock = postMessage.slice(
      postMessage.indexOf("const uploadAttachment ="),
      postMessage.indexOf("const addFiles ="),
    );

    expect(uploadBlock).toContain("if (item.removed)");
    expect(uploadBlock).toContain("queueDraftCleanup(record.id)");
    expect(uploadBlock).toContain("if (item.removed) return");
  });

  it("ships matching Chinese and English guidance for the revised flow", () => {
    const zh = JSON.parse(readSource("i18n/locales/zh.json"));
    const en = JSON.parse(readSource("i18n/locales/en.json"));

    for (const key of ["title", "hint", "addFiles", "imageUseEditor", "cleanupDeferred"]) {
      expect(zh.forum.create.upload[key]).toBeTruthy();
      expect(en.forum.create.upload[key]).toBeTruthy();
    }
    expect(zh.forum.create.upload.addImages).toBeUndefined();
    expect(en.forum.create.upload.addImages).toBeUndefined();
  });

  it("distinguishes local preparation from network upload progress", () => {
    const postMessage = readSource("components/forum/PostMessage.vue");
    const zh = JSON.parse(readSource("i18n/locales/zh.json"));
    const en = JSON.parse(readSource("i18n/locales/en.json"));

    expect(postMessage).toContain("onPhase: (phase)");
    expect(postMessage).toContain("item.phase === 'preparing'");
    expect(postMessage).toContain("item.phase === 'uploading' ? item.progress : undefined");

    for (const key of ["processingAttachments", "preparingAttachments", "uploadingAttachments", "verifyingAttachments"]) {
      expect(zh.forum.create.actions[key]).toBeTruthy();
      expect(en.forum.create.actions[key]).toBeTruthy();
    }
    for (const key of ["queued", "preparing", "signing", "uploading", "verifying", "ready"]) {
      expect(zh.forum.create.upload.status[key]).toBeTruthy();
      expect(en.forum.create.upload.status[key]).toBeTruthy();
    }
  });
});
