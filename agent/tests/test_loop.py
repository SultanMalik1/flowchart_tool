import json

import pytest
from langchain_core.messages import AIMessageChunk
from langchain_core.messages.tool import tool_call_chunk

from flowchart_agent.loop import (
    INVISIBLE_MESSAGE,
    REPAIR_MESSAGE,
    iter_agent_events,
    langchain_messages,
)


class Chunk:
    def __init__(self, content="", tool_call_chunks=None, tool_calls=None):
        self.content = content
        self.tool_call_chunks = tool_call_chunks or []
        self.tool_calls = tool_calls or []


class ScriptedModel:
    def __init__(self, rounds):
        self.rounds = rounds
        self.calls = 0
        self.bound = None
        self.seen = []

    def bind_tools(self, tools):
        self.bound = tools
        return self

    async def astream(self, messages):
        self.seen.append(messages)
        chunks = self.rounds[self.calls]
        self.calls += 1
        for chunk in chunks:
            yield chunk


async def collect(prepared, model, run_tool):
    events = []
    async for event in iter_agent_events(prepared, model, run_tool):
        events.append(event)
    return events


def prepared():
    return {
        "instructions": "You are FlowchartAgent.",
        "messages": "USER:\nAdd a step",
        "tools": [{"name": "generate_flowchart", "description": "draw", "parameters": {}}],
    }


@pytest.mark.asyncio
async def test_text_answer_finishes_without_a_command():
    model = ScriptedModel([[Chunk(content="The start node is Submit.")]])
    events = await collect(prepared(), model, None)
    assert events == [
        {"type": "text", "content": "The start node is Submit."},
        {"type": "finish", "toolCallsCompleted": False},
    ]


@pytest.mark.asyncio
async def test_one_successful_command_stops_the_loop():
    async def run_tool(name, tool_input):
        assert name == "generate_flowchart"
        assert tool_input["action"] == "patch"
        return {
            "ok": True,
            "hasVisibleShapes": True,
            "command": {"kind": "drawio-command", "operation": "patch", "title": "Refund"},
        }

    model = ScriptedModel(
        [
            [
                Chunk(content="I will rename the supervisor step."),
                Chunk(
                    tool_call_chunks=[
                        {
                            "index": 0,
                            "id": "call-1",
                            "name": "generate_flowchart",
                            "args": json.dumps({"action": "patch", "diagramType": "flowchart"}),
                        }
                    ]
                ),
            ],
            [Chunk(content="This second turn must not run.")],
        ]
    )
    events = await collect(prepared(), model, run_tool)
    assert model.calls == 1
    assert events[0] == {"type": "text", "content": "I will rename the supervisor step."}
    assert {"type": "progress", "stage": "building"} in events
    assert {"type": "progress", "stage": "preparing"} in events
    command = next(event for event in events if event["type"] == "tool-call")
    assert command["toolName"] == "generate_flowchart"
    assert command["args"]["title"] == "Refund"
    assert events[-1] == {"type": "finish", "toolCallsCompleted": True}


@pytest.mark.asyncio
async def test_two_tool_errors_can_be_repaired_and_the_third_stops():
    attempts = {"count": 0}

    async def run_tool(_name, _tool_input):
        attempts["count"] += 1
        return {"ok": False, "message": "Node close_ticket does not exist"}

    failure = [
        Chunk(
            tool_calls=[
                {
                    "id": "call-x",
                    "name": "generate_flowchart",
                    "args": {"action": "patch"},
                }
            ]
        )
    ]
    model = ScriptedModel([failure, failure, failure])
    events = await collect(prepared(), model, run_tool)
    assert attempts["count"] == 3
    assert events[-1] == {"type": "error", "error": REPAIR_MESSAGE}


@pytest.mark.asyncio
async def test_invisible_create_is_rejected_after_the_command():
    async def run_tool(_name, _tool_input):
        return {
            "ok": True,
            "hasVisibleShapes": False,
            "command": {"kind": "drawio-command", "operation": "create"},
        }

    model = ScriptedModel(
        [
            [
                Chunk(
                    tool_calls=[
                        {
                            "id": "call-1",
                            "name": "generate_flowchart",
                            "args": {"action": "create"},
                        }
                    ]
                )
            ]
        ]
    )
    events = await collect(prepared(), model, run_tool)
    assert events[-1] == {"type": "error", "error": INVISIBLE_MESSAGE}
    assert any(event["type"] == "tool-call" for event in events)


@pytest.mark.asyncio
async def test_follow_up_call_keeps_the_gemini_thought_signature():
    signature = "c2lnbmF0dXJl"
    first = AIMessageChunk(
        content="Checking the drawing guide.",
        tool_call_chunks=[
            tool_call_chunk(
                name="skill",
                args='{"name": "drawio-native"}',
                id="call-1",
                index=0,
            )
        ],
        additional_kwargs={
            "__gemini_function_call_thought_signatures__": {"call-1": signature}
        },
    )
    model = ScriptedModel([[first], [Chunk(content="The diagram is a review flow.")]])

    async def run_tool(_name, _tool_input):
        return {"ok": True, "content": "Reference text"}

    await collect(prepared(), model, run_tool)
    replayed = model.seen[1]
    assistant = next(
        message
        for message in replayed
        if "__gemini_function_call_thought_signatures__"
        in getattr(message, "additional_kwargs", {})
    )
    assert (
        assistant.additional_kwargs["__gemini_function_call_thought_signatures__"][
            "call-1"
        ]
        == signature
    )


def test_image_message_uses_a_langchain_image_block():
    messages = langchain_messages(
        "instructions",
        [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "Rebuild this"},
                    {"type": "image", "image": "data:image/png;base64,abc"},
                ],
            }
        ],
    )
    content = messages[1].content
    assert content[0] == {"type": "text", "text": "Rebuild this"}
    assert content[1] == {
        "type": "image_url",
        "image_url": {"url": "data:image/png;base64,abc"},
    }


@pytest.mark.asyncio
async def test_disconnect_emits_aborted():
    class DisconnectingModel:
        def bind_tools(self, _tools):
            return self

        async def astream(self, _messages):
            yield Chunk(content="Working")

    async def disconnected():
        return True

    events = []
    async for event in iter_agent_events(
        prepared(), DisconnectingModel(), None, disconnected
    ):
        events.append(event)
    assert events == [{"type": "aborted"}]
