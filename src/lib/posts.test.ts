import { afterEach, describe, expect, it } from "vitest";
import { createPost, deletePost, getPostBySlug } from "./posts";

const slug = "vitest-undefined-fields";

describe("createPost", () => {
  afterEach(async () => {
    await deletePost(slug).catch(() => undefined);
  });

  it("writes posts when optional frontmatter fields are omitted", async () => {
    await createPost({
      title: "Optional Fields",
      slug,
      date: "2026-07-10",
      tags: [],
      published: true,
      content: "Body",
    });

    await expect(getPostBySlug(slug)).resolves.toMatchObject({
      slug,
      title: "Optional Fields",
      content: "Body",
    });
  });
});
