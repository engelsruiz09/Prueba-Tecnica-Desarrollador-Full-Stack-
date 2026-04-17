// ── Enums que espeja los del backend ──────────────────────────────────────────
export type UserRole = "sender" | "receiver";
export type TransactionType = "send" | "request";
export type TransactionStatus = "pending" | "confirmed" | "cancelled";

// ── Entidades ─────────────────────────────────────────────────────────────────
export interface User {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  linked_user_id: number | null;
  created_at: string;
}

export interface Transaction {
  id: number;
  sender_id: number;
  receiver_id: number;
  type: TransactionType;
  status: TransactionStatus;
  amount_usd: string;   // Decimal viene como string desde FastAPI
  amount_gtq: string;
  exchange_rate: string;
  rate_date: string;
  note: string | null;
  created_at: string;
  sender: User;
  receiver: User;
}

export interface PaginatedTransactions {
  items: Transaction[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
  linked_email?: string;
}

// ── Exchange ──────────────────────────────────────────────────────────────────
export interface ExchangeRateResult {
  rate: string;
  rate_date: string;
  amount_usd: string;
  amount_gtq: string;
}