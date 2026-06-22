"""Human-in-the-loop planning review routes."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.domain.reviews.store import (
    build_review_packet,
    create_review,
    get_review,
    review_exists,
    update_review,
)
from app.schemas.review import (
    CreateHumanReviewRequest,
    HumanReviewRecord,
    ReviewPacket,
    UpdateHumanReviewRequest,
)

router = APIRouter(prefix="/api/reviews")


@router.post("", response_model=HumanReviewRecord)
def create_human_review(payload: CreateHumanReviewRequest) -> HumanReviewRecord:
    return create_review(payload)


@router.get("/{review_id}", response_model=HumanReviewRecord)
def read_human_review(review_id: str) -> HumanReviewRecord:
    _raise_if_missing(review_id)
    return get_review(review_id)


@router.patch("/{review_id}", response_model=HumanReviewRecord)
def patch_human_review(
    review_id: str,
    payload: UpdateHumanReviewRequest,
) -> HumanReviewRecord:
    _raise_if_missing(review_id)
    return update_review(review_id, payload)


@router.get("/{review_id}/packet", response_model=ReviewPacket)
def export_human_review_packet(review_id: str) -> ReviewPacket:
    _raise_if_missing(review_id)
    return build_review_packet(review_id)


def _raise_if_missing(review_id: str) -> None:
    if not review_exists(review_id):
        raise HTTPException(status_code=404, detail="Review record not found.")
