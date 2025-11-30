/*
  # Add History Stories to Stories Table

  This migration adds predefined stories about:
  - Ancient US History (Native American Civilizations, Early American Settlers)
  - Ancient India History (Indus Valley Civilization, Ancient Indian Kingdoms)

  Stories are inserted with their metadata and panel data as JSONB.
*/

-- First, ensure the stories table exists with the correct schema
-- Note: id is text to match mock data IDs like "photosynthesis-adventure"
CREATE TABLE IF NOT EXISTS stories (
  id text PRIMARY KEY,
  title text NOT NULL,
  cover_url text,
  topic_tag text,
  reading_level text,
  estimated_time text,
  summary text,
  panels jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- If the table exists with uuid id, we need to change it to text
-- This handles the case where the table was created with uuid but we need text IDs
DO $$
DECLARE
  constraint_record RECORD;
BEGIN
  -- Check if id column exists and is uuid type, change it to text
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stories' AND column_name = 'id' AND data_type = 'uuid'
  ) THEN
    -- Drop ALL foreign key constraints that reference stories.id
    -- Find all constraints that reference stories.id
    FOR constraint_record IN
      SELECT 
        tc.table_name,
        tc.constraint_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_name = 'stories'
        AND ccu.column_name = 'id'
    LOOP
      EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', 
        constraint_record.table_name, 
        constraint_record.constraint_name);
    END LOOP;
    
    -- Change id from uuid to text
    -- If there are existing UUIDs, convert them to their text representation
    ALTER TABLE stories ALTER COLUMN id TYPE text USING id::text;
    
    -- Recreate foreign key constraints for tables that reference stories.id
    -- story_progress table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'story_progress') THEN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'story_progress' AND column_name = 'story_id'
      ) THEN
        -- Also convert story_id column to text if it's uuid
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'story_progress' 
            AND column_name = 'story_id' 
            AND data_type = 'uuid'
        ) THEN
          ALTER TABLE story_progress ALTER COLUMN story_id TYPE text USING story_id::text;
        END IF;
        
        ALTER TABLE story_progress 
        ADD CONSTRAINT story_progress_story_id_fkey 
        FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE;
      END IF;
    END IF;
    
    -- story_media table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'story_media') THEN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'story_media' AND column_name = 'story_id'
      ) THEN
        -- Also convert story_id column to text if it's uuid
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'story_media' 
            AND column_name = 'story_id' 
            AND data_type = 'uuid'
        ) THEN
          ALTER TABLE story_media ALTER COLUMN story_id TYPE text USING story_id::text;
        END IF;
        
        ALTER TABLE story_media 
        ADD CONSTRAINT story_media_story_id_fkey 
        FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE;
      END IF;
    END IF;
  END IF;
END $$;

-- Add missing columns if they don't exist (for existing tables)
DO $$
BEGIN
  -- Add cover_url if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stories' AND column_name = 'cover_url'
  ) THEN
    ALTER TABLE stories ADD COLUMN cover_url text;
  END IF;

  -- Add topic_tag if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stories' AND column_name = 'topic_tag'
  ) THEN
    ALTER TABLE stories ADD COLUMN topic_tag text;
  END IF;

  -- Add reading_level if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stories' AND column_name = 'reading_level'
  ) THEN
    ALTER TABLE stories ADD COLUMN reading_level text;
  END IF;

  -- Add estimated_time if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stories' AND column_name = 'estimated_time'
  ) THEN
    ALTER TABLE stories ADD COLUMN estimated_time text;
  END IF;

  -- Add summary if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stories' AND column_name = 'summary'
  ) THEN
    ALTER TABLE stories ADD COLUMN summary text;
  END IF;

  -- Add panels if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stories' AND column_name = 'panels'
  ) THEN
    ALTER TABLE stories ADD COLUMN panels jsonb;
  END IF;

  -- Add created_at if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stories' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE stories ADD COLUMN created_at timestamptz DEFAULT now();
  END IF;

  -- Add updated_at if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stories' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE stories ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Insert Native American Civilizations story
