-- Create sticker_interactions table for in-app sticker notifications
CREATE TABLE IF NOT EXISTS sticker_interactions (
  sticker_id SERIAL PRIMARY KEY,
  sender_user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  recipient_user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  sticker_type VARCHAR(20) NOT NULL CHECK (sticker_type IN ('cheer', 'fire', 'coffee', 'congrats')),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  group_id INTEGER REFERENCES groups(group_id) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX idx_sticker_recipient_unread ON sticker_interactions(recipient_user_id, is_read, created_at DESC);
CREATE INDEX idx_sticker_group ON sticker_interactions(group_id, created_at DESC);
CREATE INDEX idx_sticker_sender ON sticker_interactions(sender_user_id, created_at DESC);

-- Add comment
COMMENT ON TABLE sticker_interactions IS 'Stores in-app sticker interactions between users for encouragement and social engagement';
