"""Pydantic models for validating incoming WebSocket messages on /ws before they reach simulation_service."""

from typing import Literal

from pydantic import BaseModel


class TriggerEventMessage(BaseModel):
    type: Literal["trigger_event"]
    event_type: str
    params: dict = {}


class UpdateConfigMessage(BaseModel):
    type: Literal["update_config"]
    config: dict


class AddBottleneckMessage(BaseModel):
    type: Literal["add_bottleneck"]
    bottleneck: dict


class RemoveBottleneckMessage(BaseModel):
    type: Literal["remove_bottleneck"]
    bottleneck_id: str


class RequestOptimizationMessage(BaseModel):
    type: Literal["request_optimization"]


class RequestStateMessage(BaseModel):
    type: Literal["request_state"]


WS_MESSAGE_SCHEMAS = {
    "trigger_event": TriggerEventMessage,
    "update_config": UpdateConfigMessage,
    "add_bottleneck": AddBottleneckMessage,
    "remove_bottleneck": RemoveBottleneckMessage,
    "request_optimization": RequestOptimizationMessage,
    "request_state": RequestStateMessage,
}