-- Note: enabled column may not exist in all database setups, so we'll handle it conditionally
INSERT INTO stories (id, title, cover_url, topic_tag, reading_level, estimated_time, summary, panels, created_at, updated_at)
VALUES (
  'native-american-civilizations',
  'Native American Civilizations',
  '/images/chlorophotosynthesis.png',
  'US History',
  'Ages 8-11',
  '10 min',
  'Discover the amazing civilizations of Native Americans who lived in North America thousands of years before European settlers arrived!',
  '[
    {
      "panelId": "panel-01",
      "imageUrl": "/images/chlorophotosynthesis.png",
      "narration": "Long ago, before cities and cars, Native American tribes built incredible civilizations across North America. They lived in harmony with nature and created amazing art, tools, and stories. Guide: \"Welcome to ancient America!\" Child: \"Wow, this is so long ago!\"",
      "glossaryTerms": ["civilization", "tribe", "Native American"],
      "chatTopicId": "native-american-history",
      "ctaLabel": "Learn about Native American tribes"
    },
    {
      "panelId": "panel-02",
      "imageUrl": "/images/chlorophotosynthesis.png",
      "narration": "The Anasazi people built amazing cliff dwellings in the Southwest. They carved homes into mountainsides and created beautiful pottery! Guide: \"Look at these incredible homes!\" Child: \"They lived in cliffs? That''s amazing!\"",
      "glossaryTerms": ["Anasazi", "cliff dwelling", "pottery"],
      "chatTopicId": "native-american-history",
      "ctaLabel": "How did they build cliff dwellings?"
    },
    {
      "panelId": "panel-03",
      "imageUrl": "/images/chlorophotosynthesis.png",
      "narration": "The Iroquois Confederacy created one of the first democracies in America! Five tribes worked together to make decisions and keep peace. Guide: \"They had their own government!\" Child: \"Like our country today?\"",
      "glossaryTerms": ["Iroquois", "confederacy", "democracy"],
      "chatTopicId": "native-american-history",
      "ctaLabel": "What is a confederacy?"
    },
    {
      "panelId": "panel-04",
      "imageUrl": "/images/chlorophotosynthesis.png",
      "narration": "Native Americans were expert farmers! They grew corn, beans, and squash together—called the \"Three Sisters.\" These plants helped each other grow! Guide: \"Smart farming!\" Child: \"Plants can help each other?\"",
      "glossaryTerms": ["Three Sisters", "corn", "farming"],
      "chatTopicId": "native-american-history",
      "ctaLabel": "How do the Three Sisters work together?"
    },
    {
      "panelId": "panel-05",
      "imageUrl": "/images/chlorophotosynthesis.png",
      "narration": "They created beautiful art, stories, and ceremonies that celebrated nature and their connection to the land. Their wisdom and traditions are still honored today! Guide: \"Their culture is rich and beautiful!\" Child: \"I want to learn more!\"",
      "glossaryTerms": ["ceremony", "tradition", "culture"],
      "chatTopicId": "native-american-history",
      "ctaLabel": "What are Native American traditions?"
    }
  ]'::jsonb,
  now(),
  now()
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  cover_url = EXCLUDED.cover_url,
  topic_tag = EXCLUDED.topic_tag,
  reading_level = EXCLUDED.reading_level,
  estimated_time = EXCLUDED.estimated_time,
  summary = EXCLUDED.summary,
  panels = EXCLUDED.panels,
  updated_at = now();

