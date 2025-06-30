import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';
import fetch from 'node-fetch';

// 🔧 Supabase setup
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// 🔍 Headers to mimic a browser and avoid HTML fallback
const headers = {
  'Accept': 'application/json',
  'User-Agent': 'Mozilla/5.0 (FixyBot/1.0)'
};

// 🔍 Search for guides using keyword
async function searchGuides(keyword, offset = 0, limit = 50) {
  const url = `https://www.ifixit.com/api/2.0/search/${encodeURIComponent(keyword)}?limit=${limit}&offset=${offset}`;
  const response = await fetch(url, { headers });
  const data = await response.json();
  return data;
}

// 🔍 Fetch full guide data
async function getGuideDetails(guideId) {
  const url = `https://www.ifixit.com/api/2.0/guides/${guideId}`;
  const response = await fetch(url, { headers });
  const data = await response.json();
  return data;
}

// 🚀 Main population function
async function populateMultipleGuidesForDevice(deviceName) {
  console.log(`🔍 Searching for guides for: ${deviceName}`);

  let allGuides = [];
  let offset = 0;
  const limit = 50;

  while (true) {
    const data = await searchGuides(deviceName, offset, limit);
    const repairGuides = data.results.filter(r => r.dataType === 'guide');
    allGuides = allGuides.concat(repairGuides);

    if (!data.moreResults) break;
    offset += limit;
  }

  console.log(`🔢 Found ${allGuides.length} total guides.`);

  for (let i = 0; i < allGuides.length; i++) {
    const guideSummary = allGuides[i];
    const guideDetails = await getGuideDetails(guideSummary.guideid);

    const existsCheck = await supabase
      .from('Repair_Guides')
      .select('id')
      .eq('ifixit_guide_id', guideDetails.guideid);

    if (existsCheck.data.length > 0) {
      console.log(`⚠️ Guide "${guideDetails.title}" already exists. Skipping.`);
      continue;
    }

    const {
      title,
      summary,
      introduction,
      introduction_rendered,
      conclusion,
      conclusion_rendered,
      time_required,
      difficulty,
      steps,
      guideid,
      image,
      user
    } = guideDetails;

    const { data: insertedGuide, error: guideInsertError } = await supabase
      .from('Repair_Guides')
      .insert([
        {
          title,
          category: 'Tools',
          steps_count: steps.length,
          device_name: deviceName,
          summary,
          introduction,
          introduction_rendered,
          conclusion,
          conclusion_rendered,
          time_required,
          difficulty,
          ifixit_guide_id: guideid,
          image_url: image?.standard || '',
          cover_image_url: image?.standard || '',
          source_url: `https://www.ifixit.com/Guide/${title.replace(/\s/g, '+')}/${guideid}`,
          author_username: user?.username || '',
          is_public: true
        }
      ])
      .select();

    if (guideInsertError) {
      console.error(`❌ Failed to insert guide "${title}":`, guideInsertError.message);
      continue;
    }

    const guide_id = insertedGuide[0].id;
    console.log(`✅ Inserted guide: ${title} (ID: ${guide_id})`);

  for (let j = 0; j < steps.length; j++) {
  const step = steps[j];
  const imageUrl = step.media?.data?.[0]?.standard || '';

  // Skip step only if both text and image are missing
  if (!step.text_rendered?.trim() && !imageUrl) {
    console.warn(`⏭️ Skipping empty step ${j + 1} for guide ${guideid}`);
    continue;
  }

  const { error: stepError } = await supabase.from('Repair_Steps').insert([{
    guide_id,
    step_number: step.order,
    instruction: step.text_rendered || '',
    image_url: imageUrl,
    title: step.title || '',
    title_rendered: step.title || '',
    text_raw: step.text_raw || '',
    text_rendered: step.text_rendered || '',
    ifixit_step_id: step.id,
    media_type: step.media?.type || 'image'
  }]);

  if (stepError) {
    console.warn(`⚠️ Step ${j + 1} failed for guide ${guideid}:`, stepError.message);
  }
}


    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  console.log(`🎉 Finished populating guides for ${deviceName}`);
}

// 🔁 Run the script for your category
populateMultipleGuidesForDevice('Hand Tool and Equipment');
