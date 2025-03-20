import { httpAction } from "./_generated/server";
import { v } from "convex/values";
import { httpRouter } from "convex/server";
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";

const http = httpRouter();

function monkeypatchSignal() {
  Object.defineProperty(Request.prototype, "signal", {
    get: () => new AbortSignal(),
  });
}

export const streamAi = httpAction(async (ctx, request) => {
  const prompt = `Explain the concept of AI, in as much detail as possible.
  Imagine you are a teacher who needs to fill an hour of lecture time.
  Include examples and theoretical ramblings.`;

  const stream = streamText({
    model: openai("gpt-4o"),
    prompt,
    abortSignal: request.signal,
  });

  return stream.toTextStreamResponse({
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    }
  });
});

export const delayedResponse = httpAction(async (ctx, request) => {
  //const signal = request.signal;

  return new Promise((resolve, reject) => {
    // Set up timeout for 3 seconds
    const timeoutId = setTimeout(() => {
      console.log("Request completed after 3 seconds");
      resolve(new Response("Request completed after 3 seconds", {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        }
      }));
    }, 3000);

    /*
    // Handle request cancellation
    signal.addEventListener("abort", () => {
      clearTimeout(timeoutId);
      console.log("Request was cancelled by the client");
      reject(new Error("Request was cancelled"));
    });
    */
  });
});

import schema from "../convex/schema";
// authorTable is "users"
const authorTable = schema.tables.messages.validator.fields.author.kind;

export const delayedCancel = httpAction(async (ctx, request) => {
  // monkeypatchSignal();
  console.log("starting delayedCancel");
  const signal = request.signal;

  return new Promise((resolve, reject) => {
    // Set up timeout for 5 seconds
    const timeoutId = setTimeout(() => {
      console.log("Request completed after 3 seconds");
      resolve(new Response("Request completed after 3 seconds", {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        }
      }));
    }, 3000);

    signal.addEventListener("abort", () => {
      clearTimeout(timeoutId);
      console.log("Request was cancelled by the client");
      resolve(new Response("Request was cancelled by the client", {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        }
      }));
    });
  });
});

export const delayedBodyResponse = httpAction(async (ctx, request) => {
  const encoder = new TextEncoder();
  const slowBody = async (controller: ReadableStreamController<any>) => {
    controller.enqueue(encoder.encode("Hello,"));
    await new Promise((resolve) => setTimeout(resolve, 3000));
    controller.enqueue(encoder.encode(" world!"));
    controller.close();
  }

  const body = new ReadableStream({
    start(controller) {
      slowBody(controller);
    }
  });

  return new Response(body, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    }
  });
});

export const throwError = httpAction(async (ctx, request) => {
  throw new Error("This is a test error");
});

export const throwErrorBody = httpAction(async (ctx, request) => {
  const encoder = new TextEncoder();
  const body = new ReadableStream({
    async start(controller) { 
      controller.enqueue(encoder.encode("Hello,"));
      await new Promise((resolve) => setTimeout(resolve, 100));
      throw new Error("This is a test error");
    }
  });

  return new Response(body, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    }
  });
});

// Handle OPTIONS request for CORS preflight
const corsOptions = httpAction(async () => {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    }
  });
});

http.route({
  path: "/delayed",
  method: "OPTIONS",
  handler: corsOptions
});

http.route({
  path: "/delayed",
  method: "GET",
  handler: delayedResponse,
});

http.route({
  path: "/delayedBody",
  method: "GET",
  handler: delayedBodyResponse,
});

http.route({
  path: "/delayedCancel",
  method: "GET",
  handler: delayedCancel,
});

http.route({
  path: "/throwError",
  method: "GET",
  handler: throwError,
});

http.route({
  path: "/throwErrorBody",
  method: "GET",
  handler: throwErrorBody,
});

http.route({
  path: "/streamAi",
  method: "OPTIONS",
  handler: corsOptions,
});

http.route({
  path: "/streamAi",
  method: "GET",
  handler: streamAi,
});

export default http; 