-- Insert Early American Settlers story
INSERT INTO stories (id, title, cover_url, topic_tag, reading_level, estimated_time, summary, panels, created_at, updated_at)
VALUES (
  'early-american-settlers',
  'Early American Settlers',
  '/images/chlorophotosynthesis.png',
  'US History',
  'Ages 8-11',
  '9 min',
  'Journey back to the 1600s and discover how the first European settlers built new lives in America!',
  '[
    {
      "panelId": "panel-01",
      "imageUrl": "/images/chlorophotosynthesis.png",
      "narration": "In 1620, brave families sailed across the ocean on the Mayflower to start a new life in America. They were called Pilgrims and wanted freedom to practice their religion. Guide: \"A long and dangerous journey!\" Child: \"They sailed for months?\"",
      "glossaryTerms": ["Pilgrims", "Mayflower", "settler"],
      "chatTopicId": "us-history",
      "ctaLabel": "Why did the Pilgrims come to America?"
    },
    {
      "panelId": "panel-02",
      "imageUrl": "/images/chlorophotosynthesis.png",
      "narration": "When they arrived, they met Native Americans who helped them learn to grow food and survive the harsh winters. Together, they celebrated the first Thanksgiving! Guide: \"Friendship and cooperation!\" Child: \"That''s where Thanksgiving comes from!\"",
      "glossaryTerms": ["Thanksgiving", "cooperation", "survival"],
      "chatTopicId": "us-history",
      "ctaLabel": "What was the first Thanksgiving like?"
    },
    {
      "panelId": "panel-03",
      "imageUrl": "/images/chlorophotosynthesis.png",
      "narration": "The settlers built homes, schools, and communities. They worked hard to create a new society based on freedom and self-government. Guide: \"Building a new nation!\" Child: \"They were so brave!\"",
      "glossaryTerms": ["community", "self-government", "freedom"],
      "chatTopicId": "us-history",
      "ctaLabel": "How did they build their communities?"
    },
    {
      "panelId": "panel-04",
      "imageUrl": "/images/chlorophotosynthesis.png",
      "narration": "Life was tough! They had to grow their own food, make their own clothes, and build everything by hand. But they were determined and creative! Guide: \"Hard work and determination!\" Child: \"They were so resourceful!\"",
      "glossaryTerms": ["resourceful", "determination", "self-sufficient"],
      "chatTopicId": "us-history",
      "ctaLabel": "How did they make everything themselves?"
    }
  ]'::jsonb,
  now(),
  now()
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  cover_url = EXCLUDED.cover_url,
  topic_tag = EXCLUDED.topic_tag,
  reading_level = EXCLUDED.reading_level,
  estimated_time = EXCLUDED.estimated_time,
  summary = EXCLUDED.summary,
  panels = EXCLUDED.panels,
  updated_at = now();

-- Insert Indus Valley Civilization story
INSERT INTO stories (id, title, cover_url, topic_tag, reading_level, estimated_time, summary, panels, created_at, updated_at)
VALUES (
  'indus-valley-civilization',
  'The Indus Valley Civilization',
  '/images/chlorophotosynthesis.png',
  'India History',
  'Ages 8-11',
  '10 min',
  'Explore one of the world''s oldest and most advanced ancient civilizations that thrived in India over 4,000 years ago!',
  '[
    {
      "panelId": "panel-01",
      "imageUrl": "/images/chlorophotosynthesis.png",
      "narration": "Over 4,000 years ago, a brilliant civilization flourished along the Indus River in ancient India. They built amazing cities with streets, houses, and even bathrooms! Guide: \"Welcome to ancient India!\" Child: \"They had bathrooms back then?\"",
      "glossaryTerms": ["Indus Valley", "civilization", "ancient"],
      "chatTopicId": "india-history",
      "ctaLabel": "Learn about the Indus Valley"
    },
    {
      "panelId": "panel-02",
      "imageUrl": "/images/chlorophotosynthesis.png",
      "narration": "Their cities were incredibly well-planned! Streets were laid out in a grid pattern, and they had advanced drainage systems to keep cities clean. Guide: \"Amazing city planning!\" Child: \"They were so smart!\"",
      "glossaryTerms": ["grid pattern", "drainage", "city planning"],
      "chatTopicId": "india-history",
      "ctaLabel": "How did they plan their cities?"
    },
    {
      "panelId": "panel-03",
      "imageUrl": "/images/chlorophotosynthesis.png",
      "narration": "They were expert traders! They made beautiful jewelry, pottery, and seals that they traded with people far away. Their writing system is still being decoded by scientists today! Guide: \"Mysterious writing!\" Child: \"Can we read it?\"",
      "glossaryTerms": ["trade", "seals", "writing system"],
      "chatTopicId": "india-history",
      "ctaLabel": "What did they trade?"
    },
    {
      "panelId": "panel-04",
      "imageUrl": "/images/chlorophotosynthesis.png",
      "narration": "They were skilled farmers who grew wheat, barley, and cotton. They also raised animals and created beautiful art! Guide: \"Farming and creativity!\" Child: \"They did so many things!\"",
      "glossaryTerms": ["farming", "cotton", "agriculture"],
      "chatTopicId": "india-history",
      "ctaLabel": "What crops did they grow?"
    },
    {
      "panelId": "panel-05",
      "imageUrl": "/images/chlorophotosynthesis.png",
      "narration": "The Indus Valley Civilization shows us how advanced ancient people were! Their achievements in city planning, trade, and culture inspire us even today. Guide: \"A legacy of innovation!\" Child: \"I want to learn more!\"",
      "glossaryTerms": ["legacy", "innovation", "achievement"],
      "chatTopicId": "india-history",
      "ctaLabel": "What happened to this civilization?"
    }
  ]'::jsonb,
  now(),
  now()
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  cover_url = EXCLUDED.cover_url,
  topic_tag = EXCLUDED.topic_tag,
  reading_level = EXCLUDED.reading_level,
  estimated_time = EXCLUDED.estimated_time,
  summary = EXCLUDED.summary,
  panels = EXCLUDED.panels,
  updated_at = now();

