/*
  # Web Search Results Table

  This migration creates a table to cache search results from external sources.
  
  1. New Table
    - `web_search_results` - Cache for external search results
    
  2. Security
    - Enable RLS on the table
    - Add policies for authenticated users
    
  3. Indexes
    - Add indexes for better search performance
*/

-- Create Web Search Results table for caching external search results
CREATE TABLE IF NOT EXISTS web_search_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  query text NOT NULL,
  title text NOT NULL,
  source_url text NOT NULL,
  image_url text,
  source_name text NOT NULL,
  description text,
  relevance_score integer DEFAULT 0,
  cached_until timestamptz DEFAULT (now() + interval '24 hours')
);

-- Create User Search History table
CREATE TABLE IF NOT EXISTS user_search_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  query text NOT NULL,
  results_count integer DEFAULT 0
);

-- Enable RLS on both tables
ALTER TABLE web_search_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_search_history ENABLE ROW LEVEL SECURITY;

-- Create policies for web_search_results (public read, authenticated write)
CREATE POLICY "Search results are viewable by everyone"
  ON web_search_results
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Search results are manageable by authenticated users"
  ON web_search_results
  FOR ALL
  TO authenticated
  USING (true);

-- Create policies for user_search_history (users can only see their own history)
CREATE POLICY "Users can view their own search history"
  ON user_search_history
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own search history"
  ON user_search_history
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_web_search_results_query ON web_search_results(query);
CREATE INDEX IF NOT EXISTS idx_web_search_results_source ON web_search_results(source_name);
CREATE INDEX IF NOT EXISTS idx_web_search_results_cached_until ON web_search_results(cached_until);
CREATE INDEX IF NOT EXISTS idx_user_search_history_user_id ON user_search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_user_search_history_created_at ON user_search_history(created_at DESC);

-- Add comment for documentation
COMMENT ON TABLE web_search_results IS 'Cached search results from external repair guide sources';
COMMENT ON TABLE user_search_history IS 'User search history for repair guides';