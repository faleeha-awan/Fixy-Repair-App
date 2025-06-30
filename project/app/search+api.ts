export async function POST(request: Request) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    const { query, sources = ['all'] } = await request.json();

    if (!query || query.trim().length < 2) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Query must be at least 2 characters long'
      }), { status: 400, headers });
    }

    console.log(`🔍 Searching for: "${query}" from sources: ${sources.join(', ')}`);

    // Initialize Supabase
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Check for cached results first (within last 24 hours)
    const { data: cachedResults } = await supabase
      .from('web_search_results')
      .select('*')
      .eq('query', query.toLowerCase().trim())
      .gt('cached_until', new Date().toISOString())
      .order('relevance_score', { ascending: false });

    if (cachedResults && cachedResults.length > 0) {
      console.log(`✅ Found ${cachedResults.length} cached results`);
      
      // Filter by source if specified
      const filteredResults = sources.includes('all') 
        ? cachedResults 
        : cachedResults.filter(result => sources.includes(result.source_name.toLowerCase()));

      return new Response(JSON.stringify({
        success: true,
        results: filteredResults,
        cached: true,
        total: filteredResults.length
      }), { headers });
    }

    // No cached results, perform fresh search
    console.log('🌐 Performing fresh search...');
    const searchResults: any[] = [];

    // Search iFixit
    if (sources.includes('all') || sources.includes('ifixit')) {
      try {
        console.log('🔧 Searching iFixit...');
        const ifixitResults = await searchIFixit(query);
        searchResults.push(...ifixitResults);
        console.log(`✅ Found ${ifixitResults.length} iFixit results`);
      } catch (error) {
        console.error('❌ iFixit search failed:', error);
      }
    }

    // Search Reddit r/ifixit
    if (sources.includes('all') || sources.includes('reddit')) {
      try {
        console.log('🔍 Searching Reddit r/ifixit...');
        const redditResults = await searchReddit(query);
        searchResults.push(...redditResults);
        console.log(`✅ Found ${redditResults.length} Reddit results`);
      } catch (error) {
        console.error('❌ Reddit search failed:', error);
      }
    }

    // Search YouTube (mock results for now)
    if (sources.includes('all') || sources.includes('youtube')) {
      try {
        console.log('📺 Searching YouTube...');
        const youtubeResults = await searchYouTube(query);
        searchResults.push(...youtubeResults);
        console.log(`✅ Found ${youtubeResults.length} YouTube results`);
      } catch (error) {
        console.error('❌ YouTube search failed:', error);
      }
    }

    // Add fallback results if no results found
    if (searchResults.length === 0) {
      console.log('⚠️ No results from external sources, adding fallback results');
      searchResults.push(...getFallbackResults(query));
    }

    // Calculate relevance scores and sort
    const scoredResults = searchResults.map(result => ({
      ...result,
      relevance_score: calculateRelevanceScore(result.title, query)
    })).sort((a, b) => b.relevance_score - a.relevance_score);

    console.log(`📊 Final results: ${scoredResults.length} total`);

    // Cache results in database
    if (scoredResults.length > 0) {
      try {
        const cacheData = scoredResults.map(result => ({
          query: query.toLowerCase().trim(),
          title: result.title,
          source_url: result.source_url,
          image_url: result.image_url,
          source_name: result.source_name,
          description: result.description,
          relevance_score: result.relevance_score,
          cached_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
        }));

        await supabase
          .from('web_search_results')
          .insert(cacheData);

        console.log(`💾 Cached ${scoredResults.length} results`);
      } catch (cacheError) {
        console.error('❌ Failed to cache results:', cacheError);
        // Don't fail the request if caching fails
      }
    }

    return new Response(JSON.stringify({
      success: true,
      results: scoredResults,
      cached: false,
      total: scoredResults.length
    }), { headers });

  } catch (error) {
    console.error('❌ Search failed:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Search failed'
    }), { status: 500, headers });
  }
}

async function searchIFixit(query: string) {
  const results: any[] = [];
  
  try {
    // Try multiple iFixit endpoints
    const endpoints = [
      `https://www.ifixit.com/api/2.0/search/${encodeURIComponent(query)}?limit=10`,
      `https://www.ifixit.com/api/2.0/guides?filter=search&query=${encodeURIComponent(query)}&limit=10`
    ];

    for (const endpoint of endpoints) {
      try {
        console.log(`🔧 Trying iFixit endpoint: ${endpoint}`);
        
        const response = await fetch(endpoint, {
          headers: {
            'User-Agent': 'RepairGuideApp/1.0 (Educational Purpose)',
            'Accept': 'application/json',
          },
        });

        if (!response.ok) {
          console.log(`❌ iFixit endpoint failed: ${response.status} ${response.statusText}`);
          continue;
        }

        const data = await response.json();
        console.log(`📊 iFixit response structure:`, Object.keys(data));
        
        // Handle different response structures
        let items = [];
        if (data.results && Array.isArray(data.results)) {
          items = data.results;
        } else if (data.guides && Array.isArray(data.guides)) {
          items = data.guides;
        } else if (Array.isArray(data)) {
          items = data;
        }

        console.log(`📋 Found ${items.length} items from iFixit`);
        
        if (items.length > 0) {
          for (const item of items.slice(0, 8)) { // Limit to 8 results
            if (item.dataType === 'guide' || item.title || item.guideid) {
              const title = item.title || item.display_title || 'Untitled Guide';
              const url = item.url || `/Guide/${item.guideid}` || '';
              const fullUrl = url.startsWith('http') ? url : `https://www.ifixit.com${url}`;
              
              results.push({
                title: title,
                source_url: fullUrl,
                image_url: item.image?.medium || item.image?.standard || item.thumbnail || null,
                source_name: 'iFixit',
                description: item.summary || item.introduction || `${title} repair guide from iFixit`
              });
            }
          }
          break; // If we got results, don't try other endpoints
        }
      } catch (endpointError) {
        console.error(`❌ iFixit endpoint error:`, endpointError);
        continue;
      }
    }

    console.log(`✅ iFixit search completed: ${results.length} results`);
  } catch (error) {
    console.error('❌ iFixit search error:', error);
  }

  return results;
}

