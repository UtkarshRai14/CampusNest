ALTER TABLE users
  ADD COLUMN IF NOT EXISTS share_email BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS share_whatsapp BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS password_reset_token_hash VARCHAR,
  ADD COLUMN IF NOT EXISTS password_reset_expires_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS hidden_conversations (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  listing_id INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  other_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hidden_at TIMESTAMP NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc'),
  PRIMARY KEY (user_id, listing_id, other_user_id),
  CHECK (user_id <> other_user_id)
);

CREATE INDEX IF NOT EXISTS idx_listings_active_browse_created
  ON listings (created_at DESC, id DESC)
  WHERE is_active = TRUE AND availability_status = 'available';
CREATE INDEX IF NOT EXISTS idx_listings_active_price
  ON listings (price ASC, id ASC)
  WHERE is_active = TRUE AND availability_status = 'available';
CREATE INDEX IF NOT EXISTS idx_messages_conversation_sender
  ON messages (listing_id, sender_id, receiver_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_receiver
  ON messages (listing_id, receiver_id, sender_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_messages_unread_receiver
  ON messages (receiver_id, created_at DESC, id DESC)
  WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_chat_history_user_recent
  ON chat_history (user_id, id DESC);
