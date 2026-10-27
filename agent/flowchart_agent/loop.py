"""LangChain tool-calling loop for the flowchart sidebar.

The diagram compiler stays in TypeScript. This loop only calls the model,
the skill guides, and the command endpoint.
"""

from __future__ import annotations

import json
from collections.abc import AsyncIterator, Awaitable, Callable
from typing import Any

from langchain_core.messages import (
    AIMessage,
    AIMessageChunk,
    HumanMessage,
    SystemMessage,
    ToolMessage,
)


MAX_STEPS = 5
MAX_TOOL_ERRORS = 2
REPAIR_MESSAGE = "Could not repair this diagram. Please retry."
EMPTY_RESULT_MESSAGE = "AI task produced no usable result"
INVISIBLE_MESSAGE = "The diagram has no visible editable shapes. Please retry."


class ClientDisconnected(Exception):
    pass


def visible_text(content: Any) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts: list[str] = []
        for part in content:
            if isinstance(part, str):
                parts.append(part)
            elif isinstance(part, dict) and part.get("type") == "text":
                parts.append(str(part.get("text") or ""))
        return "".join(parts)
    return ""


def langchain_messages(instructions: str, shaped: Any) -> list[Any]:
    """Turn the Mastra-shaped payload into LangChain messages, including images."""
    if isinstance(shaped, str):
        return [SystemMessage(content=instructions), HumanMessage(content=shaped)]
    if not isinstance(shaped, list) or not shaped:
        raise ValueError("Prepared messages are empty")
    content = shaped[0].get("content")
    if not isinstance(content, list):
        text = content if isinstance(content, str) else ""
        return [SystemMessage(content=instructions), HumanMessage(content=text)]
    blocks: list[dict[str, Any]] = []
    for part in content:
        if not isinstance(part, dict):
            continue
        if part.get("type") == "text":
            blocks.append({"type": "text", "text": str(part.get("text") or "")})
        elif part.get("type") == "image":
            url = part.get("image")
            if isinstance(url, str) and url:
                blocks.append({"type": "image_url", "image_url": {"url": url}})
    if not any(block.get("type") == "image_url" for block in blocks):
        raise ValueError("Image mode supports exactly one image")
    return [SystemMessage(content=instructions), HumanMessage(content=blocks)]


def _merge_tool_call(slot: dict[str, Any], chunk: dict[str, Any]) -> None:
    if chunk.get("id"):
        slot["id"] = str(chunk["id"])
    name = chunk.get("name")
    if name:
        slot["name"] = str(name)
    args = chunk.get("args")
    if isinstance(args, str):
        slot["args_text"] = str(slot.get("args_text") or "") + args
    elif isinstance(args, dict) and args:
        slot["args"] = args


def _completed_calls(calls: dict[int, dict[str, Any]]) -> list[dict[str, Any]]:
    completed: list[dict[str, Any]] = []
    for index in sorted(calls):
        slot = calls[index]
        name = str(slot.get("name") or "")
        if not name:
            continue
        if isinstance(slot.get("args"), dict):
            args = slot["args"]
        else:
            raw = str(slot.get("args_text") or "").strip() or "{}"
            try:
                parsed = json.loads(raw)
            except json.JSONDecodeError as error:
                parsed = {"__parse_error": str(error), "__raw": raw}
            args = parsed if isinstance(parsed, dict) else {"value": parsed}
        completed.append(
            {
                "id": str(slot.get("id") or f"call-{index}"),
                "name": name,
                "args": args,
            }
        )
    return completed


def _calls_from_gathered(message: AIMessageChunk | None) -> list[dict[str, Any]]:
    """Use the streamed message so its Gemini thought signatures stay attached."""
    if message is None:
        return []
    completed: list[dict[str, Any]] = []
    for index, tool_call in enumerate(message.tool_calls or []):
        name = str(tool_call.get("name") or "")
        if not name:
            continue
        args = tool_call.get("args")
        if isinstance(args, str):
            try:
                args = json.loads(args or "{}")
            except json.JSONDecodeError as error:
                args = {"__parse_error": str(error)}
        if not isinstance(args, dict):
            args = {}
        completed.append(
            {
                "id": str(tool_call.get("id") or f"call-{index}"),
                "name": name,
                "args": args,
            }
        )
    return completed


