"""FastAPI chat route. The sidebar posts the same body it posted to Next.js."""

from __future__ import annotations

import json
import os
import uuid
from collections.abc import AsyncIterator
from pathlib import Path
from typing import Any

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response, StreamingResponse
from langchain_google_genai import ChatGoogleGenerativeAI

from flowchart_agent.loop import ClientDisconnected, iter_agent_events

ROOT = Path(__file__).resolve().parents[2]
load_dotenv(ROOT / ".env.local")
load_dotenv(ROOT / ".env")

app = FastAPI()

_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
extra_origin = os.environ.get("FLOWCHART_WEB_ORIGIN", "").strip()
if extra_origin:
    _origins.append(extra_origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_methods=["POST", "OPTIONS"],
    allow_headers=["Content-Type"],
    expose_headers=["X-Flowchart-Request-Id"],
)


def agent_token() -> str:
    configured = os.environ.get("FLOWCHART_AGENT_TOKEN", "").strip()
    if configured:
        return configured
    if os.environ.get("NODE_ENV") == "production":
        return ""
    return "dev-flowchart-agent"


def next_base() -> str:
    return os.environ.get("FLOWCHART_NEXT_URL", "http://127.0.0.1:3000").rstrip("/")


def auth_headers() -> dict[str, str]:
    return {
        "Content-Type": "application/json",
        "X-Flowchart-Agent-Token": agent_token(),
    }


def build_model(prepared: dict[str, Any]) -> ChatGoogleGenerativeAI:
    settings = prepared.get("modelSettings") or {}
    thinking = prepared.get("thinking") or {}
    kwargs: dict[str, Any] = {
        "model": prepared["modelId"],
        "google_api_key": os.environ.get("GOOGLE_GENERATIVE_AI_API_KEY"),
        "temperature": settings.get("temperature", 0.35),
        "max_output_tokens": settings.get("maxOutputTokens", 32768),
        "max_retries": settings.get("maxRetries", 1),
    }
    if "thinkingBudget" in thinking:
        kwargs["thinking_budget"] = thinking["thinkingBudget"]
    if "thinkingLevel" in thinking:
        kwargs["thinking_level"] = thinking["thinkingLevel"]
    return ChatGoogleGenerativeAI(**kwargs)


def _sse(event: Any) -> str:
    if event == "[DONE]":
        return "data: [DONE]\n\n"
    return f"data: {json.dumps(event)}\n\n"


@app.post("/v1/chat/flowchart")
async def chat(request: Request) -> Response:
    raw = await request.body()
    timeout = httpx.Timeout(300.0, connect=10.0)
    client = httpx.AsyncClient(timeout=timeout)
    try:
        prepared_response = await client.post(
            f"{next_base()}/api/ai/chat/flowchart/prepare",
            content=raw,
            headers=auth_headers(),
        )
    except httpx.HTTPError:
        await client.aclose()
        return JSONResponse(
            {
                "error": "Internal server error",
                "message": "Diagram service is unavailable.",
            },
            status_code=502,
        )
    request_id = prepared_response.headers.get("x-flowchart-request-id") or str(
        uuid.uuid4()
    )
    if prepared_response.status_code != 200:
        await client.aclose()
        return Response(
            content=prepared_response.content,
            status_code=prepared_response.status_code,
            headers={
                "Content-Type": "application/json",
                "X-Flowchart-Request-Id": request_id,
            },
        )
    prepared = prepared_response.json()

    async def run_tool(name: str, tool_input: dict[str, Any]) -> dict[str, Any]:
        if name == "generate_flowchart":
            response = await client.post(
                f"{next_base()}/api/ai/chat/flowchart/command",
                json={"document": prepared["nativeDocument"], "input": tool_input},
                headers=auth_headers(),
            )
        else:
            response = await client.post(
                f"{next_base()}/api/ai/chat/flowchart/skill",
                json={"name": name, "input": tool_input},
                headers=auth_headers(),
            )
        try:
            payload = response.json()
        except json.JSONDecodeError:
            return {"ok": False, "message": "Diagram service returned invalid JSON"}
        if response.status_code != 200 or payload.get("error") is True:
            return {
                "ok": False,
                "message": str(payload.get("message") or "Tool execution failed"),
            }
        if name == "generate_flowchart":
            return {
                "ok": True,
                "command": payload.get("command"),
                "hasVisibleShapes": payload.get("hasVisibleShapes", True),
            }
        return {"ok": True, "content": payload.get("content", "")}

    async def events() -> AsyncIterator[str]:
        try:
            model = build_model(prepared)
            async for event in iter_agent_events(
                prepared,
                model,
                run_tool,
                request.is_disconnected,
            ):
                yield _sse(event)
        except ClientDisconnected:
            yield _sse({"type": "aborted"})
        except Exception as error:
            message = str(error) or "Agent stream failed."
            yield _sse({"type": "error", "error": message})
        finally:
            await client.aclose()
        yield _sse("[DONE]")

    return StreamingResponse(
        events(),
        headers={
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
            "X-Flowchart-Request-Id": request_id,
        },
    )