async function searchReddit(query: string) {
  const results: any[] = [];
  
  try {
    // Use Reddit's JSON API
    const searchUrl = `https://www.reddit.com/r/ifixit/search.json?q=${encodeURIComponent(query)}&restrict_sr=1&limit=8&sort=relevance`;
    
    console.log(`🔍 Reddit search URL: ${searchUrl}`);
    
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'RepairGuideApp/1.0 (Educational Purpose)',
      },
    });

    if (!response.ok) {
      throw new Error(`Reddit API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`📊 Reddit response structure:`, Object.keys(data));
    
    if (data.data && data.data.children && Array.isArray(data.data.children)) {
      console.log(`📋 Found ${data.data.children.length} Reddit posts`);
      
      for (const post of data.data.children) {
        const postData = post.data;
        
        // Skip removed or deleted posts
        if (postData.removed_by_category || postData.title === '[deleted]' || !postData.title) {
          continue;
        }

        results.push({
          title: postData.title,
          source_url: `https://www.reddit.com${postData.permalink}`,
          image_url: postData.thumbnail && postData.thumbnail.startsWith('http') ? postData.thumbnail : null,
          source_name: 'Reddit',
          description: postData.selftext ? postData.selftext.substring(0, 200) + '...' : `Discussion on r/ifixit about ${postData.title}`
        });
      }
    }

    console.log(`✅ Reddit search completed: ${results.length} results`);
  } catch (error) {
    console.error('❌ Reddit search error:', error);
  }

  return results;
}

async function searchYouTube(query: string) {
  const results: any[] = [];
  
  try {
    // Create realistic YouTube results based on the query
    const searchQuery = `${query} repair guide tutorial`;
    const youtubeSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;
    
    // Generate relevant mock results
    const mockResults = [
      {
        title: `How to Fix ${query} - Complete Repair Guide`,
        source_url: youtubeSearchUrl,
        image_url: 'https://images.pexels.com/photos/1181298/pexels-photo-1181298.jpeg?auto=compress&cs=tinysrgb&w=400',
        source_name: 'YouTube',
        description: `Step-by-step video tutorial for ${query} repair`
      },
      {
        title: `${query} Repair Tutorial - DIY Fix`,
        source_url: youtubeSearchUrl,
        image_url: 'https://images.pexels.com/photos/159298/gears-cogs-machine-machinery-159298.jpeg?auto=compress&cs=tinysrgb&w=400',
        source_name: 'YouTube',
        description: `Professional repair guide for ${query}`
      }
    ];

    results.push(...mockResults);
    console.log(`✅ YouTube search completed: ${results.length} results`);
  } catch (error) {
    console.error('❌ YouTube search error:', error);
  }

  return results;
}

function getFallbackResults(query: string): any[] {
  // Provide fallback results when external APIs fail
  return [
    {
      title: `${query} Repair Guide - iFixit Community`,
      source_url: `https://www.ifixit.com/Search?query=${encodeURIComponent(query)}`,
      image_url: 'https://images.pexels.com/photos/159298/gears-cogs-machine-machinery-159298.jpeg?auto=compress&cs=tinysrgb&w=400',
      source_name: 'iFixit',
      description: `Search results for ${query} on iFixit`
    },
    {
      title: `${query} Repair Discussion - Reddit`,
      source_url: `https://www.reddit.com/r/ifixit/search/?q=${encodeURIComponent(query)}&restrict_sr=1`,
      image_url: 'https://images.pexels.com/photos/1181298/pexels-photo-1181298.jpeg?auto=compress&cs=tinysrgb&w=400',
      source_name: 'Reddit',
      description: `Community discussions about ${query} repair`
    },
    {
      title: `${query} Repair Videos - YouTube`,
      source_url: `https://www.youtube.com/results?search_query=${encodeURIComponent(query + ' repair')}`,
      image_url: 'https://images.pexels.com/photos/257736/pexels-photo-257736.jpeg?auto=compress&cs=tinysrgb&w=400',
      source_name: 'YouTube',
      description: `Video tutorials for ${query} repair`
    }
  ];
}

function calculateRelevanceScore(title: string, query: string): number {
  const titleLower = title.toLowerCase();
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(' ').filter(word => word.length > 1);
  
  let score = 0;
  
  // Exact match bonus
  if (titleLower.includes(queryLower)) {
    score += 100;
  }
  
  // Word match scoring
  for (const word of queryWords) {
    if (titleLower.includes(word)) {
      score += 20;
    }
  }
  
  // Title length penalty (prefer concise titles)
  score -= Math.floor(title.length / 20);
  
  return Math.max(10, score); // Minimum score of 10
}

export async function OPTIONS(request: Request) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}