async def iter_agent_events(
    prepared: dict[str, Any],
    model: Any,
    run_tool: Callable[[str, dict[str, Any]], Awaitable[dict[str, Any]]],
    is_disconnected: Callable[[], Awaitable[bool]] | None = None,
) -> AsyncIterator[dict[str, Any]]:
    """Yield the sidebar events for one chat turn. The caller appends [DONE]."""
    messages = langchain_messages(prepared["instructions"], prepared["messages"])
    bound = model.bind_tools(prepared["tools"])
    tool_errors = 0
    saw_text = False
    completed_command = False
    visible = True

    async def disconnected() -> bool:
        if is_disconnected is None:
            return False
        return await is_disconnected()

    for _step in range(MAX_STEPS):
        if await disconnected():
            yield {"type": "aborted"}
            return
        calls: dict[int, dict[str, Any]] = {}
        text_parts: list[str] = []
        announced: set[int] = set()
        gathered: AIMessageChunk | None = None
        try:
            async for chunk in bound.astream(messages):
                if isinstance(chunk, AIMessageChunk):
                    gathered = chunk if gathered is None else gathered + chunk
                if await disconnected():
                    yield {"type": "aborted"}
                    return
                text = visible_text(getattr(chunk, "content", ""))
                if text:
                    saw_text = True
                    text_parts.append(text)
                    yield {"type": "text", "content": text}
                partials = list(getattr(chunk, "tool_call_chunks", None) or [])
                full_calls = [] if partials else list(getattr(chunk, "tool_calls", None) or [])
                for index, tool_chunk in enumerate(partials):
                    slot_index = int(tool_chunk.get("index", index) or 0)
                    slot = calls.setdefault(slot_index, {})
                    _merge_tool_call(slot, tool_chunk)
                    if (
                        slot.get("name") == "generate_flowchart"
                        and slot_index not in announced
                    ):
                        announced.add(slot_index)
                        yield {"type": "progress", "stage": "building"}
                for index, tool_chunk in enumerate(full_calls):
                    slot = calls.setdefault(index, {})
                    _merge_tool_call(slot, tool_chunk)
                    if tool_chunk.get("name") == "generate_flowchart" and index not in announced:
                        announced.add(index)
                        yield {"type": "progress", "stage": "building"}
        except ClientDisconnected:
            yield {"type": "aborted"}
            return

        tool_calls = _calls_from_gathered(gathered) or _completed_calls(calls)
        if not tool_calls:
            if not saw_text:
                yield {"type": "error", "error": EMPTY_RESULT_MESSAGE}
                return
            yield {"type": "finish", "toolCallsCompleted": False}
            return

        if gathered is not None and gathered.tool_calls:
            messages.append(gathered)
        else:
            messages.append(
                AIMessage(
                    content="".join(text_parts),
                    tool_calls=[
                        {"id": call["id"], "name": call["name"], "args": call["args"]}
                        for call in tool_calls
                    ],
                )
            )
        stop_after_step = False
        for call in tool_calls:
            if await disconnected():
                yield {"type": "aborted"}
                return
            if call["name"] == "generate_flowchart":
                yield {"type": "progress", "stage": "preparing"}
            if "__parse_error" in call["args"]:
                result = {
                    "ok": False,
                    "message": f"Error executing tool {call['name']}: {call['args']['__parse_error']}",
                }
            else:
                result = await run_tool(call["name"], call["args"])
            if result.get("ok"):
                if call["name"] == "generate_flowchart":
                    completed_command = True
                    visible = bool(result.get("hasVisibleShapes", True))
                    yield {
                        "type": "tool-call",
                        "toolCallId": call["id"],
                        "toolName": "generate_flowchart",
                        "args": result["command"],
                    }
                    stop_after_step = True
                content = result.get("content", result.get("command"))
                if not isinstance(content, str):
                    content = json.dumps(content)
                messages.append(
                    ToolMessage(content=content, tool_call_id=call["id"])
                )
                continue

            tool_errors += 1
            message = str(result.get("message") or "Tool execution failed")
            if not message.startswith("Error executing tool"):
                message = f"Error executing tool {call['name']}: {message}"
            messages.append(ToolMessage(content=message, tool_call_id=call["id"]))
            if tool_errors > MAX_TOOL_ERRORS:
                yield {"type": "error", "error": REPAIR_MESSAGE}
                return

        if stop_after_step:
            if completed_command and not visible:
                yield {"type": "error", "error": INVISIBLE_MESSAGE}
                return
            yield {"type": "finish", "toolCallsCompleted": True}
            return

    if completed_command and not visible:
        yield {"type": "error", "error": INVISIBLE_MESSAGE}
        return
    if not completed_command and not saw_text:
        yield {"type": "error", "error": EMPTY_RESULT_MESSAGE}
        return
    yield {"type": "finish", "toolCallsCompleted": completed_command}
