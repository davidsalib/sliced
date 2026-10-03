export type Role = "pending" | "member" | "admin";

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: Role;
  auto_join: boolean;
  has_card: boolean;
  card_label: string | null;
  can_receive: boolean;
  created_at: string;
};

export type Settings = {
  id: 1;
  crew_name: string;
  days_before_slice: number;
  charge_time: string; // "HH:MM:SS"
  timezone: string;
  invite_code: string;
  updated_at: string;
};

export type RequestStatus = "open" | "slicing" | "sliced" | "canceled";

export type SpendRequest = {
  id: string;
  payer_id: string;
  amount_cents: number;
  note: string | null;
  payer_eats: boolean;
  status: RequestStatus;
  slice_at: string;
  sliced_at: string | null;
  created_at: string;
};

export type ParticipantStatus = "in" | "charging" | "paid" | "failed" | "covered";

export type Participant = {
  request_id: string;
  user_id: string;
  kind: "payer" | "subscriber" | "once";
  share_cents: number | null;
  charge_cents: number | null;
  status: ParticipantStatus;
  payment_intent_id: string | null;
  failure: string | null;
  joined_at: string;
};

export type Billing = {
  user_id: string;
  stripe_customer_id: string | null;
  payment_method_id: string | null;
  stripe_account_id: string | null;
};

export type Neighbor = {
  id: string;
  first_name: string;
  last_name: string | null;
  created_by: string | null;
  created_at: string;
  last_seen_at: string;
};

export type NeighborHit = Pick<Neighbor, "id" | "first_name" | "last_name" | "last_seen_at"> & { mentions: number };

export type WeeklyPost = {
  id: string;
  week_of: string; // YYYY-MM-DD
  title: string | null;
  gospel_reference: string;
  gospel_text: string;
  message: string;
  hope_question: string;
  friendship_question: string;
  published: boolean;
  published_at: string | null;
  emailed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type QuestionKind = "hope" | "friendship";

export type Answer = {
  id: string;
  post_id: string;
  question: QuestionKind;
  neighbor_id: string | null;
  answer: string;
  recorded_by: string | null;
  created_at: string;
};

export type Prayer = {
  id: string;
  neighbor_id: string | null;
  anonymous: boolean;
  request: string;
  submitted_by: string | null;
  created_at: string;
};
