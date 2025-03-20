import { action, mutation } from "./_generated/server";
import { query } from "./_generated/server";
import { Doc } from "./_generated/dataModel";

export const list = query(async (ctx): Promise<Doc<"messages">[]> => {
  return await ctx.db.query("messages").collect();
});

export const siteUrl = query({
  args: {},
  handler: async (ctx, args) => {
    return process.env.CONVEX_SITE_URL;
  },
});

export const send = mutation(
  async (ctx, { body, author }: { body: string; author: string }) => {
    const message = { body, author };
    await ctx.db.insert("messages", message);
  },
);

export const abortedFetch = action({
  args: {},
  handler: async (ctx, args) => {
    const controller = new AbortController();
    const signal = controller.signal;
    const responseFuture = fetch(`${process.env.CONVEX_SITE_URL}/delayed`, { signal });

    await new Promise((resolve) => {
      setTimeout(() => {
        controller.abort();
        resolve(null);
      }, 1000);
    });

    try {
      const response = await responseFuture;
      const text = await response.text();
      return `Done! ${text}`;
    } catch (error) {
      return `Error: ${error}`;
    }
  },
});

export const abortedFetchDuringResponse = action({
  args: {},
  handler: async (ctx, args) => {
    const controller = new AbortController();
    const signal = controller.signal;
    const response = await fetch(`${process.env.CONVEX_SITE_URL}/delayedBody`, { signal });

    await new Promise((resolve) => {
      setTimeout(() => {
        controller.abort();
        resolve(null);
      }, 1000);
    });

    try {
      const text = await response.text();
      return `Done! ${text}`;
    } catch (error) {
      return `Error: ${error}`;
    }
  },
});