-- Insert Ancient Indian Kingdoms story
INSERT INTO stories (id, title, cover_url, topic_tag, reading_level, estimated_time, summary, panels, created_at, updated_at)
VALUES (
  'ancient-indian-kingdoms',
  'Ancient Indian Kingdoms',
  '/images/chlorophotosynthesis.png',
  'India History',
  'Ages 8-11',
  '11 min',
  'Discover the magnificent kingdoms of ancient India with their grand palaces, wise rulers, and rich culture!',
  '[
    {
      "panelId": "panel-01",
      "imageUrl": "/images/chlorophotosynthesis.png",
      "narration": "Ancient India was home to powerful kingdoms ruled by wise kings and queens. They built magnificent palaces, temples, and cities that still amaze us today! Guide: \"Welcome to ancient kingdoms!\" Child: \"Like in fairy tales?\"",
      "glossaryTerms": ["kingdom", "palace", "ancient India"],
      "chatTopicId": "india-history",
      "ctaLabel": "Learn about ancient Indian kingdoms"
    },
    {
      "panelId": "panel-02",
      "imageUrl": "/images/chlorophotosynthesis.png",
      "narration": "The Mauryan Empire was one of the largest and most powerful! Emperor Ashoka was known for his wisdom and kindness. He spread messages of peace carved on stone pillars. Guide: \"A wise and kind ruler!\" Child: \"He wrote on stones?\"",
      "glossaryTerms": ["Mauryan Empire", "Emperor Ashoka", "pillar"],
      "chatTopicId": "india-history",
      "ctaLabel": "Who was Emperor Ashoka?"
    },
    {
      "panelId": "panel-03",
      "imageUrl": "/images/chlorophotosynthesis.png",
      "narration": "Ancient Indian kingdoms were centers of learning! They built universities where students from all over the world came to study mathematics, science, medicine, and philosophy. Guide: \"Great centers of knowledge!\" Child: \"People traveled to learn?\"",
      "glossaryTerms": ["university", "mathematics", "philosophy"],
      "chatTopicId": "india-history",
      "ctaLabel": "What did they teach in ancient universities?"
    },
    {
      "panelId": "panel-04",
      "imageUrl": "/images/chlorophotosynthesis.png",
      "narration": "They created beautiful art, music, and dance! Ancient Indian culture included amazing temples with intricate carvings, classical music, and dance forms that are still performed today! Guide: \"Rich and beautiful culture!\" Child: \"I want to see the temples!\"",
      "glossaryTerms": ["temple", "classical music", "culture"],
      "chatTopicId": "india-history",
      "ctaLabel": "What are ancient Indian temples like?"
    },
    {
      "panelId": "panel-05",
      "imageUrl": "/images/chlorophotosynthesis.png",
      "narration": "Ancient Indian kingdoms made incredible contributions to the world! They invented the number zero, created the decimal system, and wrote amazing stories and poems that are still loved today! Guide: \"So many contributions!\" Child: \"They invented zero?\"",
      "glossaryTerms": ["zero", "decimal system", "contribution"],
      "chatTopicId": "india-history",
      "ctaLabel": "How did they invent zero?"
    },
    {
      "panelId": "panel-06",
      "imageUrl": "/images/chlorophotosynthesis.png",
      "narration": "The legacy of ancient Indian kingdoms lives on! Their achievements in science, art, and culture continue to inspire people around the world even today. Guide: \"A lasting legacy!\" Child: \"I want to learn more about India!\"",
      "glossaryTerms": ["legacy", "achievement", "inspiration"],
      "chatTopicId": "india-history",
      "ctaLabel": "What else did ancient India contribute?"
    }
  ]'::jsonb,
  now(),
  now()
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  cover_url = EXCLUDED.cover_url,
  topic_tag = EXCLUDED.topic_tag,
  reading_level = EXCLUDED.reading_level,
  estimated_time = EXCLUDED.estimated_time,
  summary = EXCLUDED.summary,
  panels = EXCLUDED.panels,
  updated_at = now();

