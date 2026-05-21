// reservation-hold.ts — schemas for the reservation_holds lifecycle
// (create / update / heartbeat / cancel) and the post-payment confirm
// path. Phase C input-validation rollout (2026-05-20).

import { z } from "zod";
import { BoundedText, PositiveInt, Uuid } from "./base.ts";

export const CreateReservationHoldSchema = z.object({
  restaurant_id: Uuid,
  shift_id: Uuid,
  date_time: BoundedText(64),
  party_size: PositiveInt(30),
  source: BoundedText(40).optional(),
  idempotency_key: BoundedText(128).optional(),
  event_id: Uuid.optional(),
  promotion_id: Uuid.optional(),
  applied_promo_code: BoundedText(64).optional(),
});
export type CreateReservationHoldInput = z.infer<
  typeof CreateReservationHoldSchema
>;

export const UpdateReservationHoldSchema = z.object({
  hold_id: Uuid,
  full_name: BoundedText(120).optional(),
  email: BoundedText(254).optional(),
  phone: BoundedText(40).optional(),
  cart_snapshot: z.unknown().optional(),
  total_amount_cents: z.number().int().nonnegative().max(10_000_000).optional(),
  special_request: BoundedText(500).optional(),
  dietary_notes: BoundedText(500).optional(),
  occasion: BoundedText(100).optional(),
  seating_preference: BoundedText(200).optional(),
});
export type UpdateReservationHoldInput = z.infer<
  typeof UpdateReservationHoldSchema
>;

export const HeartbeatReservationHoldSchema = z.object({
  hold_id: Uuid,
  extend_seconds: z.number().int().positive().max(3600).optional(),
});
export type HeartbeatReservationHoldInput = z.infer<
  typeof HeartbeatReservationHoldSchema
>;

export const CancelReservationHoldSchema = z.object({
  hold_id: Uuid,
});
export type CancelReservationHoldInput = z.infer<
  typeof CancelReservationHoldSchema
>;

export const ConfirmHoldPaidSchema = z.object({
  hold_id: Uuid,
  payment_intent_id: BoundedText(200).regex(
    /^pi_[A-Za-z0-9_]+$/,
    "payment_intent_id must start with pi_",
  ),
});
export type ConfirmHoldPaidInput = z.infer<typeof ConfirmHoldPaidSchema>;

export const CheckInGuestSchema = z.object({
  reservation_id: Uuid,
});
export type CheckInGuestInput = z.infer<typeof CheckInGuestSchema>;

export const CloseBillSchema = z.object({
  order_id: Uuid,
  tip_amount: z.number().finite().nonnegative().max(10000).optional(),
  payment_method: BoundedText(40).optional(),
});
export type CloseBillInput = z.infer<typeof CloseBillSchema>;

export const ConfirmDepositStubSchema = z.object({
  payment_id: Uuid,
  outcome: z.enum(["charged", "failed"]).optional(),
});
export type ConfirmDepositStubInput = z.infer<typeof ConfirmDepositStubSchema>;
