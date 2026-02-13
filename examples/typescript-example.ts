/**
 * TypeScript Example
 * 
 * Demonstrates TypeScript support with type checking and IntelliSense.
 * This file is for reference only and is not meant to be executed directly.
 */

import transformer, { TransformerOptions, TransformFunction } from 'node-es-transformer';

// Example 1: Basic usage with type checking
const options: TransformerOptions = {
  fileName: 'data/sample.json',
  targetIndexName: 'my-index',
  mappings: {
    properties: {
      '@timestamp': {
        type: 'date'
      },
      'name': {
        type: 'keyword'
      },
      'value': {
        type: 'integer'
      }
    }
  }
};

transformer(options).then(result => {
  // Events are typed
  result.events.on('complete', () => {
    console.log('Ingestion complete!');
  });
});

// Example 2: Transform function with type safety
interface SourceDoc {
  first_name: string;
  last_name: string;
  age: number;
}

interface TargetDoc {
  full_name: string;
  age: number;
  age_group: string;
}

const myTransform: TransformFunction = (doc: SourceDoc): TargetDoc => {
  return {
    full_name: `${doc.first_name} ${doc.last_name}`,
    age: doc.age,
    age_group: doc.age < 18 ? 'minor' : 'adult'
  };
};

transformer({
  sourceIndexName: 'users-v1',
  targetIndexName: 'users-v2',
  transform: myTransform
});

// Example 3: Document splitting with types
interface Tweet {
  id: string;
  text: string;
  user: string;
  hashtags: string[];
  created_at: string;
}

interface HashtagDoc {
  tweet_id: string;
  hashtag: string;
  text: string;
  user: string;
  '@timestamp': string;
}

const splitTransform: TransformFunction = (tweet: Tweet): HashtagDoc[] | null => {
  if (!tweet.hashtags || tweet.hashtags.length === 0) {
    return null;
  }
  
  return tweet.hashtags.map(hashtag => ({
    tweet_id: tweet.id,
    hashtag: hashtag,
    text: tweet.text,
    user: tweet.user,
    '@timestamp': tweet.created_at
  }));
};

transformer({
  sourceIndexName: 'tweets',
  targetIndexName: 'hashtags',
  transform: splitTransform
});

// Example 4: Cross-version reindex with type safety
const crossVersionOptions: TransformerOptions = {
  sourceClientConfig: {
    node: 'https://es8-cluster.example.com:9200',
    auth: {
      apiKey: process.env.ES8_API_KEY
    }
  },
  targetClientConfig: {
    node: 'https://es9-cluster.example.com:9200',
    auth: {
      apiKey: process.env.ES9_API_KEY
    }
  },
  sourceClientVersion: 8,
  targetClientVersion: 9,
  sourceIndexName: 'my-index',
  targetIndexName: 'my-index'
};

transformer(crossVersionOptions);

// Example 5: All options with full type checking
const fullOptions: TransformerOptions = {
  targetIndexName: 'complete-example',
  deleteIndex: true,
  sourceClientConfig: {
    node: 'http://localhost:9200'
  },
  targetClientConfig: {
    node: 'http://localhost:9200'
  },
  bufferSize: 5120,
  searchSize: 100,
  fileName: 'data/*.json',
  splitRegex: /\n/,
  mappings: {
    properties: {
      'id': { type: 'keyword' },
      'value': { type: 'float' }
    }
  },
  indexMappingTotalFieldsLimit: 2000,
  populatedFields: false,
  query: {
    term: {
      status: 'active'
    }
  },
  skipHeader: false,
  verbose: true,
  transform: (doc: any) => ({
    ...doc,
    processed_at: new Date().toISOString()
  })
};

transformer(fullOptions);
