/**
 * Data contracts matching vote_server Rust backend (Rocket :8001)
 */

export interface ChoiceResponse {
  uuid: string;
  name: string;
  poll_uuid: string;
}

export interface PollDetailsResponse {
  uuid: string;
  name: string;
  start_date: string;
  close_date: string;
  status: 'open' | 'closed' | string;
  choices: ChoiceResponse[];
}

export interface VoteCreationPayload {
  signature: string;
  choice_uuid: string;
}

export interface PollResultsResponse {
  status: 'open' | 'closed' | string;
  winning_choice: string | null;
  vote_distribution: Record<string, number>;
}

export interface VoteResponse {
  uuid: string;
  signature: string;
  choice_uuid: string;
  poll_uuid: string;
  timestamp: string;
}

export interface VoteHistoryItem {
  uuid: string;
  signature: string;
  choice_uuid: string;
  poll_uuid: string;
  timestamp: string;
  poll_status: 'open' | 'closed' | string;
  is_winning_choice: boolean | null;
}
